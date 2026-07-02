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
import androidx.compose.runtime.getValue
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
import io.atlas.servidor.ui.components.BackHeader
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun EmAnaliseScreen(
    onBack: () -> Unit,
    vm: EmAnaliseViewModel = viewModel(),
) {
    val proposals by vm.proposals.observeAsState(emptyList())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .padding(20.dp),
    ) {
        BackHeader("Em análise", onBack)
        Spacer(Modifier.height(8.dp))
        Text(
            "Pré-reservas com a margem bloqueada por até 48h enquanto o banco analisa.",
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
                    ProposalCard(p, onCancel = { vm.cancelar(p.id) })
                    Spacer(Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun ProposalCard(p: ProposalRequestEntity, onCancel: () -> Unit) {
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
            StatusChip("Em análise", ChipTone.Ambar)
        }
        Spacer(Modifier.height(12.dp))
        InfoRow("Valor", Format.money(p.valor))
        InfoRow("Prazo", "${p.parcelas} parcelas")
        InfoRow("Parcela", Format.money(p.parcelaMensal))
        InfoRow("Margem", "Bloqueada por 48h")
        Spacer(Modifier.height(4.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onCancel) {
                Text("Cancelar solicitação", color = DangerRed, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private fun formatDate(millis: Long): String {
    val fmt = SimpleDateFormat("dd/MM 'às' HH:mm", Locale("pt", "BR"))
    return fmt.format(Date(millis))
}
