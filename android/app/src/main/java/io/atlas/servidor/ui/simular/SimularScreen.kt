package io.atlas.servidor.ui.simular

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.BackHeader
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.components.StatusChip
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeSoft

private val PARCELA_OPTIONS = listOf(12, 24, 36, 48, 60, 72, 84, 96)

@Composable
fun SimularScreen(
    onBack: () -> Unit,
    onSolicitado: () -> Unit,
    vm: SimularViewModel = viewModel(),
) {
    when {
        vm.loading -> LoadingBox(Modifier.background(Fundo))
        vm.error != null -> ErrorBox(vm.error!!, onRetry = { vm.load() }, modifier = Modifier.background(Fundo))
        else -> {
            val result = vm.result()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Fundo)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
            ) {
                BackHeader("Simular empréstimo", onBack)
                Spacer(Modifier.height(8.dp))

                // Bank selector
                if (vm.ofertas.isNotEmpty()) {
                    SectionLabel("Banco")
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                        vm.ofertas.forEach { o ->
                            FilterChip(
                                selected = o.bancoNome == vm.bancoNome && o.cidade == vm.cidade,
                                onClick = { vm.selectOferta(o) },
                                label = { Text("${o.bancoNome} · ${o.cidade}") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = VerdeSoft,
                                    selectedLabelColor = Verde,
                                ),
                                modifier = Modifier.padding(end = 8.dp),
                            )
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }

                // Valor
                SectionLabel("Valor desejado")
                Spacer(Modifier.height(6.dp))
                Text(
                    Format.money(vm.valor),
                    color = Ink,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
                val maxVal = maxOf(vm.valorMaximo, 500.0).toFloat()
                Slider(
                    value = vm.valor.toFloat().coerceIn(500f, maxVal),
                    onValueChange = { vm.updateValor(it.toDouble()) },
                    valueRange = 500f..maxVal,
                    colors = SliderDefaults.colors(
                        thumbColor = Verde,
                        activeTrackColor = Verde,
                        inactiveTrackColor = VerdeSoft,
                    ),
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(Format.moneyShort(500.0), color = InkMuted, fontSize = 12.sp)
                    Text("máx ${Format.moneyShort(maxVal.toDouble())}", color = InkMuted, fontSize = 12.sp)
                }

                Spacer(Modifier.height(24.dp))
                SectionLabel("Parcelas")
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    PARCELA_OPTIONS.forEach { p ->
                        FilterChip(
                            selected = vm.parcelas == p,
                            onClick = { vm.updateParcelas(p) },
                            label = { Text("${p}×") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Verde,
                                selectedLabelColor = Superficie,
                            ),
                            modifier = Modifier.padding(end = 8.dp),
                        )
                    }
                }

                Spacer(Modifier.height(24.dp))
                // Result card
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
                            Text("Parcela mensal", color = Superficie.copy(alpha = 0.7f), fontSize = 13.sp)
                            StatusChip(
                                if (result.cabeNaMargem) "Dentro da margem" else "Acima da margem",
                                if (result.cabeNaMargem) ChipTone.Verde else ChipTone.Ambar,
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            Format.money(result.parcelaMensal),
                            color = Superficie,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                        Text(
                            "em ${result.parcelas} parcelas fixas · ${Format.rateAm(vm.taxaAm)}",
                            color = Superficie.copy(alpha = 0.7f),
                            fontSize = 13.sp,
                        )
                        Spacer(Modifier.height(10.dp))
                        Text(
                            "Total a pagar ${Format.money(result.totalPago)}",
                            color = Superficie.copy(alpha = 0.85f),
                            fontSize = 13.sp,
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))
                AtlasCard {
                    Text(
                        "Margem disponível ${Format.money(vm.margemDisponivel)}",
                        color = InkMuted,
                        fontSize = 13.sp,
                    )
                }

                Spacer(Modifier.height(20.dp))
                AtlasPrimaryButton(
                    text = "Solicitar proposta",
                    onClick = { vm.solicitar(onSolicitado) },
                    enabled = result.cabeNaMargem && vm.valor >= 500.0,
                    loading = vm.submitting,
                )
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}
