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
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.DangerRed
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
            "Traga seus empréstimos de outros bancos para o Banco Atlas e pague menos juros.",
            color = InkMuted,
            fontSize = 14.sp,
        )
        Spacer(Modifier.height(16.dp))

        if (vm.emprestimoEmAnalise) {
            AtlasCard {
                StatusChip("Em análise", ChipTone.Ambar)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Você tem um empréstimo ou portabilidade em análise. A margem de empréstimo " +
                        "consignado está reservada — aguarde a resposta do banco para solicitar uma portabilidade.",
                    color = InkMuted,
                    fontSize = 13.sp,
                )
            }
            Spacer(Modifier.height(16.dp))
        }
        vm.submitError?.let {
            Text(it, color = DangerRed, fontSize = 13.sp)
            Spacer(Modifier.height(12.dp))
        }

        when (val s = vm.state) {
            is UiState.Loading -> LoadingBox()
            is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() })
            is UiState.Success -> {
                if (s.data.isEmpty()) {
                    AtlasCard {
                        Text("Nenhum empréstimo encontrado", color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "Não encontramos empréstimos de outros bancos na sua matrícula. Quando a " +
                                "prefeitura importar seus contratos, eles aparecem aqui para portabilidade.",
                            color = InkMuted,
                            fontSize = 13.sp,
                        )
                    }
                } else {
                    Text("Seus contratos em outros bancos", color = InkMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(12.dp))
                    s.data.forEach { e ->
                        ElegivelCard(
                            e = e,
                            bloqueado = vm.emprestimoEmAnalise,
                            onPortar = { alvo = e },
                        )
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun ElegivelCard(e: ElegivelDto, bloqueado: Boolean, onPortar: () -> Unit) {
    AtlasCard {
        Column {
            Text(e.banco, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(2.dp))
            StatusChip(e.tipo, ChipTone.Neutro)
            Spacer(Modifier.height(10.dp))
            InfoRow("Saldo devedor", Format.money(e.saldoDevedor))
            InfoRow("Parcela atual", Format.money(e.parcela))
            // Parcelas pagas (quando a planilha da prefeitura traz o total): pagas/total, ex. 20/60.
            if (e.totalParcelas > 0) {
                InfoRow("Parcelas pagas", "${(e.totalParcelas - e.parcelasRestantes).coerceAtLeast(0)}/${e.totalParcelas}")
            }
            InfoRow("Parcelas restantes", "${e.parcelasRestantes}")
            Spacer(Modifier.height(12.dp))
            AtlasPrimaryButton("Solicitar Portabilidade", onClick = onPortar, enabled = !bloqueado)
        }
    }
}

@Composable
private fun TermoPortabilidade(
    e: ElegivelDto,
    onAceitar: () -> Unit,
    onCancelar: () -> Unit,
) {
    // Texto oficial vem da tela Termos de aceite da averbadora (variáveis substituídas).
    val corpoTermo = io.atlas.servidor.ui.components.rememberTermoCorpo(
        tipo = "portabilidade",
        vars = mapOf(
            "banco" to e.banco,
            "saldoDevedor" to Format.money(e.saldoDevedor),
            "parcela" to Format.money(e.parcela),
            "parcelas" to e.parcelasRestantes.toString(),
            "tipoLabel" to e.tipo,
        ),
    )
    AlertDialog(
        onDismissRequest = onCancelar,
        containerColor = Superficie,
        title = { Text("Solicitar portabilidade", fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            // Rola dentro do diálogo — o termo oficial é longo e estava sendo cortado.
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Text(
                    "Você está solicitando a portabilidade do contrato de ${e.banco} (saldo devedor " +
                        "${Format.money(e.saldoDevedor)}) para o Banco Atlas.",
                    color = InkMuted,
                    fontSize = 14.sp,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    // Termo oficial da averbadora (/averbadora/termos → portabilidade), com **negrito**.
                    io.atlas.servidor.ui.components.markdownParaTexto(corpoTermo ?: "⚠️ Ao confirmar, a sua margem de empréstimo consignado será bloqueada por até " +
                        "5 dias enquanto o banco analisa. Você autoriza o Banco Atlas a entrar em contato " +
                        "para concluir a portabilidade — a mesma regra de quando você solicita um empréstimo."),
                    color = Ambar,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(
                onClick = onAceitar,
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Verde, contentColor = Superficie),
            ) { Text("Autorizar e solicitar", fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            TextButton(onClick = onCancelar) { Text("Cancelar", color = InkMuted, fontWeight = FontWeight.SemiBold) }
        },
    )
}
