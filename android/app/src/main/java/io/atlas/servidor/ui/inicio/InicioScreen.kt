package io.atlas.servidor.ui.inicio

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.MargemTipoDto
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.OfertasResponse
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.components.StaleBanner
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.shell.HomeViewModel
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeDark
import kotlinx.coroutines.delay
import java.util.Calendar

private data class Banner(val tag: String, val titulo: String, val sub: String)

private val BANNERS = listOf(
    Banner("ANTECIPAÇÃO 13º", "Receba seu 13º adiantado", "Taxa a partir de 1,55% a.m."),
    Banner("BANCO ATLAS", "Crédito com a menor taxa", "Simule em segundos, direto da sua margem"),
    Banner("PORTABILIDADE", "Traga seu contrato e economize", "Menos juros, mais dinheiro no bolso"),
)

@Composable
fun InicioScreen(
    vm: HomeViewModel,
    onOpenSimular: () -> Unit,
    onOpenAnalise: () -> Unit,
    onOpenPortabilidade: () -> Unit,
) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1000) } }

    // A margem é dado de segurança. Ao (re)entrar no Início, revalida no servidor
    // (network-first) para refletir aprovações recentes — depois de o banco aprovar,
    // a parcela do contrato já sai da margem disponível.
    LaunchedEffect(Unit) {
        if (vm.matriculasState is UiState.Success) vm.load(force = true)
    }

    var showNotifs by remember { mutableStateOf(false) }
    if (showNotifs) {
        NotificacoesDialog(
            notifs = vm.notificacoes,
            isLida = { vm.notifLida(it) },
            onMarcarLidas = { vm.marcarNotificacoesLidas() },
            onLimpar = { vm.limparNotificacoes() },
            onFechar = { showNotifs = false },
        )
    }

    when (val s = vm.matriculasState) {
        is UiState.Loading -> LoadingBox(Modifier.background(Fundo))
        is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() }, modifier = Modifier.background(Fundo))
        is UiState.Success -> {
            val info = vm.current()
            val expiry = vm.lockExpiry()
            val locked = expiry != null && expiry > now
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Fundo)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
            ) {
                Header(name = vm.userName, unread = vm.notifNaoLidas, onBell = { showNotifs = true })
                Spacer(Modifier.height(20.dp))

                if (s.stale) {
                    StaleBanner("Sem conexão — exibindo dados salvos.")
                    Spacer(Modifier.height(14.dp))
                }

                if (info != null) {
                    MargemPorModalidadeCard(
                        info = info,
                        locked = locked,
                        remainingMs = if (locked) (expiry!! - now) else 0L,
                    )
                    Spacer(Modifier.height(20.dp))
                }

                BannerCarousel()
                Spacer(Modifier.height(24.dp))

                SectionLabel("Oferta para sua margem")
                Spacer(Modifier.height(12.dp))
                OfertaAtlas(vm.ofertasState, onOpenSimular)

                Spacer(Modifier.height(16.dp))
                AtlasCard {
                    Text("Portabilidade", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Text(
                        "Traga contratos de outros bancos para o Atlas com taxa menor.",
                        color = InkMuted,
                        fontSize = 13.sp,
                    )
                    Spacer(Modifier.height(12.dp))
                    AtlasSecondaryButton(text = "Ver portabilidade", onClick = onOpenPortabilidade)
                }

                // "Acompanhar análise" só aparece quando há uma pré-reserva em andamento.
                if (locked) {
                    Spacer(Modifier.height(16.dp))
                    AtlasPrimaryButton(text = "Acompanhar análise", onClick = onOpenAnalise)
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun Header(name: String, unread: Int, onBell: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(greeting(), color = InkMuted, fontSize = 14.sp)
            Text(firstName(name), color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        }
        // Sino com badge de não-lidas — abre o popup de notificações.
        Box(
            modifier = Modifier.size(40.dp).clip(CircleShape).clickable(onClick = onBell),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Outlined.Notifications,
                contentDescription = "Notificações",
                tint = Ink,
                modifier = Modifier.size(24.dp),
            )
            if (unread > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(18.dp)
                        .clip(CircleShape)
                        .background(io.atlas.servidor.ui.theme.DangerRed),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (unread > 9) "9+" else "$unread",
                        color = Superficie,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
        Spacer(Modifier.size(12.dp))
        Box(
            modifier = Modifier.size(46.dp).clip(CircleShape).background(Ink),
            contentAlignment = Alignment.Center,
        ) {
            Text(initials(name), color = Superficie, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun NotificacoesDialog(
    notifs: List<io.atlas.servidor.domain.AppNotif>,
    isLida: (String) -> Boolean,
    onMarcarLidas: () -> Unit,
    onLimpar: () -> Unit,
    onFechar: () -> Unit,
) {
    androidx.compose.material3.AlertDialog(
        onDismissRequest = onFechar,
        containerColor = Superficie,
        title = {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Notificações", fontWeight = FontWeight.ExtraBold, color = Ink, modifier = Modifier.weight(1f))
                if (notifs.isNotEmpty()) {
                    Text(
                        "Limpar",
                        color = io.atlas.servidor.ui.theme.DangerRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable(onClick = onLimpar),
                    )
                }
            }
        },
        text = {
            if (notifs.isEmpty()) {
                Text("Nenhuma notificação por enquanto.", color = InkMuted, fontSize = 14.sp)
            } else {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    notifs.forEachIndexed { i, n ->
                        Row(verticalAlignment = Alignment.Top) {
                            Box(
                                modifier = Modifier
                                    .padding(top = 6.dp, end = 10.dp)
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(if (isLida(n.id)) io.atlas.servidor.ui.theme.Divider else Verde),
                            )
                            Column(Modifier.weight(1f)) {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                                    Text(n.titulo, color = Ink, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    if (n.quando.isNotBlank()) {
                                        Spacer(Modifier.width(8.dp))
                                        Text(n.quando, color = InkMuted, fontSize = 11.sp)
                                    }
                                }
                                Spacer(Modifier.height(2.dp))
                                Text(n.mensagem, color = InkMuted, fontSize = 13.sp)
                            }
                        }
                        if (i < notifs.lastIndex) {
                            Spacer(Modifier.height(10.dp))
                            androidx.compose.material3.Divider(color = io.atlas.servidor.ui.theme.Divider)
                            Spacer(Modifier.height(10.dp))
                        }
                    }
                }
            }
        },
        confirmButton = {
            androidx.compose.material3.TextButton(onClick = { onMarcarLidas(); onFechar() }) {
                Text("Marcar como lidas", color = Verde, fontWeight = FontWeight.Bold, maxLines = 1)
            }
        },
        dismissButton = {
            androidx.compose.material3.TextButton(onClick = onFechar) {
                Text("Fechar", color = InkMuted, fontWeight = FontWeight.SemiBold, maxLines = 1)
            }
        },
    )
}

/** Apenas o primeiro nome, em Title Case (ex.: "DIEGO PEREZ FERREIRA" -> "Diego"). */
private fun firstName(name: String): String {
    val first = name.trim().split(" ").firstOrNull { it.isNotBlank() } ?: return name
    return first.lowercase().replaceFirstChar { it.uppercase() }
}

/** Rótulos das modalidades — mesmos textos da versão web (dashboard.tsx). */
private val PRODUTO_LABEL = mapOf(
    "EMPRESTIMO" to "Empréstimo Consignado",
    "CARTAO_CONSIGNADO" to "Cartão de Crédito Consignado",
    "CARTAO_BENEFICIOS" to "Cartão Benefício Consignado",
)
private val ORDEM_MODALIDADES = listOf("EMPRESTIMO", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIOS")

/** Card escuro "Minha margem por modalidade" — espelha a web, empilhado para o celular.
 *  Cada produto tem seu próprio limite: a margem de empréstimo não serve para cartão. */
@Composable
private fun MargemPorModalidadeCard(info: MatriculaInfoDto, locked: Boolean, remainingMs: Long) {
    val porTipo = info.margem.margensPorTipo.associateBy { it.tipo }
    val m = info.margem.margem
    val linhas = ORDEM_MODALIDADES.map { tipo ->
        porTipo[tipo] ?: if (tipo == "EMPRESTIMO") {
            // Fallback: deriva do bloco `margem` se o backend não mandar a linha.
            MargemTipoDto(tipo = tipo, total = m.comprometido + m.disponivel, disponivel = m.disponivel)
        } else {
            MargemTipoDto(tipo = tipo, total = 0.0, disponivel = 0.0)
        }
    }

    Surface(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)),
        color = Ink,
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "MINHA MARGEM POR MODALIDADE",
                    color = Superficie.copy(alpha = 0.6f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.8.sp,
                )
                if (locked) StatusChip("Bloqueada", ChipTone.Ambar)
            }
            Spacer(Modifier.height(16.dp))

            linhas.forEachIndexed { i, linha ->
                MargemLinha(linha)
                if (i < linhas.lastIndex) {
                    Spacer(Modifier.height(14.dp))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Superficie.copy(alpha = 0.10f)))
                    Spacer(Modifier.height(14.dp))
                }
            }

            if (locked) {
                Spacer(Modifier.height(16.dp))
                Box(Modifier.fillMaxWidth().height(1.dp).background(Superficie.copy(alpha = 0.10f)))
                Spacer(Modifier.height(14.dp))
                Text("Liberação da margem em", color = Superficie.copy(alpha = 0.7f), fontSize = 12.sp)
                Text(formatRemaining(remainingMs), color = Ambar, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
    }
}

/** Uma modalidade: nome, barra de uso, % utilizado/livre e Total/Utilizado/Disponível. */
@Composable
private fun MargemLinha(data: MargemTipoDto) {
    val utilizado = (data.total - data.disponivel).coerceAtLeast(0.0)
    // Frações (0..1) — Format.percent1 espera fração, não percentual.
    val fracUtilizado = if (data.total > 0) (utilizado / data.total).coerceIn(0.0, 1.0) else 0.0
    val fracLivre = 1.0 - fracUtilizado
    val barColor = when {
        utilizado == 0.0 -> Verde
        fracUtilizado > 0.8 -> DangerRed
        else -> Ambar
    }
    val label = PRODUTO_LABEL[data.tipo] ?: data.tipo

    Column(Modifier.fillMaxWidth()) {
        Text(label, color = Superficie, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(5.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(Superficie.copy(alpha = 0.15f)),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fracUtilizado.toFloat())
                    .height(5.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(barColor),
            )
        }
        Spacer(Modifier.height(6.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                if (utilizado == 0.0) "0%" else "${Format.percent1(fracUtilizado)} utilizado",
                color = if (utilizado > 0) Ambar else Superficie.copy(alpha = 0.5f),
                fontSize = 11.sp,
            )
            Text("${Format.percent1(fracLivre)} livre", color = Verde, fontSize = 11.sp)
        }
        Spacer(Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth()) {
            ValorColuna("Total", Format.money(data.total), Modifier.weight(1f), Superficie)
            ValorColuna(
                "Utilizado",
                Format.money(utilizado),
                Modifier.weight(1f),
                if (utilizado > 0) Ambar else Superficie.copy(alpha = 0.5f),
            )
            ValorColuna("Disponível", Format.money(data.disponivel), Modifier.weight(1f), Verde, bold = true)
        }
    }
}

@Composable
private fun ValorColuna(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    color: Color,
    bold: Boolean = false,
) {
    Column(modifier = modifier) {
        Text(
            label.uppercase(),
            color = Superficie.copy(alpha = 0.5f),
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp,
        )
        Spacer(Modifier.height(3.dp))
        Text(
            value,
            color = color,
            fontSize = 13.sp,
            fontWeight = if (bold) FontWeight.ExtraBold else FontWeight.Bold,
        )
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun BannerCarousel() {
    val pagerState = rememberPagerState(pageCount = { BANNERS.size })
    LaunchedEffect(Unit) {
        while (true) {
            delay(4000)
            val next = (pagerState.currentPage + 1) % BANNERS.size
            pagerState.animateScrollToPage(next)
        }
    }
    Column {
        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxWidth()) { page ->
            val b = BANNERS[page]
            Surface(
                modifier = Modifier.fillMaxWidth().padding(end = 2.dp),
                shape = RoundedCornerShape(18.dp),
                color = Verde,
            ) {
                Column(Modifier.padding(20.dp)) {
                    Surface(shape = RoundedCornerShape(999.dp), color = VerdeDark) {
                        Text(
                            b.tag,
                            color = Superficie,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(b.titulo, color = Superficie, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    Spacer(Modifier.height(4.dp))
                    Text(b.sub, color = Superficie.copy(alpha = 0.9f), fontSize = 13.sp)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(BANNERS.size) { i ->
                val selected = i == pagerState.currentPage
                Box(
                    modifier = Modifier
                        .padding(horizontal = 3.dp)
                        .size(if (selected) 8.dp else 6.dp)
                        .clip(CircleShape)
                        .background(if (selected) Verde else InkMuted.copy(alpha = 0.4f)),
                )
            }
        }
    }
}

@Composable
private fun OfertaAtlas(state: UiState<OfertasResponse>, onSimular: () -> Unit) {
    // Uma única oferta consolidada "Banco Atlas", com a melhor taxa/prazo disponíveis.
    val ofertas = (state as? UiState.Success)?.data?.ofertas.orEmpty()
    val taxaMin = ofertas.minOfOrNull { it.taxaMinAm } ?: 0.0155
    val prazoMax = ofertas.maxOfOrNull { it.prazoMaxMeses } ?: 96

    AtlasCard {
        // Nome/subtítulo e a taxa em linhas próprias — evita a quebra de linha feia do chip.
        Text("Banco Atlas", color = Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Text("Crédito consignado · até ${prazoMax}×", color = InkMuted, fontSize = 13.sp)
        Spacer(Modifier.height(12.dp))
        StatusChip("A partir de ${Format.rateAm(taxaMin)}", ChipTone.Verde)
        Spacer(Modifier.height(16.dp))
        AtlasPrimaryButton(text = "Simular", onClick = onSimular)
    }
}

private fun formatRemaining(ms: Long): String {
    if (ms <= 0) return "00h 00min"
    val totalMin = ms / 60000
    val h = totalMin / 60
    val m = totalMin % 60
    return "${h}h ${m.toString().padStart(2, '0')}min"
}

private fun greeting(): String {
    val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
        h < 12 -> "Bom dia,"
        h < 18 -> "Boa tarde,"
        else -> "Boa noite,"
    }
}

private fun initials(name: String): String {
    val parts = name.trim().split(" ").filter { it.isNotBlank() }
    if (parts.isEmpty()) return "?"
    val first = parts.first().firstOrNull()?.uppercase() ?: ""
    val last = if (parts.size > 1) parts.last().firstOrNull()?.uppercase() ?: "" else ""
    return (first + last).ifBlank { "?" }
}
