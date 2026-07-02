package io.atlas.servidor.ui.margem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.BackHeader
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.InfoRow
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

@Composable
fun MargemTravadaScreen(
    onBack: () -> Unit,
    vm: MargemViewModel = viewModel(),
) {
    val proposals by vm.proposals.observeAsState(emptyList())

    when {
        vm.loading -> LoadingBox(Modifier.background(Fundo))
        vm.error != null -> ErrorBox(vm.error!!, onRetry = { vm.load() }, modifier = Modifier.background(Fundo))
        else -> {
            val m = vm.margem
            val reservado = proposals.sumOf { it.valor }
            val bloqueada = proposals.isNotEmpty()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Fundo)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
            ) {
                BackHeader("Margem consignável", onBack)
                Spacer(Modifier.height(12.dp))

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = Ink,
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Status", color = Superficie.copy(alpha = 0.7f), fontSize = 13.sp)
                            StatusChip(
                                if (bloqueada) "Bloqueada" else "Disponível",
                                if (bloqueada) ChipTone.Ambar else ChipTone.Verde,
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            Format.money(m?.margem?.disponivel ?: 0.0),
                            color = Superficie,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        Text("margem disponível", color = Superficie.copy(alpha = 0.7f), fontSize = 13.sp)
                        if (bloqueada) {
                            Spacer(Modifier.height(12.dp))
                            Text(
                                "Valor reservado ${Format.money(reservado)} · liberação em até 48h",
                                color = Verde,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))
                if (m != null) {
                    SectionLabel("Detalhe da margem")
                    Spacer(Modifier.height(8.dp))
                    AtlasCard {
                        InfoRow("Salário base", Format.money(m.margem.salarioBase))
                        InfoRow("Comprometido", Format.money(m.margem.comprometido))
                        InfoRow("Disponível", Format.money(m.margem.disponivel))
                        InfoRow("Uso da margem", Format.percent1(m.margem.percentualUso))
                    }
                    Spacer(Modifier.height(16.dp))
                    SectionLabel("Por tipo")
                    Spacer(Modifier.height(8.dp))
                    AtlasCard {
                        m.margensPorTipo.forEach { t ->
                            InfoRow(labelForTipo(t.tipo), "${Format.money(t.disponivel)} de ${Format.money(t.total)}")
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

private fun labelForTipo(tipo: String): String = when (tipo) {
    "EMPRESTIMO" -> "Empréstimo"
    "CARTAO_CONSIGNADO" -> "Cartão consignado"
    "CARTAO_BENEFICIOS" -> "Cartão benefícios"
    else -> tipo
}
