package io.atlas.servidor.ui.conta

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.domain.Format
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.components.ErrorBox
import io.atlas.servidor.ui.components.InfoRow
import io.atlas.servidor.ui.components.LoadingBox
import io.atlas.servidor.ui.components.SectionLabel
import io.atlas.servidor.ui.shell.HomeViewModel
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted

@Composable
fun ContaScreen(
    vm: HomeViewModel,
    onSwitchMatricula: () -> Unit,
    onLoggedOut: () -> Unit,
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
                Text("Conta", color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                Spacer(Modifier.height(4.dp))
                Text(vm.userName, color = InkMuted, fontSize = 15.sp)
                Spacer(Modifier.height(20.dp))

                if (info != null) {
                    SectionLabel("Matrícula ativa")
                    Spacer(Modifier.height(8.dp))
                    AtlasCard {
                        Text(info.cargo, color = Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text("${info.prefeitura} · ${info.uf}", color = InkMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(6.dp))
                        Text("Mat. ${info.matricula}", color = Ink, fontSize = 14.sp)
                    }
                    Spacer(Modifier.height(10.dp))
                    AtlasSecondaryButton(text = "Trocar matrícula", onClick = onSwitchMatricula)

                    Spacer(Modifier.height(24.dp))
                    SectionLabel("Dados funcionais · não editáveis")
                    Spacer(Modifier.height(8.dp))
                    AtlasCard {
                        InfoRow("Nome", info.nome)
                        InfoRow("Cargo", info.cargo)
                        InfoRow("Vínculo", info.vinculo)
                        InfoRow("Órgão", info.prefeitura)
                    }

                    Spacer(Modifier.height(24.dp))
                    SectionLabel("Contato")
                    Spacer(Modifier.height(8.dp))
                    AtlasCard {
                        InfoRow("E-mail", info.email)
                        InfoRow("Telefone", info.telefone)
                        InfoRow("Endereço", info.endereco)
                    }
                }

                Spacer(Modifier.height(24.dp))
                SectionLabel("Suporte")
                Spacer(Modifier.height(8.dp))
                AtlasCard {
                    LinkRow("Central de ajuda")
                    LinkRow("Política de privacidade")
                    LinkRow("Política de uso")
                    LinkRow("Falar com alguém")
                }

                Spacer(Modifier.height(28.dp))
                Text(
                    text = "Sair da conta",
                    color = DangerRed,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onLoggedOut)
                        .padding(vertical = 12.dp),
                )
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun LinkRow(text: String) {
    Text(
        text = text,
        color = Ink,
        fontSize = 15.sp,
        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
    )
}
