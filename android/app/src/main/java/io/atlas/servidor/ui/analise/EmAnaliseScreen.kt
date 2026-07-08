package io.atlas.servidor.ui.analise

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.PropostaDto
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.FaseTimeline
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.components.faseChain
import io.atlas.servidor.ui.components.terminalHistorico
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import java.util.Locale

@Composable
fun EmAnaliseScreen(vm: EmAnaliseViewModel = viewModel()) {
    Column(
        modifier = Modifier.fillMaxSize().background(Fundo).padding(20.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Em análise", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
            TextButton(onClick = { vm.load() }) {
                Text("Atualizar", color = Verde, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }
        Text(
            "Solicitações enviadas ao banco. O status atualiza conforme a análise " +
                "(banco) e a aplicação em folha (prefeitura).",
            color = InkMuted,
            fontSize = 14.sp,
        )
        Spacer(Modifier.height(16.dp))

        when (val s = vm.state) {
            is UiState.Loading -> LoadingBox()
            is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() })
            is UiState.Success -> {
                // Em análise = só as em andamento. Saem daqui: aprovadas por completo
                // (viram contrato) e recusadas/expiradas/canceladas (vão pro Histórico).
                val emAnalise = s.data.filter {
                    val sit = (it.situacao ?: "").lowercase()
                    !terminalHistorico(it.situacao) &&
                        !sit.contains("quitad") &&
                        !faseChain(it.situacao ?: "—", it.folhaStatus, it.folhaMotivo).concluido
                }
                if (emAnalise.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Você não tem solicitações em análise.", color = InkMuted, fontSize = 14.sp)
                    }
                } else {
                    Column(Modifier.verticalScroll(rememberScrollState())) {
                        emAnalise.forEach { p ->
                            PropostaCard(p, onLiberar = { vm.liberarSimulacao(); vm.load() })
                            Spacer(Modifier.height(12.dp))
                        }
                        Spacer(Modifier.height(20.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun PropostaCard(p: PropostaDto, onLiberar: () -> Unit) {
    val situacao = p.situacao ?: "—"
    val fase = faseChain(situacao, p.folhaStatus, p.folhaMotivo)
    AtlasCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(p.banco ?: "Banco Atlas", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text(
                    "${p.id}${p.data?.let { " · criada em $it" } ?: ""}",
                    color = InkMuted,
                    fontSize = 12.sp,
                )
            }
            Spacer(Modifier.width(8.dp))
            StatusChip(situacaoCurta(situacao), statusTone(situacao))
        }

        Spacer(Modifier.height(16.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            StatCol("Valor liberado", Format.money(p.valor), accent = true, modifier = Modifier.weight(1f))
            StatCol("Parcelas", "${p.parcelas}x de ${Format.money(p.parcela)}", modifier = Modifier.weight(1f))
            StatCol(
                "Taxa mensal",
                String.format(Locale("pt", "BR"), "%.2f%%", p.taxaAm),
                modifier = Modifier.weight(1f),
            )
        }

        Spacer(Modifier.height(18.dp))
        FaseTimeline(fase)

        p.expiraEm?.takeIf { !fase.concluido && fase.falhaPasso == null }?.let {
            Spacer(Modifier.height(8.dp))
            Text("Reserva expira em $it", color = InkMuted, fontSize = 12.sp)
        }

        Spacer(Modifier.height(4.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onLiberar) {
                Text("Liberar simulação (teste)", color = DangerRed, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun StatCol(label: String, value: String, modifier: Modifier = Modifier, accent: Boolean = false) {
    Column(modifier = modifier) {
        Text(
            label.uppercase(),
            color = InkMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.6.sp,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            value,
            color = if (accent) Verde else Ink,
            fontSize = 14.sp,
            fontWeight = if (accent) FontWeight.ExtraBold else FontWeight.SemiBold,
        )
    }
}

private fun statusTone(situacao: String): ChipTone {
    val s = situacao.lowercase()
    return when {
        s.contains("aguard") -> ChipTone.Ambar
        s.contains("ativo") || s.contains("averb") || s.contains("quitad") -> ChipTone.Verde
        s.contains("cancel") || s.contains("recus") || s.contains("expir") -> ChipTone.Neutro
        else -> ChipTone.Neutro
    }
}

private fun situacaoCurta(situacao: String): String {
    val s = situacao.lowercase()
    return when {
        s.contains("aguard") -> "Em análise"
        s.contains("ativo") || s.contains("averb") || s.contains("quitad") -> "Liberada"
        s.contains("expir") -> "Expirada"
        s.contains("cancel") -> "Cancelada"
        s.contains("recus") -> "Recusada"
        else -> situacao
    }
}
