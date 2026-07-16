package io.atlas.servidor.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

// ---- Acompanhamento em tempo real (servidor → banco → prefeitura) ----
data class Fase(val label: String, val hint: String)

val FASES = listOf(
    Fase("Proposta enviada", "Sua solicitação chegou ao banco."),
    Fase("Aguardando aprovação", "O banco está analisando a proposta."),
    Fase("Aprovado pelo banco", "O banco liberou o crédito e vai enviar o dinheiro."),
    Fase("Aguardando ADF da prefeitura", "A prefeitura vai confirmar o desconto em folha."),
    Fase("Autorização completa", "Desconto confirmado em folha. Tudo certo!"),
)

// Telemedicina tem passo a passo PRÓPRIO — quem aprova é a averbadora (não o banco),
// e depois ainda depende da ADF da prefeitura.
val TELE_FASES = listOf(
    Fase("Em Análise", "A equipe da Atlas vai entrar em contato com você."),
    Fase("Aprovado pela Averbadora", "A Atlas aprovou seu plano de telemedicina."),
    Fase("Aguardando aprovação de ADF", "A prefeitura vai confirmar o desconto em folha."),
    Fase("ADF Aprovada", "Desconto confirmado em folha pela prefeitura."),
    Fase("Autorização completa", "Plano ativo. Tudo certo!"),
)

data class FaseInfo(
    val ativo: Int,
    val concluido: Boolean,
    val falhaPasso: Int? = null,
    val falhaLabel: String? = null,
    val falhaMotivo: String? = null,
)

/** É um plano de Telemedicina? (convênio "Telemedicina Atlas", criado na aprovação) */
fun ehTelemedicina(convenio: String?): Boolean = (convenio ?: "").contains("telemedicina", ignoreCase = true)

/** Cadeia de fases da TELEMEDICINA (cotação → averbadora → ADF). */
fun teleFaseChain(situacao: String, folhaStatus: String?, motivo: String?): FaseInfo {
    val s = situacao.lowercase()
    if (s.contains("cancel") || s.contains("recus") || s.contains("suspens")) {
        return FaseInfo(1, false, falhaPasso = 1, falhaLabel = "Cotação cancelada", falhaMotivo = motivo)
    }
    if (s.contains("expir")) {
        return FaseInfo(1, false, falhaPasso = 1, falhaLabel = "Cotação expirada sem contato")
    }
    return when (folhaStatus?.lowercase()) {
        "aplicada" -> FaseInfo(4, concluido = true)
        "falha" -> FaseInfo(2, false, falhaPasso = 2, falhaLabel = "ADF negada pela prefeitura", falhaMotivo = motivo)
        else -> FaseInfo(2, false) // aprovado pela averbadora, aguardando ADF
    }
}

/** Situação terminal de REPROVA (recusada/expirada/cancelada/suspensa) — sai da análise
 *  e vai para o Histórico (não confundir com quitado, que vem dos contratos). */
fun terminalHistorico(situacao: String?): Boolean {
    val s = (situacao ?: "").lowercase()
    return s.contains("cancel") || s.contains("recus") || s.contains("expir") || s.contains("suspens")
}

/** Deriva a fase atual a partir da situação do banco + status da ADF na prefeitura. */
fun faseChain(situacao: String, folhaStatus: String?, motivo: String?): FaseInfo {
    val s = situacao.lowercase()
    if (s.contains("cancel") || s.contains("recus") || s.contains("suspens")) {
        return FaseInfo(1, false, falhaPasso = 1, falhaLabel = "Recusada pelo banco", falhaMotivo = motivo)
    }
    if (s.contains("expir")) {
        return FaseInfo(1, false, falhaPasso = 1, falhaLabel = "Proposta expirada sem resposta")
    }
    if (s.contains("aguard")) return FaseInfo(1, false) // aguardando aprovação do banco
    // Banco aprovou (Ativo/averbado/quitado) — agora depende da ADF da prefeitura.
    return when (folhaStatus?.lowercase()) {
        "aplicada" -> FaseInfo(4, concluido = true)
        "falha" -> FaseInfo(3, false, falhaPasso = 3, falhaLabel = "ADF negada pela prefeitura", falhaMotivo = motivo)
        else -> FaseInfo(3, false) // aprovado, aguardando ADF
    }
}

/** "Menuzinho" vertical do processo em tempo real, com bolinhas conectadas por trilha. */
@Composable
fun FaseTimeline(fase: FaseInfo, fases: List<Fase> = FASES) {
    Column {
        SectionLabel("Acompanhamento em tempo real")
        Spacer(Modifier.height(12.dp))
        fases.forEachIndexed { i, f ->
            val isFalha = fase.falhaPasso == i
            val done = !isFalha && (fase.concluido || i < fase.ativo)
            val active = !isFalha && !fase.concluido && i == fase.ativo
            val last = i == fases.lastIndex

            val circleColor = when {
                isFalha -> DangerRed
                done -> Verde
                active -> Ambar
                else -> Divider
            }
            val circleText = when {
                isFalha -> "!"
                done -> "✓"
                else -> "${i + 1}"
            }
            val circleTextColor = if (isFalha || done || active) Superficie else InkMuted
            val label = if (isFalha) fase.falhaLabel ?: f.label else f.label
            val labelColor = when {
                isFalha -> DangerRed
                active || done -> Ink
                else -> InkMuted
            }
            val hint = if (isFalha) {
                fase.falhaMotivo?.let { "Motivo: $it" } ?: "Entre em contato com o banco para resolver."
            } else {
                f.hint
            }

            Row(modifier = Modifier.height(IntrinsicSize.Min)) {
                Column(
                    modifier = Modifier.fillMaxHeight(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    androidx.compose.foundation.layout.Box(
                        modifier = Modifier.size(22.dp).clip(CircleShape).background(circleColor),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(circleText, color = circleTextColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    if (!last) {
                        androidx.compose.foundation.layout.Box(
                            modifier = Modifier
                                .width(2.dp)
                                .weight(1f)
                                .background(if (done) Verde else Divider),
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.padding(bottom = if (last) 0.dp else 14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            label,
                            color = labelColor,
                            fontSize = 14.sp,
                            fontWeight = if (active || isFalha) FontWeight.Bold else if (done) FontWeight.SemiBold else FontWeight.Normal,
                        )
                        if (active) {
                            Spacer(Modifier.width(8.dp))
                            Text("● agora", color = Ambar, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.height(2.dp))
                    Text(hint, color = InkMuted, fontSize = 12.sp)
                }
            }
        }
    }
}
