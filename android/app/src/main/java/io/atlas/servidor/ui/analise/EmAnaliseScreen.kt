package io.atlas.servidor.ui.analise

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.livedata.observeAsState
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.data.local.ProposalRequestEntity
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.InfoRow
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Verde
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val LOCK_MS = 48L * 60L * 60L * 1000L

@Composable
fun EmAnaliseScreen(
    vm: EmAnaliseViewModel = viewModel(),
) {
    val proposals by vm.proposals.observeAsState(emptyList())
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) { now = System.currentTimeMillis(); kotlinx.coroutines.delay(1000) }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(Fundo).padding(20.dp),
    ) {
        Text("Em análise", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        Spacer(Modifier.height(6.dp))
        Text(
            "Pré-reservas com a margem bloqueada por até 48h enquanto o banco analisa. " +
                "Você mantém apenas uma pré-reserva por vez.",
            color = InkMuted,
            fontSize = 14.sp,
        )
        Spacer(Modifier.height(20.dp))

        if (proposals.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Você não tem solicitações em análise.", color = InkMuted, fontSize = 14.sp)
            }
        } else {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                proposals.forEach { p ->
                    ProposalCard(p, now, onCancel = { vm.cancelar(p.id, p.matricula) })
                    Spacer(Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun ProposalCard(p: ProposalRequestEntity, now: Long, onCancel: () -> Unit) {
    val releaseAt = p.createdAt + LOCK_MS
    val remaining = releaseAt - now
    val liberada = remaining <= 0
    AtlasCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(p.bancoNome, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text("Solicitado ${formatDate(p.createdAt)}", color = InkMuted, fontSize = 12.sp)
            }
            StatusChip(if (liberada) "Liberada" else "Em análise", if (liberada) ChipTone.Verde else ChipTone.Ambar)
        }
        Spacer(Modifier.height(12.dp))
        InfoRow("Valor", Format.money(p.valor))
        InfoRow("Prazo", "${p.parcelas} parcelas")
        InfoRow("Parcela", Format.money(p.parcelaMensal))
        InfoRow(
            "Margem",
            if (liberada) "Liberada" else "Libera em ${formatShort(remaining)}",
            valueColor = if (liberada) Verde else Ink,
        )
        Spacer(Modifier.height(4.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onCancel) {
                Text("Cancelar solicitação", color = DangerRed, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private fun formatShort(ms: Long): String {
    if (ms <= 0) return "0min"
    val totalMin = ms / 60000
    val h = totalMin / 60
    val m = totalMin % 60
    return if (h > 0) "${h}h ${m}min" else "${m}min"
}

private fun formatDate(millis: Long): String {
    val fmt = SimpleDateFormat("dd/MM 'às' HH:mm", Locale("pt", "BR"))
    return fmt.format(Date(millis))
}
