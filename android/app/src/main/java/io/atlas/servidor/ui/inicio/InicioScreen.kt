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
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.OfertasResponse
import io.atlas.servidor.ui.navigation.Produtos
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
    onSimularProduto: (String) -> Unit,
    onOpenMarketplace: () -> Unit,
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
                    SectionLabel("Minhas margens")
                    Spacer(Modifier.height(12.dp))
                    ProdutosSection(
                        info = info,
                        locked = locked,
                        onSimularProduto = onSimularProduto,
                        onOpenMarketplace = onOpenMarketplace,
                        onOpenAnalise = onOpenAnalise,
                    )
                    Spacer(Modifier.height(24.dp))
                }

                BannerCarousel()
                Spacer(Modifier.height(24.dp))

                SectionLabel("Oferta para sua margem")
                Spacer(Modifier.height(12.dp))
                OfertaAtlas(vm.ofertasState) { onSimularProduto(Produtos.EMPRESTIMO) }

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

/** Os três produtos consignados, cada um com a SUA margem e a SUA ação.
 *  Cada produto tem limite próprio — a margem de empréstimo não serve para cartão. */
@Composable
private fun ProdutosSection(
    info: MatriculaInfoDto,
    locked: Boolean,
    onSimularProduto: (String) -> Unit,
    onOpenMarketplace: () -> Unit,
    onOpenAnalise: () -> Unit,
) {
    val porTipo = info.margem.margensPorTipo.associateBy { it.tipo }
    val m = info.margem.margem
    // Fallback do empréstimo: deriva do bloco `margem` se a linha não vier.
    val emprestimo = porTipo[Produtos.EMPRESTIMO]?.disponivel ?: m.disponivel
    val cartaoCredito = porTipo[Produtos.CARTAO_CONSIGNADO]?.disponivel ?: 0.0
    val cartaoBeneficio = porTipo[Produtos.CARTAO_BENEFICIOS]?.disponivel ?: 0.0

    ProdutoCard(
        emoji = "💵",
        titulo = "Empréstimo Consignado",
        descricao = "Dinheiro na sua conta, descontado direto da folha.",
        disponivel = emprestimo,
        aviso = if (locked) "Você tem uma solicitação em análise. Sua margem está bloqueada." else null,
        textoBotao = if (locked) "Acompanhar análise" else "Simular",
        onClick = if (locked) onOpenAnalise else ({ onSimularProduto(Produtos.EMPRESTIMO) }),
    )
    Spacer(Modifier.height(14.dp))
    ProdutoCard(
        emoji = "💳",
        titulo = "Cartão de Crédito Consignado",
        descricao = "Cartão com limite próprio e fatura descontada em folha.",
        disponivel = cartaoCredito,
        aviso = null,
        textoBotao = "Simular",
        onClick = { onSimularProduto(Produtos.CARTAO_CONSIGNADO) },
    )
    Spacer(Modifier.height(14.dp))
    ProdutoCard(
        emoji = "🎁",
        titulo = "Cartão Benefício Consignado",
        descricao = "Use seus benefícios nos parceiros do convênio.",
        disponivel = cartaoBeneficio,
        aviso = null,
        textoBotao = "Ver Marketplace",
        onClick = onOpenMarketplace,
    )
}

/** Card de um produto: o que é, quanto sobra de margem e o que fazer a seguir. */
@Composable
private fun ProdutoCard(
    emoji: String,
    titulo: String,
    descricao: String,
    disponivel: Double,
    aviso: String?,
    textoBotao: String,
    onClick: () -> Unit,
) {
    AtlasCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(emoji, fontSize = 28.sp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(titulo, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text(descricao, color = InkMuted, fontSize = 12.sp)
            }
        }

        Spacer(Modifier.height(16.dp))
        Text(
            "MARGEM DISPONÍVEL",
            color = InkMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.6.sp,
        )
        Spacer(Modifier.height(4.dp))
        Text(Format.money(disponivel), color = Verde, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)

        if (aviso != null) {
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusChip("Bloqueada", ChipTone.Ambar)
            }
            Spacer(Modifier.height(6.dp))
            Text(aviso, color = InkMuted, fontSize = 12.sp)
        }

        Spacer(Modifier.height(16.dp))
        AtlasPrimaryButton(text = textoBotao, onClick = onClick)
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
