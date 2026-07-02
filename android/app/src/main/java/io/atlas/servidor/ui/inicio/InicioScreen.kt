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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.OfertasResponse
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.components.StaleBanner
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.shell.HomeViewModel
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeDark
import io.atlas.servidor.ui.theme.VerdeSoft
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
) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1000) } }

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
                Header(name = vm.userName)
                Spacer(Modifier.height(20.dp))

                if (s.stale) {
                    StaleBanner("Sem conexão — exibindo dados salvos.")
                    Spacer(Modifier.height(14.dp))
                }

                if (info != null) {
                    MargemCard(
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
private fun Header(name: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(greeting(), color = InkMuted, fontSize = 14.sp)
            Text(name, color = Ink, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        }
        Box(
            modifier = Modifier.size(46.dp).clip(CircleShape).background(VerdeSoft),
            contentAlignment = Alignment.Center,
        ) {
            Text(initials(name), color = Verde, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun MargemCard(info: MatriculaInfoDto, locked: Boolean, remainingMs: Long) {
    val m = info.margem.margem
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
                    if (locked) "Margem consignável" else "Margem disponível",
                    color = Superficie.copy(alpha = 0.7f),
                    fontSize = 13.sp,
                )
                if (locked) StatusChip("Bloqueada", ChipTone.Ambar)
            }
            Spacer(Modifier.height(6.dp))
            Text(Format.money(m.disponivel), color = Superficie, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(Modifier.height(4.dp))
            Text("de ${Format.money(m.salarioBase * 0.35)} (35%)", color = Superficie.copy(alpha = 0.7f), fontSize = 13.sp)

            Spacer(Modifier.height(16.dp))
            if (locked) {
                Text("Liberação da margem em", color = Superficie.copy(alpha = 0.7f), fontSize = 12.sp)
                Text(formatRemaining(remainingMs), color = Ambar, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            } else {
                LinearProgressIndicator(
                    progress = m.percentualUso.toFloat().coerceIn(0f, 1f),
                    modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                    color = Verde,
                    trackColor = Superficie.copy(alpha = 0.2f),
                )
                Spacer(Modifier.height(10.dp))
                Text("Em uso ${Format.money(m.comprometido)}", color = Superficie.copy(alpha = 0.8f), fontSize = 12.sp)
            }
        }
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
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Banco Atlas", color = Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text("Crédito consignado · até ${prazoMax}×", color = InkMuted, fontSize = 13.sp)
            }
            StatusChip("A partir de ${Format.rateAm(taxaMin)}", ChipTone.Verde)
        }
        Spacer(Modifier.height(14.dp))
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
