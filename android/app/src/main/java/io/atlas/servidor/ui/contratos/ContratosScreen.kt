package io.atlas.servidor.ui.contratos

import android.content.Intent
import android.net.Uri
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
                ContratosContent(info)
            }
        }
    }
}

@Composable
private fun ContratosContent(info: MatriculaInfoDto) {
    var tab by remember { mutableIntStateOf(0) }
    var lerContrato by remember { mutableStateOf<ContratoDto?>(null) }
    val saldoById = info.elegiveisPortabilidade.associate { it.id to it.saldoDevedor }
    val ativos = info.contratos.filter { !it.status.equals("Quitado", ignoreCase = true) }
    val historico = info.contratos.filter { it.status.equals("Quitado", ignoreCase = true) }
    val visible = if (tab == 0) ativos else historico

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
        TabRow(selectedTabIndex = tab, containerColor = Fundo, contentColor = Verde) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Ativos (${ativos.size})") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Histórico (${historico.size})") })
        }
        Spacer(Modifier.height(16.dp))

        if (visible.isEmpty()) {
            Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                Text(
                    if (tab == 0) "Você não tem contratos ativos." else "Nenhum contrato quitado.",
                    color = InkMuted,
                    fontSize = 14.sp,
                )
            }
        } else {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                visible.forEach { c ->
                    ContratoCard(c, saldoById[c.id], onLer = { lerContrato = c })
                    Spacer(Modifier.height(12.dp))
                }
                Spacer(Modifier.height(24.dp))
            }
        }
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
        InfoRow("Parcela", Format.money(c.parcela))
        if (saldoDevedor != null) {
            InfoRow("Saldo devedor", Format.money(saldoDevedor))
        } else {
            InfoRow("Valor financiado", Format.money(c.valorFinanciado))
        }
        InfoRow("Taxa", Format.rateAm(c.taxaAm))
        InfoRow("Próxima parcela", c.proximaParcela ?: "—")
        Spacer(Modifier.height(8.dp))
        Text(
            "${c.parcelasPagas} de ${c.total} parcelas pagas",
            color = Verde,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(12.dp))
        AtlasSecondaryButton(text = "Ler contrato", onClick = onLer)
    }
}

@Composable
private fun ContratoDialog(c: ContratoDto, nome: String, orgao: String, onVoltar: () -> Unit) {
    val context = LocalContext.current
    fun baixar() {
        // Abre o comprovante (PDF) do contrato no navegador. pdfUrl é relativo à API.
        val base = io.atlas.servidor.BuildConfig.API_BASE_URL.trimEnd('/')
        val rel = (c.pdfUrl ?: "/v1/portal/banco/contratos/${c.id}/comprovante.pdf").trimStart('/')
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("$base/$rel")))
        }
    }
    AlertDialog(
        onDismissRequest = onVoltar,
        containerColor = Superficie,
        title = { Text("Contrato ${c.id}", fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            Column {
                InfoRow("Banco credor", c.banco)
                InfoRow("Situação", c.status)
                InfoRow("Servidor", nome)
                InfoRow("Órgão", orgao)
                InfoRow("Valor financiado", Format.money(c.valorFinanciado))
                InfoRow("Taxa", Format.rateAm(c.taxaAm))
                InfoRow("Parcela", Format.money(c.parcela))
                InfoRow("Parcelas", "${c.parcelasPagas} de ${c.total} pagas")
                InfoRow("Próxima parcela", c.proximaParcela ?: "—")
            }
        },
        confirmButton = {
            TextButton(onClick = { baixar() }) {
                Text("Baixar contrato", color = Verde, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onVoltar) {
                Text("Voltar", color = InkMuted, fontWeight = FontWeight.SemiBold)
            }
        },
    )
}
