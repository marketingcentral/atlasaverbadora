package io.atlas.servidor.ui.matricula

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeSoft
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun SelecionarMatriculaScreen(
    onContinue: () -> Unit,
    onBack: () -> Unit,
    vm: MatriculaSelectViewModel = viewModel(),
) {
    when (val s = vm.state) {
        is UiState.Loading -> LoadingBox(Modifier.background(Fundo))
        is UiState.Error -> ErrorBox(s.message, onRetry = vm::load, modifier = Modifier.background(Fundo))
        is UiState.Success -> {
            // O botão acompanha a lista (fica logo abaixo dos cards) em vez de ser
            // empurrado pro rodapé por um weight(1f) — com 1 matrícula ele ficava lá
            // embaixo, atrás da barra do sistema. Com muitas matrículas a tela inteira
            // rola e o botão vem no fim, naturalmente.
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Fundo)
                    .verticalScroll(rememberScrollState())
                    .systemBarsPadding() // título fora da barra de status, botão fora da de navegação
                    .padding(20.dp),
            ) {
                Text("Selecione a matrícula", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Você pode ter vínculos em mais de um órgão. Cada um tem uma margem própria.",
                    color = InkMuted,
                    fontSize = 14.sp,
                )
                Spacer(Modifier.height(20.dp))

                s.data.forEach { m ->
                    MatriculaCard(
                        info = m,
                        selected = m.matricula == vm.selected,
                        onClick = { vm.select(m.matricula) },
                    )
                    Spacer(Modifier.height(12.dp))
                }

                Spacer(Modifier.height(12.dp))
                AtlasPrimaryButton(
                    text = "Continuar",
                    onClick = { vm.confirm(onContinue) },
                    enabled = vm.selected != null,
                )
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun MatriculaCard(info: MatriculaInfoDto, selected: Boolean, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        color = if (selected) VerdeSoft else Superficie,
        border = BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Verde else Divider),
    ) {
        Column(Modifier.padding(18.dp)) {
            Text(info.cargo, color = Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Text(info.prefeitura, color = InkMuted, fontSize = 13.sp)
            Spacer(Modifier.height(12.dp))
            Text("Matrícula ${info.matricula}", color = Ink, fontSize = 14.sp)
            Spacer(Modifier.height(4.dp))
            Text(
                "Margem disponível ${Format.money(info.margem.margem.disponivel)}",
                color = Verde,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}
