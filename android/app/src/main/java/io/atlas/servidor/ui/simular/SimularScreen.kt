package io.atlas.servidor.ui.simular

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.navigation.Produtos
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
    produto: String,
    onSolicitado: () -> Unit,
    onVoltar: () -> Unit,
    vm: SimularViewModel = viewModel(),
) {
    // Fixa o produto (empréstimo ou cartão de crédito) antes de simular.
    LaunchedEffect(produto) { vm.selecionarProduto(produto) }

    when {
        vm.loading -> LoadingBox(Modifier.background(Fundo))
        vm.error != null -> ErrorBox(vm.error!!, onRetry = { vm.load() }, modifier = Modifier.background(Fundo))
        else -> {
            // Bloqueia SÓ se o servidor tem uma proposta deste produto em análise (fonte única,
            // inclusive criada na web). Não usamos trava local — ela ficava presa no aparelho e
            // travava o produto mesmo depois de a proposta ser limpa no servidor.
            if (vm.pendenteDoProduto) {
                MargemTravadaLock(remainingMs = 0L, onVerAnalise = onSolicitado)
            } else if (produto == Produtos.CARTAO_CONSIGNADO) {
                // Cartão tem fluxo próprio (limite/fatura), igual à web — não é simulador de parcelas.
                CartaoConsignadoView(vm, onSolicitado, onVoltar)
            } else {
                Simulador(vm, onSolicitado, onVoltar)
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
            "Você já tem uma solicitação deste produto em análise. A margem fica bloqueada até " +
                "o banco decidir ou a liberação automática em 48h.",
            color = InkMuted,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
        if (remainingMs > 0) {
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
        }
        Spacer(Modifier.height(24.dp))
        AtlasPrimaryButton("Acompanhar análise", onClick = onVerAnalise)
    }
}

@Composable
private fun Simulador(vm: SimularViewModel, onSolicitado: () -> Unit, onVoltar: () -> Unit) {
    var showTermo by remember { mutableStateOf(false) }
    val result = vm.result()
    // Sem margem consignável disponível → não é permitido simular/solicitar.
    if (vm.margemDisponivel < 0.01) {
        SemMargemView(vm.produtoLabel, onVoltar)
        return
    }

    if (showTermo) {
        TermoDialog(
            produtoLabel = vm.produtoLabel,
            valor = result.valor,
            parcelas = result.parcelas,
            parcela = result.parcelaMensal,
            taxaAm = vm.taxaAm,
            onAceitar = { showTermo = false; vm.solicitar(onSolicitado) },
            onCancelar = { showTermo = false },
        )
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        VoltarLink(onVoltar)
        Spacer(Modifier.height(8.dp))
        Text("Simular", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        Text(vm.produtoLabel, color = InkMuted, fontSize = 14.sp)
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
        // 4 por linha, alinhadas na largura da tela (sem rolagem horizontal).
        PARCELA_OPTIONS.chunked(4).forEach { linha ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                linha.forEach { p ->
                    FilterChip(
                        selected = vm.parcelas == p,
                        onClick = { vm.updateParcelas(p) },
                        label = {
                            Text("${p}×", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Verde,
                            selectedLabelColor = Superficie,
                        ),
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
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
            onClick = { showTermo = true },
            enabled = result.cabeNaMargem && vm.valor >= 500.0,
            loading = vm.submitting,
        )
        if (!result.cabeNaMargem) {
            Spacer(Modifier.height(10.dp))
            Text(
                "A parcela ultrapassa sua margem disponível (${Format.money(vm.margemDisponivel)}). " +
                    "Reduza o valor ou aumente o número de parcelas.",
                color = io.atlas.servidor.ui.theme.DangerRed,
                fontSize = 13.sp,
            )
        }
        vm.submitError?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, color = io.atlas.servidor.ui.theme.DangerRed, fontSize = 13.sp)
        }
        Spacer(Modifier.height(24.dp))
    }
}

/** Solicitação de Cartão de Crédito Consignado — fluxo próprio (limite/fatura mínima),
 *  igual à web (`solicitar-cartao.tsx`). Não é simulador de parcelas. */
@Composable
private fun CartaoConsignadoView(vm: SimularViewModel, onSolicitado: () -> Unit, onVoltar: () -> Unit) {
    val margem = vm.margemCartaoConsignado
    Column(
        modifier = Modifier.fillMaxSize().background(Fundo).verticalScroll(rememberScrollState()).padding(20.dp),
    ) {
        VoltarLink(onVoltar)
        Spacer(Modifier.height(8.dp))
        Text("Solicitar cartão", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        Text("Cartão de Crédito Consignado", color = InkMuted, fontSize = 14.sp)
        Spacer(Modifier.height(6.dp))
        Text(
            "Cartão de crédito com fatura mínima descontada em folha. Você usa como um cartão " +
                "normal — a fatura mínima sai automaticamente do seu contracheque.",
            color = InkMuted,
            fontSize = 13.sp,
            lineHeight = 18.sp,
        )

        Spacer(Modifier.height(20.dp))
        // Margem cartão consignado
        AtlasCard {
            Text("SUA MARGEM CARTÃO CONSIGNADO", color = InkMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(
                Format.money(margem),
                color = if (margem <= 0) io.atlas.servidor.ui.theme.DangerRed else Verde,
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Margem mensal para a fatura mínima. Fixada por regulação em 5% do salário líquido.",
                color = InkMuted,
                fontSize = 12.sp,
                lineHeight = 16.sp,
            )
        }

        if (margem <= 0) {
            Spacer(Modifier.height(16.dp))
            AtlasCard {
                Text("Sem margem disponível", color = io.atlas.servidor.ui.theme.DangerRed, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Sua margem de cartão consignado está zerada nesta matrícula. Não é possível " +
                        "solicitar agora — você já tem uma solicitação em análise ou um cartão ativo.",
                    color = InkMuted,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                )
            }
        } else {
            Spacer(Modifier.height(16.dp))
            // Limite proposto
            AtlasCard {
                Text("LIMITE PROPOSTO", color = InkMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                Text(Format.money(vm.limiteCartao), color = Ink, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Estimado a partir da sua margem disponível. O Banco Atlas pode ajustar o limite " +
                        "após análise interna de crédito.",
                    color = InkMuted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                )
            }

            Spacer(Modifier.height(16.dp))
            AtlasCard {
                Text(
                    "Ao solicitar, o Banco Atlas recebe seu pedido e entra em contato para emitir e " +
                        "ativar o cartão. A margem só é comprometida quando o banco confirma — nada é " +
                        "descontado agora.",
                    color = InkMuted,
                    fontSize = 12.5.sp,
                    lineHeight = 17.sp,
                )
            }

            vm.submitError?.let {
                Spacer(Modifier.height(10.dp))
                Text(it, color = io.atlas.servidor.ui.theme.DangerRed, fontSize = 13.sp)
            }

            Spacer(Modifier.height(20.dp))
            AtlasPrimaryButton(
                text = "Solicitar Cartão Consignado",
                onClick = { vm.solicitarCartao(onSolicitado) },
                loading = vm.submitting,
            )
        }
        Spacer(Modifier.height(24.dp))
    }
}

/** Link "‹ Voltar" — o simulador não é mais uma aba, precisa de saída explícita. */
@Composable
private fun VoltarLink(onVoltar: () -> Unit) {
    Text(
        "‹ Voltar",
        color = Verde,
        fontSize = 15.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onVoltar)
            .padding(vertical = 6.dp, horizontal = 2.dp),
    )
}

@Composable
private fun SemMargemView(produtoLabel: String, onVoltar: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(Fundo).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Column(Modifier.fillMaxWidth()) {
            VoltarLink(onVoltar)
            Spacer(Modifier.height(8.dp))
            Text("Simular", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
            Text(produtoLabel, color = InkMuted, fontSize = 14.sp)
        }
        Spacer(Modifier.height(48.dp))
        Text("🔒", fontSize = 44.sp)
        Spacer(Modifier.height(16.dp))
        Text(
            "Sem margem disponível",
            color = Ink,
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Você não tem margem disponível para $produtoLabel. " +
                "A margem é liberada conforme seus contratos são quitados.",
            color = InkMuted,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun TermoDialog(
    produtoLabel: String,
    valor: Double,
    parcelas: Int,
    parcela: Double,
    taxaAm: Double,
    onAceitar: () -> Unit,
    onCancelar: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onCancelar,
        containerColor = Superficie,
        title = { Text("Termo de solicitação", fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            androidx.compose.foundation.layout.Column {
                Text(
                    "Você está solicitando $produtoLabel junto ao Banco Atlas:",
                    color = InkMuted,
                    fontSize = 14.sp,
                )
                Spacer(Modifier.height(12.dp))
                io.atlas.servidor.ui.components.InfoRow("Valor", Format.money(valor))
                io.atlas.servidor.ui.components.InfoRow("Parcelas", "$parcelas× de ${Format.money(parcela)}")
                io.atlas.servidor.ui.components.InfoRow("Taxa", Format.rateAm(taxaAm))
                Spacer(Modifier.height(12.dp))
                Text(
                    "Ao aceitar, este valor será reservado e sua margem ficará BLOQUEADA por 48h " +
                        "(uma pré-reserva por vez). A taxa é mensal e inclui o CET (juros, IOF e tarifas). " +
                        "O contrato definitivo é disponibilizado pelo banco após a aprovação. Este aceite é " +
                        "registrado com data, hora e CPF para fins de auditoria (LGPD).",
                    color = InkMuted,
                    fontSize = 12.5.sp,
                )
            }
        },
        confirmButton = {
            androidx.compose.material3.Button(
                onClick = onAceitar,
                shape = RoundedCornerShape(12.dp),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = Verde,
                    contentColor = Superficie,
                ),
            ) {
                Text("Aceitar e reservar", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onCancelar) {
                Text("Cancelar", color = InkMuted, fontWeight = FontWeight.SemiBold)
            }
        },
    )
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
