package io.atlas.servidor.ui.inicio

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.OfertaDto
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.ChipTone
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.components.StaleBanner
import io.atlas.servidor.ui.components.StatusChip
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.shell.HomeViewModel
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeSoft
import java.util.Calendar

@Composable
fun InicioScreen(
    vm: HomeViewModel,
    onOpenSimular: () -> Unit,
    onOpenMargem: () -> Unit,
    onOpenAnalise: () -> Unit,
) {
    when (val s = vm.matriculasState) {
        is UiState.Loading -> LoadingBox(Modifier.background(Fundo))
        is UiState.Error -> ErrorBox(s.message, onRetry = { vm.load() }, modifier = Modifier.background(Fundo))
        is UiState.Success -> {
            val info = vm.current()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Fundo)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
            ) {
                Header(name = vm.userName)
                Spacer(Modifier.height(20.dp))

                if (s.stale) {
                    StaleBanner("Sem conexão — exibindo dados salvos.")
                    Spacer(Modifier.height(14.dp))
                }

                if (info != null) {
                    MargemCard(info, onOpenMargem)
                    Spacer(Modifier.height(24.dp))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SectionLabel("Ofertas para sua margem")
                    Text(
                        text = "Ver análise",
                        color = Verde,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clip(RoundedCornerShape(6.dp)).padding(4.dp),
                    )
                }
                Spacer(Modifier.height(12.dp))

                OfertasBlock(vm, onOpenSimular)

                Spacer(Modifier.height(12.dp))
                Text(
                    "Acompanhe suas solicitações em Análise.",
                    color = InkMuted,
                    fontSize = 12.sp,
                )
                Spacer(Modifier.height(8.dp))
                AtlasPrimaryButton(text = "Acompanhar análise", onClick = onOpenAnalise)
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun Header(name: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(greeting(), color = InkMuted, fontSize = 14.sp)
            Text(name, color = Ink, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        }
        Box(
            modifier = Modifier.size(46.dp).clip(CircleShape).background(VerdeSoft),
            contentAlignment = Alignment.Center,
        ) {
            Text(initials(name), color = Verde, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun MargemCard(info: MatriculaInfoDto, onOpenMargem: () -> Unit) {
    val m = info.margem.margem
    Surface(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)),
        color = Ink,
    ) {
        Column(Modifier.padding(20.dp)) {
            Text("Margem disponível", color = Superficie.copy(alpha = 0.7f), fontSize = 13.sp)
            Spacer(Modifier.height(6.dp))
            Text(
                Format.money(m.disponivel),
                color = Superficie,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "de ${Format.money(m.salarioBase * 0.35)} (35%)",
                color = Superficie.copy(alpha = 0.7f),
                fontSize = 13.sp,
            )
            Spacer(Modifier.height(16.dp))
            LinearProgressIndicator(
                progress = m.percentualUso.toFloat().coerceIn(0f, 1f),
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
                color = Verde,
                trackColor = Superficie.copy(alpha = 0.2f),
            )
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Em uso ${Format.money(m.comprometido)}", color = Superficie.copy(alpha = 0.8f), fontSize = 12.sp)
                Text(
                    "Ver detalhes",
                    color = Verde,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clip(RoundedCornerShape(6.dp)).padding(2.dp),
                )
            }
        }
    }
}

@Composable
private fun OfertasBlock(vm: HomeViewModel, onOpenSimular: () -> Unit) {
    when (val o = vm.ofertasState) {
        is UiState.Loading -> {
            Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                Text("Carregando ofertas…", color = InkMuted, fontSize = 13.sp)
            }
        }
        is UiState.Error -> {
            AtlasCard { Text(o.message, color = InkMuted, fontSize = 13.sp) }
        }
        is UiState.Success -> {
            val ofertas = o.data.ofertas
            if (ofertas.isEmpty()) {
                AtlasCard { Text("Nenhuma oferta vigente no momento.", color = InkMuted, fontSize = 14.sp) }
            } else {
                Column {
                    ofertas.forEach { oferta ->
                        OfertaCard(oferta, onOpenSimular)
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun OfertaCard(oferta: OfertaDto, onSimular: () -> Unit) {
    AtlasCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(oferta.bancoNome, color = Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text(
                    "${oferta.cidade} · até ${oferta.prazoMaxMeses}×",
                    color = InkMuted,
                    fontSize = 13.sp,
                )
            }
            StatusChip("A partir de ${Format.rateAm(oferta.taxaMinAm)}", ChipTone.Verde)
        }
        Spacer(Modifier.height(14.dp))
        AtlasPrimaryButton(text = "Simular", onClick = onSimular)
    }
}

private fun greeting(): String {
    val h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    return when {
        h < 12 -> "Bom dia,"
        h < 18 -> "Boa tarde,"
        else -> "Boa noite,"
    }
}

private fun initials(name: String): String {
    val parts = name.trim().split(" ").filter { it.isNotBlank() }
    if (parts.isEmpty()) return "?"
    val first = parts.first().firstOrNull()?.uppercase() ?: ""
    val last = if (parts.size > 1) parts.last().firstOrNull()?.uppercase() ?: "" else ""
    return (first + last).ifBlank { "?" }
}
