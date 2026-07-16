package io.atlas.servidor.ui.analise

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.PropostaDto
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.FaseTimeline
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.components.faseChain
import io.atlas.servidor.ui.components.FaseInfo
import io.atlas.servidor.ui.components.FASES
import io.atlas.servidor.ui.components.TELE_FASES
import io.atlas.servidor.ui.components.ehTelemedicina
import io.atlas.servidor.ui.components.teleFaseChain
import io.atlas.servidor.ui.components.terminalHistorico
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import java.util.Locale

/** Propostas realmente EM ANDAMENTO. Saem daqui: as concluídas (viram contrato ativo)
 *  e as recusadas/expiradas/canceladas (vão pro Histórico). */
/** Cadeia de fases da proposta — telemedicina tem a sua (averbadora + ADF). */
fun faseDe(p: PropostaDto): FaseInfo =
    if (ehTelemedicina(p.convenio, p.observacoes)) teleFaseChain(p.situacao ?: "—", p.folhaStatus, p.folhaMotivo)
    else faseChain(p.situacao ?: "—", p.folhaStatus, p.folhaMotivo)

/** Em análise = qualquer solicitação que ainda NÃO concluiu todas as etapas (a última é a
 *  ADF aprovada). Só depois de concluída ela sai daqui para Contratos Ativos. */
fun emAnaliseAtivas(propostas: List<PropostaDto>): List<PropostaDto> = propostas.filter {
    val sit = (it.situacao ?: "").lowercase()
    !terminalHistorico(it.situacao) &&
        !sit.contains("quitad") &&
        !faseDe(it).concluido
}

/** Conteúdo da aba "Em análise" (dentro de Contratos). Sem título de página — o pai já tem.
 *  `onMudou` avisa o pai (HomeViewModel) para revalidar contagens/margem após liberar. */
@Composable
fun EmAnaliseContent(vm: EmAnaliseViewModel = viewModel(), onMudou: () -> Unit = {}) {
    // Recarrega ao aparecer — reflete a decisão do banco sem botão manual.
    LaunchedEffect(Unit) { vm.load() }
    Column(Modifier.fillMaxSize()) {
        Text(
            "Solicitações enviadas ao banco. O status atualiza conforme a análise " +
                "(banco) e a aplicação em folha (prefeitura).",
            color = InkMuted,
            fontSize = 13.sp,
        )
        Spacer(Modifier.height(12.dp))

        when (val s = vm.state) {
            is UiState.Loading -> LoadingBox()
            is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() })
            is UiState.Success -> {
                val emAnalise = emAnaliseAtivas(s.data)
                val cot = vm.cotacaoTele
                if (emAnalise.isEmpty() && cot == null) {
                    Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                        Text("Você não tem solicitações em análise.", color = InkMuted, fontSize = 14.sp)
                    }
                } else {
                    Column(Modifier.verticalScroll(rememberScrollState())) {
                        cot?.let {
                            CotacaoTeleCard(it)
                            Spacer(Modifier.height(12.dp))
                        }
                        emAnalise.forEach { p ->
                            PropostaCard(p)
                            Spacer(Modifier.height(12.dp))
                        }
                        Spacer(Modifier.height(20.dp))
                    }
                }
            }
        }
    }
}

/** Nome do tipo de solicitação — pro usuário identificar o que está em análise. */
private fun tipoPropostaNome(p: PropostaDto): String {
    if (ehTelemedicina(p.convenio, p.observacoes)) return "Telemedicina"
    if (p.tipoContrato?.equals("REFIN", ignoreCase = true) == true || p.bancoOrigem != null) return "Portabilidade"
    return when (p.tipoMargem?.uppercase()) {
        "CARTAO_CONSIGNADO" -> "Cartão de Crédito Consignado"
        "CARTAO_BENEFICIOS" -> "Cartão Benefício Consignado"
        else -> if (p.tipoContrato?.equals("ECONSIGNADO", ignoreCase = true) == true) {
            "Cartão de Crédito Consignado"
        } else {
            "Empréstimo Consignado"
        }
    }
}

@Composable
private fun PropostaCard(p: PropostaDto) {
    val situacao = p.situacao ?: "—"
    val fase = faseDe(p)
    val tipoNome = tipoPropostaNome(p)
    AtlasCard {
        // Chip informativo (Em análise/Liberada/…) no TOPO, em linha única — pra todos os produtos.
        StatusChip(situacaoCurta(situacao), statusTone(situacao))
        Spacer(Modifier.height(10.dp))
        // Título = TIPO da solicitação (Empréstimo / Cartão de Crédito / Cartão Benefício / Portabilidade).
        Text(tipoNome, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text(
            "${p.banco ?: "Banco Atlas"} · ${p.id}${p.data?.let { " · criada em $it" } ?: ""}",
            color = InkMuted,
            fontSize = 12.sp,
        )

        Spacer(Modifier.height(16.dp))
        // Parcelas e taxa mensal SÓ para Empréstimo Consignado. Cartão e Portabilidade não têm.
        Row(modifier = Modifier.fillMaxWidth()) {
            when (tipoNome) {
                "Empréstimo Consignado" -> {
                    StatCol("Valor liberado", Format.money(p.valor), accent = true, modifier = Modifier.weight(1f))
                    StatCol("Parcelas", "${p.parcelas}x de ${Format.money(p.parcela)}", modifier = Modifier.weight(1f))
                    StatCol(
                        "Taxa mensal",
                        String.format(Locale("pt", "BR"), "%.2f%%", p.taxaAm),
                        modifier = Modifier.weight(1f),
                    )
                }
                "Portabilidade" -> StatCol("Saldo a portar", Format.money(p.saldoDevedorOrigem ?: p.valor), accent = true, modifier = Modifier.weight(1f))
                "Telemedicina" -> StatCol("Plano", "${Format.money(p.parcela)}/mês · 12 meses", accent = true, modifier = Modifier.weight(1f))
                else -> StatCol("Limite", Format.money(p.valor), accent = true, modifier = Modifier.weight(1f))
            }
        }

        Spacer(Modifier.height(18.dp))
        FaseTimeline(fase, if (ehTelemedicina(p.convenio, p.observacoes)) TELE_FASES else FASES)

        p.expiraEm?.takeIf { !fase.concluido && fase.falhaPasso == null }?.let {
            Spacer(Modifier.height(8.dp))
            Text("Reserva expira em $it", color = InkMuted, fontSize = 12.sp)
        }
    }
}

@Composable
private fun StatCol(label: String, value: String, modifier: Modifier = Modifier, accent: Boolean = false) {
    Column(modifier = modifier) {
        Text(
            label.uppercase(),
            color = InkMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.6.sp,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            value,
            color = if (accent) Verde else Ink,
            fontSize = 14.sp,
            fontWeight = if (accent) FontWeight.ExtraBold else FontWeight.SemiBold,
        )
    }
}

private fun statusTone(situacao: String): ChipTone {
    val s = situacao.lowercase()
    return when {
        s.contains("aguard") -> ChipTone.Ambar
        s.contains("ativo") || s.contains("averb") || s.contains("quitad") -> ChipTone.Verde
        s.contains("cancel") || s.contains("recus") || s.contains("expir") -> ChipTone.Neutro
        else -> ChipTone.Neutro
    }
}

private fun situacaoCurta(situacao: String): String {
    val s = situacao.lowercase()
    return when {
        s.contains("aguard") -> "Em análise"
        s.contains("ativo") || s.contains("averb") || s.contains("quitad") -> "Liberada"
        s.contains("expir") -> "Expirada"
        s.contains("cancel") -> "Cancelada"
        s.contains("recus") -> "Recusada"
        else -> situacao
    }
}

/** Cartão da cotação de telemedicina em análise — passo a passo próprio (não é proposta de banco). */
@Composable
private fun CotacaoTeleCard(cot: io.atlas.servidor.data.remote.dto.CotacaoTelemedicinaDto) {
    AtlasCard {
        StatusChip("Em análise", ChipTone.Ambar)
        Spacer(Modifier.height(10.dp))
        Text("Telemedicina", color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Text("Cotação · solicitada em ${cot.criadoEm.take(10)}", color = InkMuted, fontSize = 12.sp)
        Spacer(Modifier.height(18.dp))
        // Cotação ainda na averbadora → 1ª etapa ("Em Análise") é a ativa.
        FaseTimeline(FaseInfo(ativo = 0, concluido = false), TELE_FASES)
    }
}
