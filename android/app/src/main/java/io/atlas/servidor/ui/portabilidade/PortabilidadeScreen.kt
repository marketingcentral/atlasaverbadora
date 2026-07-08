package io.atlas.servidor.ui.portabilidade

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.ElegivelDto
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.BackHeader
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.InfoRow
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

@Composable
fun PortabilidadeScreen(
    onBack: () -> Unit,
    onSolicitado: () -> Unit,
    vm: PortabilidadeViewModel = viewModel(),
) {
    var alvo by remember { mutableStateOf<ElegivelDto?>(null) }

    alvo?.let { e ->
        TermoPortabilidade(
            e = e,
            novaParcela = vm.novaParcela(e),
            taxaAtlas = vm.taxaAtlas,
            onAceitar = { alvo = null; vm.solicitar(e, onSolicitado) },
            onCancelar = { alvo = null },
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(Fundo).verticalScroll(rememberScrollState()).padding(20.dp),
    ) {
        BackHeader("Portabilidade", onBack)
        Spacer(Modifier.height(8.dp))
        Text(
            "Traga um contrato de outro banco para o Banco Atlas com taxa menor e reduza a parcela.",
            color = InkMuted,
            fontSize = 14.sp,
        )
        Spacer(Modifier.height(20.dp))

        when (val s = vm.state) {
            is UiState.Loading -> LoadingBox()
            is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() })
            is UiState.Success -> {
                if (s.data.isEmpty()) {
                    Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        Text("Nenhum contrato elegível para portabilidade nesta matrícula.", color = InkMuted, fontSize = 14.sp)
                    }
                } else {
                    s.data.forEach { e ->
                        ElegivelCard(e, vm.novaParcela(e), vm.economiaMensal(e), onPortar = { alvo = e })
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun ElegivelCard(e: ElegivelDto, novaParcela: Double, economia: Double, onPortar: () -> Unit) {
    AtlasCard {
        Column {
            Text(e.banco, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(2.dp))
            StatusChip(if (e.tipoContrato == "Refin") "Refinanciamento" else "Empréstimo", ChipTone.Neutro)
            Spacer(Modifier.height(10.dp))
            InfoRow("Saldo devedor", Format.money(e.saldoDevedor))
            InfoRow("Parcela atual", Format.money(e.parcela))
            InfoRow("Parcelas restantes", "${e.parcelasRestantes}")
            InfoRow("Parcela no Atlas", Format.money(novaParcela), valueColor = Verde)
            if (economia > 0) {
                InfoRow("Economia/mês", Format.money(economia), valueColor = Verde)
            }
            Spacer(Modifier.height(12.dp))
            AtlasPrimaryButton("Trazer para o Banco Atlas", onClick = onPortar)
        }
    }
}

@Composable
private fun TermoPortabilidade(
    e: ElegivelDto,
    novaParcela: Double,
    taxaAtlas: Double,
    onAceitar: () -> Unit,
    onCancelar: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onCancelar,
        containerColor = Superficie,
        title = { Text("Portabilidade", fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            Column {
                Text("Você está solicitando a portabilidade do contrato de ${e.banco} para o Banco Atlas:", color = InkMuted, fontSize = 14.sp)
                Spacer(Modifier.height(10.dp))
                InfoRow("Saldo devedor", Format.money(e.saldoDevedor))
                InfoRow("Parcelas", "${e.parcelasRestantes}× de ${Format.money(novaParcela)}")
                InfoRow("Taxa Atlas", Format.rateAm(taxaAtlas))
                Spacer(Modifier.height(10.dp))
                Text(
                    "Ao aceitar, a solicitação é enviada ao Banco Atlas e sua margem fica reservada por 48h. " +
                        "O banco de origem tem prazo para informar o saldo; a taxa inclui o CET.",
                    color = InkMuted,
                    fontSize = 12.5.sp,
                )
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(
                onClick = onAceitar,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Verde, contentColor = Superficie),
            ) { Text("Aceitar e solicitar", fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            TextButton(onClick = onCancelar) { Text("Cancelar", color = InkMuted, fontWeight = FontWeight.SemiBold) }
        },
    )
}
