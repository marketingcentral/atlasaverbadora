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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.style.TextAlign
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
            "Benefícios de saúde e bem-estar para você.",
            color = InkMuted,
            fontSize = 14.sp,
        )

        Spacer(Modifier.height(18.dp))
        var showCotar by remember { mutableStateOf(false) }
        if (showCotar) {
            CotacaoDialog(
                enviando = vm.cotacaoEnviando,
                erro = vm.cotacaoErro,
                onSolicitar = { vm.solicitarCotacao(onSucesso = { showCotar = false }) },
                onCancelar = { showCotar = false },
            )
        }
        TelemedicinaBanner(
            cotacaoPendente = vm.cotacaoPendente,
            planoProgresso = vm.planoProgresso,
            planoMesesRestantes = vm.planoMesesRestantes,
            onSolicitarCotacao = { showCotar = true },
        )

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

        Spacer(Modifier.height(16.dp))
        InfoNota()
        Spacer(Modifier.height(24.dp))
    }
}

/** Destaque verde — Telemedicina (mesmo conteúdo da web) + botão Solicitar Cotação. */
@Composable
private fun TelemedicinaBanner(
    cotacaoPendente: Boolean,
    planoProgresso: Float?,
    planoMesesRestantes: Int,
    onSolicitarCotacao: () -> Unit,
) {
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
                    "Plano mínimo de 12 meses",
                    color = Superficie,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                )
            }
            Spacer(Modifier.height(14.dp))
            if (planoProgresso != null) {
                // Plano ATIVO — barra de progresso do plano de 12 meses.
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Superficie.copy(alpha = 0.18f),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Column(Modifier.fillMaxWidth().padding(14.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("✓ Plano Ativo", color = Superficie, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                            Text("faltam $planoMesesRestantes meses", color = Superficie, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(8.dp))
                        Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(999.dp)).background(Superficie.copy(alpha = 0.25f))) {
                            Box(Modifier.fillMaxWidth(planoProgresso).height(8.dp).clip(RoundedCornerShape(999.dp)).background(Superficie))
                        }
                        Spacer(Modifier.height(6.dp))
                        Text("Plano de 12 meses · ${(planoProgresso * 100).toInt()}% concluído", color = Superficie.copy(alpha = 0.85f), fontSize = 11.sp)
                    }
                }
            } else if (cotacaoPendente) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = Superficie.copy(alpha = 0.18f),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text(
                        "Cotação em análise. Em breve, a equipe da Atlas entrará em contato com você.",
                        color = Superficie,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp, horizontal = 8.dp),
                    )
                }
            } else {
                Surface(
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable(onClick = onSolicitarCotacao),
                    color = Superficie,
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text(
                        "Solicitar Cotação",
                        color = Verde,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    )
                }
            }
        }
    }
}

/** Popup — explica a telemedicina e que a Atlas entra em contato pra formalizar. */
@Composable
private fun CotacaoDialog(enviando: Boolean, erro: String?, onSolicitar: () -> Unit, onCancelar: () -> Unit) {
    AlertDialog(
        onDismissRequest = onCancelar,
        containerColor = Superficie,
        title = { Text("Telemedicina — Solicitar Cotação", fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            Column {
                Text(
                    "Consultas online 24h com médicos parceiros (Clínico Geral, Pediatria, Psicologia e Nutrição). " +
                        "Plano com compromisso mínimo de 12 meses.",
                    color = InkMuted,
                    fontSize = 14.sp,
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    "Ao solicitar a cotação, o time da Atlas recebe seus dados de contato e entra em contato " +
                        "com você para formalizar a solicitação.",
                    color = InkMuted,
                    fontSize = 13.sp,
                )
                erro?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = DangerRed, fontSize = 13.sp)
                }
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(
                onClick = onSolicitar,
                enabled = !enviando,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Verde, contentColor = Superficie),
            ) { Text(if (enviando) "Enviando…" else "Solicitar Cotação", fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            TextButton(onClick = onCancelar) { Text("Cancelar", color = InkMuted, fontWeight = FontWeight.SemiBold) }
        },
    )
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
