package io.atlas.servidor.ui.telemedicina

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.BeneficioDto
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.shell.HomeViewModel
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeDark

/** Telemedicina — mesmas informações da web (`/servidor/saude`), adaptadas ao celular:
 *  banner de Telemedicina Gratuita, rede de saúde parceira e o Cartão Benefício. */
@Composable
fun TelemedicinaScreen(home: HomeViewModel, vm: TelemedicinaViewModel = viewModel()) {
    val info = home.current()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text("Telemedicina", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        Text(
            "Benefícios de saúde do seu cartão benefício consignado.",
            color = InkMuted,
            fontSize = 14.sp,
        )

        Spacer(Modifier.height(18.dp))
        TelemedicinaBanner()

        Spacer(Modifier.height(24.dp))
        SectionLabel("Rede de saúde parceira")
        Spacer(Modifier.height(12.dp))
        when (val s = vm.state) {
            is UiState.Loading -> LoadingBox()
            is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() })
            is UiState.Success -> {
                if (s.data.isEmpty()) {
                    EmptyParceiros()
                } else {
                    s.data.forEach { b ->
                        ParceiroCard(b)
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }
        }

        if (info != null) {
            Spacer(Modifier.height(12.dp))
            SectionLabel("Cartão Benefício Consignado")
            Spacer(Modifier.height(12.dp))
            CartaoBeneficioCard(info)
        }

        Spacer(Modifier.height(16.dp))
        InfoNota()
        Spacer(Modifier.height(24.dp))
    }
}

/** Destaque verde — Telemedicina Gratuita (mesmo conteúdo da web). */
@Composable
private fun TelemedicinaBanner() {
    Surface(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)),
        color = Verde,
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(Superficie.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center,
                ) { Text("🩺", fontSize = 26.sp) }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text("BENEFÍCIO EXCLUSIVO · SERVIDOR", color = Superficie.copy(alpha = 0.85f), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp)
                    Text("Telemedicina Gratuita", color = Superficie, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(
                "Consultas online 24h · Clínico Geral, Pediatria, Psicologia e Nutrição.",
                color = Superficie.copy(alpha = 0.92f),
                fontSize = 13.sp,
                lineHeight = 18.sp,
            )
            Spacer(Modifier.height(12.dp))
            Surface(shape = RoundedCornerShape(999.dp), color = VerdeDark) {
                Text(
                    "GRATUITO · Sem carência",
                    color = Superficie,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                )
            }
        }
    }
}

@Composable
private fun ParceiroCard(b: BeneficioDto) {
    val context = LocalContext.current
    val icone = b.icone?.takeIf { !it.startsWith("http") } ?: "🏥"
    AtlasCard {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier.size(44.dp).clip(RoundedCornerShape(10.dp)).background(VerdeSoftBg()),
                contentAlignment = Alignment.Center,
            ) { Text(icone, fontSize = 22.sp) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(b.nome, color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                val sub = listOfNotNull("Saúde", b.local).joinToString(" · ")
                Text(sub, color = InkMuted, fontSize = 12.sp)
                if (!b.descontoLabel.isNullOrBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(b.descontoLabel, color = Verde, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        if (!b.descontoComplemento.isNullOrBlank()) {
                            Spacer(Modifier.width(4.dp))
                            Text(b.descontoComplemento, color = InkMuted, fontSize = 12.sp)
                        }
                    }
                }
                b.bancoNome?.takeIf { it.isNotBlank() }?.let {
                    Spacer(Modifier.height(4.dp))
                    Text("Oferecido por $it", color = InkMuted, fontSize = 11.sp)
                }
                val url = b.linkAcesso?.url
                if (!url.isNullOrBlank()) {
                    Spacer(Modifier.height(12.dp))
                    Surface(
                        modifier = Modifier.clip(RoundedCornerShape(8.dp)).clickable {
                            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                        },
                        color = Verde,
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Text(
                            "${b.linkAcesso?.textoBotao?.takeIf { it.isNotBlank() } ?: "Acessar"} →",
                            color = Superficie,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        )
                    }
                }
            }
        }
    }
}

/** Resumo do Cartão Benefício — margem CARTAO_BENEFICIOS (Total/Utilizado/Disponível + barra). */
@Composable
private fun CartaoBeneficioCard(info: MatriculaInfoDto) {
    val m = info.margem.margensPorTipo.firstOrNull { it.tipo == "CARTAO_BENEFICIOS" }
    val total = m?.total ?: 0.0
    val disponivel = m?.disponivel ?: 0.0
    val utilizado = (total - disponivel).coerceAtLeast(0.0)
    val frac = if (total > 0) (utilizado / total).coerceIn(0.0, 1.0) else 0.0
    val cor = when {
        utilizado == 0.0 -> Verde
        frac > 0.8 -> DangerRed
        else -> Ambar
    }
    AtlasCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("🎁", fontSize = 24.sp)
            Spacer(Modifier.width(10.dp))
            Column {
                Text("Seu limite para saúde e bem-estar", color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                Text("Compras nos parceiros são debitadas do limite. A fatura vem na folha.", color = InkMuted, fontSize = 12.sp, lineHeight = 16.sp)
            }
        }
        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth()) {
            MiniStat("Total", Format.money(total), Modifier.weight(1f), Ink)
            MiniStat("Utilizado", Format.money(utilizado), Modifier.weight(1f), if (utilizado > 0) Ambar else InkMuted)
            MiniStat("Disponível", Format.money(disponivel), Modifier.weight(1f), Verde)
        }
        Spacer(Modifier.height(12.dp))
        Box(
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(999.dp)).background(Divider),
        ) {
            Box(Modifier.fillMaxWidth(frac.toFloat()).height(6.dp).clip(RoundedCornerShape(999.dp)).background(cor))
        }
    }
}

@Composable
private fun MiniStat(label: String, value: String, modifier: Modifier, color: Color) {
    Column(modifier = modifier) {
        Text(label.uppercase(), color = InkMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp)
        Spacer(Modifier.height(3.dp))
        Text(value, color = color, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun EmptyParceiros() {
    Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
        Text("Sem parceiros de saúde nesta região — em breve mais opções.", color = InkMuted, fontSize = 13.sp)
    }
}

@Composable
private fun InfoNota() {
    Surface(color = VerdeSoftBg(), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
        Text(
            "ℹ️ Os benefícios de saúde são oferecidos pelo banco parceiro que disponibiliza seu " +
                "cartão consignado. Descontos comerciais (alimentação, educação, lazer) ficam no Marketplace.",
            color = Ink,
            fontSize = 12.5.sp,
            lineHeight = 17.sp,
            modifier = Modifier.padding(12.dp),
        )
    }
}

/** Verde bem suave para os fundos de ícone/nota. */
@Composable
private fun VerdeSoftBg(): Color = io.atlas.servidor.ui.theme.VerdeSoft
