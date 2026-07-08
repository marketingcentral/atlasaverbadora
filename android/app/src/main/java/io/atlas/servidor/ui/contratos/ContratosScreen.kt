package io.atlas.servidor.ui.contratos

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.animateContentSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.material3.Surface
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Divider
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.ContratoDto
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.PropostaDto
import io.atlas.servidor.ui.components.terminalHistorico
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.InfoRow
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.shell.HomeViewModel
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

@Composable
fun ContratosScreen(vm: HomeViewModel) {
    when (val s = vm.matriculasState) {
        is UiState.Loading -> LoadingBox(Modifier.background(Fundo))
        is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() }, modifier = Modifier.background(Fundo))
        is UiState.Success -> {
            val info = vm.current()
            if (info == null) {
                ErrorBox("Nenhuma matrícula ativa.", onRetry = null, modifier = Modifier.background(Fundo))
            } else {
                // Recusadas/expiradas/canceladas vêm da lista de propostas → Histórico.
                val recusadas = vm.propostas.filter { terminalHistorico(it.situacao) }
                ContratosContent(info, recusadas)
            }
        }
    }
}

@Composable
private fun ContratosContent(info: MatriculaInfoDto, recusadas: List<PropostaDto>) {
    var tab by remember { mutableIntStateOf(0) }
    var lerContrato by remember { mutableStateOf<ContratoDto?>(null) }
    val saldoById = info.elegiveisPortabilidade.associate { it.id to it.saldoDevedor }
    val ativos = info.contratos.filter { !it.status.equals("Quitado", ignoreCase = true) }
    val quitados = info.contratos.filter { it.status.equals("Quitado", ignoreCase = true) }
    val histCount = quitados.size + recusadas.size

    lerContrato?.let { c ->
        ContratoDialog(c = c, nome = info.nome, orgao = info.prefeitura, onVoltar = { lerContrato = null })
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Text("Contratos", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
        Spacer(Modifier.height(12.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(Superficie)
                .padding(4.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            SegButton("Ativos (${ativos.size})", tab == 0, Modifier.weight(1f)) { tab = 0 }
            SegButton("Histórico ($histCount)", tab == 1, Modifier.weight(1f)) { tab = 1 }
        }
        Spacer(Modifier.height(16.dp))

        if (tab == 0) {
            if (ativos.isEmpty()) {
                EmptyHint("Você não tem contratos ativos.")
            } else {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    ativos.forEach { c ->
                        ContratoCard(c, saldoById[c.id], onLer = { lerContrato = c })
                        Spacer(Modifier.height(12.dp))
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        } else {
            if (histCount == 0) {
                EmptyHint("Nenhum contrato no histórico.")
            } else {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    // Recusadas/expiradas primeiro (mais recentes), depois os quitados.
                    recusadas.reversed().forEach { p ->
                        RecusadaCard(p)
                        Spacer(Modifier.height(12.dp))
                    }
                    quitados.forEach { c ->
                        ContratoCard(c, saldoById[c.id], onLer = { lerContrato = c })
                        Spacer(Modifier.height(12.dp))
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun EmptyHint(text: String) {
    Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
        Text(text, color = InkMuted, fontSize = 14.sp)
    }
}

/** Card de proposta recusada/expirada/cancelada no Histórico, com sanfona do andamento. */
@Composable
private fun RecusadaCard(p: PropostaDto) {
    var expandido by remember { mutableStateOf(false) }
    val fase = io.atlas.servidor.ui.components.faseChain(p.situacao ?: "—", p.folhaStatus, p.folhaMotivo)
    AtlasCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Proposta ${p.id}", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text(p.banco ?: "Banco Atlas", color = InkMuted, fontSize = 13.sp)
            }
            StatusChip(recusaRotulo(p.situacao), ChipTone.Neutro)
        }
        Spacer(Modifier.height(12.dp))
        Divider(color = io.atlas.servidor.ui.theme.Divider)
        Spacer(Modifier.height(10.dp))
        InfoRow("Valor", Format.money(p.valor))
        InfoRow("Parcela", "${p.parcelas}x de ${Format.money(p.parcela)}")
        p.data?.let { InfoRow("Solicitada em", it) }
        Spacer(Modifier.height(6.dp))
        // Sanfona: "Ver andamento" expande a linha do tempo das pré-análises.
        Column(Modifier.animateContentSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().clickable { expandido = !expandido },
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    if (expandido) "Ocultar andamento" else "Ver andamento",
                    color = Verde,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                )
                androidx.compose.material3.Icon(
                    imageVector = if (expandido) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = null,
                    tint = Verde,
                )
            }
            if (expandido) {
                Spacer(Modifier.height(12.dp))
                io.atlas.servidor.ui.components.FaseTimeline(fase)
            }
        }
    }
}

private fun recusaRotulo(situacao: String?): String {
    val s = (situacao ?: "").lowercase()
    return when {
        s.contains("expir") -> "Expirada"
        s.contains("cancel") -> "Cancelada"
        s.contains("suspens") -> "Suspensa"
        else -> "Recusada"
    }
}

@Composable
private fun SegButton(text: String, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Surface(
        modifier = modifier.clip(RoundedCornerShape(9.dp)).clickable(onClick = onClick),
        color = if (selected) Verde else Superficie,
        shape = RoundedCornerShape(9.dp),
    ) {
        Text(
            text,
            color = if (selected) Superficie else InkMuted,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(vertical = 9.dp),
        )
    }
}

@Composable
private fun ContratoCard(c: ContratoDto, saldoDevedor: Double?, onLer: () -> Unit) {
    val tone = when {
        c.status.equals("Quitado", ignoreCase = true) -> ChipTone.Neutro
        c.status.equals("Averbado", ignoreCase = true) -> ChipTone.Ambar
        else -> ChipTone.Verde
    }
    AtlasCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("Contrato ${c.id}", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text(c.banco, color = InkMuted, fontSize = 13.sp)
            }
            StatusChip(c.status, tone)
        }
        Spacer(Modifier.height(14.dp))
        Divider(color = io.atlas.servidor.ui.theme.Divider)
        Spacer(Modifier.height(10.dp))
        val quitado = c.status.equals("Quitado", ignoreCase = true)
        val atual = if (quitado) c.total else (c.parcelasPagas + 1).coerceAtMost(c.total)
        val faltam = (c.total - c.parcelasPagas).coerceAtLeast(0)
        InfoRow("Parcela", Format.money(c.parcela))
        // Qual parcela está sendo paga, sobre o total (ex.: 1/120).
        InfoRow("Parcela atual", "$atual/${c.total}", valueColor = Verde)
        InfoRow("Próxima parcela", c.proximaParcela ?: "—")
        InfoRow("Taxa", Format.rateAm(c.taxaAm))
        if (saldoDevedor != null) {
            InfoRow("Saldo devedor", Format.money(saldoDevedor))
        } else {
            InfoRow("Valor financiado", Format.money(c.valorFinanciado))
        }
        Spacer(Modifier.height(10.dp))
        // Barra de progresso das parcelas pagas.
        val pct = if (c.total > 0) (c.parcelasPagas.toFloat() / c.total).coerceIn(0f, 1f) else 0f
        Box(
            Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(999.dp))
                .background(io.atlas.servidor.ui.theme.Divider),
        ) {
            Box(
                Modifier.fillMaxWidth(pct).height(6.dp).clip(RoundedCornerShape(999.dp)).background(Verde),
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            if (quitado) "${c.total} de ${c.total} parcelas pagas · quitado"
            else "Faltam $faltam de ${c.total} parcelas",
            color = if (quitado) Verde else InkMuted,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(12.dp))
        AtlasSecondaryButton(text = "Ver contrato", onClick = onLer)
    }
}

@Composable
private fun ContratoDialog(c: ContratoDto, nome: String, orgao: String, onVoltar: () -> Unit) {
    val context = LocalContext.current
    val temAnexo = !c.anexoUrl.isNullOrBlank()
    val quitado = c.status.equals("Quitado", ignoreCase = true)
    val atual = if (quitado) c.total else (c.parcelasPagas + 1).coerceAtMost(c.total)
    fun abrirAnexo() {
        // Documento do contrato anexado pelo banco — abre no visualizador do dispositivo.
        c.anexoUrl?.let { url ->
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
        }
    }
    AlertDialog(
        onDismissRequest = onVoltar,
        containerColor = Superficie,
        title = { Text("Contrato ${c.id}", fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                InfoRow("Banco credor", c.banco)
                InfoRow("Situação", c.status)
                InfoRow("Servidor", nome)
                InfoRow("Órgão", orgao)
                Spacer(Modifier.height(6.dp))
                Divider(color = io.atlas.servidor.ui.theme.Divider)
                Spacer(Modifier.height(6.dp))
                InfoRow("Valor financiado", Format.money(c.valorFinanciado))
                InfoRow("Taxa", Format.rateAm(c.taxaAm))
                InfoRow("Parcela", Format.money(c.parcela))
                InfoRow("Parcela atual", "$atual/${c.total}", valueColor = Verde)
                InfoRow("Próxima parcela", c.proximaParcela ?: "—")
                Spacer(Modifier.height(12.dp))
                if (temAnexo) {
                    Text(
                        "Documento oficial do contrato disponibilizado pelo banco.",
                        color = InkMuted,
                        fontSize = 12.sp,
                    )
                } else {
                    Surface(
                        color = io.atlas.servidor.ui.theme.AmbarSoft,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            "O documento oficial assinado será anexado pelo banco e aparecerá " +
                                "aqui para você visualizar. Por enquanto, mostramos os dados da operação.",
                            color = Ink,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {
            if (temAnexo) {
                TextButton(onClick = { abrirAnexo() }) {
                    Text("Abrir documento", color = Verde, fontWeight = FontWeight.Bold)
                }
            } else {
                TextButton(onClick = onVoltar) {
                    Text("Fechar", color = Verde, fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = if (temAnexo) {
            { TextButton(onClick = onVoltar) { Text("Voltar", color = InkMuted, fontWeight = FontWeight.SemiBold) } }
        } else null,
    )
}
