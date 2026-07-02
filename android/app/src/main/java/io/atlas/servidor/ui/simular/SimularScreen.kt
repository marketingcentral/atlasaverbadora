package io.atlas.servidor.ui.simular

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeSoft
import kotlinx.coroutines.delay

private val PARCELA_OPTIONS = listOf(12, 24, 36, 48, 60, 72, 84, 96)

@Composable
fun SimularScreen(
    onSolicitado: () -> Unit,
    vm: SimularViewModel = viewModel(),
) {
    // Relógio de 1s para o countdown / liberação automática da trava.
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            now = System.currentTimeMillis()
            delay(1000)
        }
    }

    when {
        vm.loading -> LoadingBox(Modifier.background(Fundo))
        vm.error != null -> ErrorBox(vm.error!!, onRetry = { vm.load() }, modifier = Modifier.background(Fundo))
        else -> {
            val expiry = vm.lockExpiry()
            val locked = expiry != null && expiry > now
            if (locked) {
                MargemTravadaLock(remainingMs = expiry!! - now, onVerAnalise = onSolicitado)
            } else {
                Simulador(vm, onSolicitado)
            }
        }
    }
}

@Composable
private fun MargemTravadaLock(remainingMs: Long, onVerAnalise: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(Fundo).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        Text("⏳", fontSize = 44.sp)
        Spacer(Modifier.height(16.dp))
        Text(
            "Margem em pré-reserva",
            color = Ink,
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Sua margem está bloqueada por 48h após a última simulação. " +
                "Aguarde a liberação para iniciar uma nova.",
            color = InkMuted,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            color = Ink,
        ) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Liberação da margem em", color = Superficie.copy(alpha = 0.7f), fontSize = 13.sp)
                Spacer(Modifier.height(6.dp))
                Text(
                    formatRemaining(remainingMs),
                    color = Ambar,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
        AtlasPrimaryButton("Acompanhar análise", onClick = onVerAnalise)
    }
}

@Composable
private fun Simulador(vm: SimularViewModel, onSolicitado: () -> Unit) {
    val result = vm.result()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text("Simular empréstimo", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        Spacer(Modifier.height(16.dp))

        SectionLabel("Banco")
        Spacer(Modifier.height(8.dp))
        Surface(shape = RoundedCornerShape(999.dp), color = VerdeSoft) {
            Text(
                "Banco Atlas",
                color = Verde,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
            )
        }

        Spacer(Modifier.height(20.dp))
        SectionLabel("Valor desejado")
        Spacer(Modifier.height(6.dp))
        Text(Format.money(vm.valor), color = Ink, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
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
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
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
        Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), color = Ink) {
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
                Text(Format.money(result.parcelaMensal), color = Superficie, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    "em ${result.parcelas} parcelas fixas · ${Format.rateAm(vm.taxaAm)}",
                    color = Superficie.copy(alpha = 0.7f),
                    fontSize = 13.sp,
                )
                Spacer(Modifier.height(10.dp))
                Text("Total a pagar ${Format.money(result.totalPago)}", color = Superficie.copy(alpha = 0.85f), fontSize = 13.sp)
            }
        }

        Spacer(Modifier.height(16.dp))
        AtlasCard {
            Text("Margem disponível ${Format.money(vm.margemDisponivel)}", color = InkMuted, fontSize = 13.sp)
            Spacer(Modifier.height(4.dp))
            Text("Ao solicitar, sua margem fica bloqueada por 48h (uma pré-reserva por vez).", color = InkMuted, fontSize = 12.sp)
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

/** Formata ms restantes como "41h 23min 05s". */
private fun formatRemaining(ms: Long): String {
    if (ms <= 0) return "00h 00min 00s"
    val totalSec = ms / 1000
    val h = totalSec / 3600
    val m = (totalSec % 3600) / 60
    val s = totalSec % 60
    fun pad(n: Long) = n.toString().padStart(2, '0')
    return "${pad(h)}h ${pad(m)}min ${pad(s)}s"
}
