package io.atlas.servidor.ui.conta

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.core.UiState
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
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

@Composable
fun ContaScreen(
    vm: HomeViewModel,
    onSwitchMatricula: () -> Unit,
    onLoggedOut: () -> Unit,
    contaVm: ContaViewModel = viewModel(),
) {
    if (contaVm.mode != ContaEdit.NONE) {
        ContaEditDialog(contaVm, onSucesso = { vm.load() })
    }

    // Suporte / Termos de Uso / Políticas de Privacidade — o texto vem da tela
    // Termos de aceite da averbadora, então editar lá reflete aqui.
    var termoAberto by remember { mutableStateOf<String?>(null) }
    termoAberto?.let { tipo ->
        if (tipo == "suporte") {
            SuporteDialog(onFechar = { termoAberto = null })
        } else {
            TermoDialog(tipo = tipo, onFechar = { termoAberto = null })
        }
    }

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
                        ContatoItem("E-mail", info.email, editavel = true) { contaVm.abrirEmail(info.email) }
                        RowDivider()
                        ContatoItem("Telefone", io.atlas.servidor.domain.Format.phone(info.telefone), editavel = true) { contaVm.abrirTelefone(info.telefone) }
                        RowDivider()
                        ContatoItem("Endereço", info.endereco, editavel = false) {}
                    }
                    Spacer(Modifier.height(10.dp))
                    AtlasSecondaryButton(text = "Alterar senha", onClick = { contaVm.abrirSenha() })
                }

                Spacer(Modifier.height(24.dp))
                SectionLabel("Suporte")
                Spacer(Modifier.height(8.dp))
                AtlasCard {
                    LinkRow("Suporte") { termoAberto = "suporte" }
                    RowDivider()
                    LinkRow("Termos de Uso") { termoAberto = "termos_uso" }
                    RowDivider()
                    LinkRow("Políticas de Privacidade") { termoAberto = "politica_privacidade" }
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

/** Item de contato empilhado: rótulo (com "Editar") em cima, valor embaixo em largura
 *  total — não quebra o layout com e-mails/endereços longos. */
@Composable
private fun ContatoItem(label: String, value: String, editavel: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (editavel) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(vertical = 10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, color = InkMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            if (editavel) {
                Icon(Icons.Filled.Edit, contentDescription = "Editar", tint = Verde, modifier = Modifier.size(16.dp))
            }
        }
        Spacer(Modifier.height(4.dp))
        Text(value, color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun RowDivider() {
    androidx.compose.foundation.layout.Box(
        Modifier.fillMaxWidth().height(1.dp).background(io.atlas.servidor.ui.theme.Divider),
    )
}

@Composable
private fun ContaEditDialog(vm: ContaViewModel, onSucesso: () -> Unit) {
    AlertDialog(
        onDismissRequest = { vm.fechar() },
        containerColor = Superficie,
        title = { Text(vm.titulo, fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            Column {
                if (vm.step == ContaStep.FORM) {
                    when (vm.mode) {
                        ContaEdit.EMAIL -> Field("Novo e-mail", vm.campo, vm::onCampo, KeyboardType.Email)
                        ContaEdit.TELEFONE -> Field("Novo telefone", vm.campo, vm::onCampo, KeyboardType.Phone, phone = true)
                        ContaEdit.SENHA -> {
                            Field("Senha atual", vm.senhaAtual, vm::onSenhaAtual, KeyboardType.Password, senha = true)
                            Spacer(Modifier.height(10.dp))
                            Field("Nova senha", vm.novaSenha, vm::onNovaSenha, KeyboardType.Password, senha = true)
                            Spacer(Modifier.height(10.dp))
                            Field("Repetir nova senha", vm.novaSenha2, vm::onNovaSenha2, KeyboardType.Password, senha = true)
                        }
                        ContaEdit.NONE -> {}
                    }
                } else {
                    Text("Enviamos um código para o seu e-mail. Digite-o para confirmar.", color = InkMuted, fontSize = 13.sp)
                    vm.codigoTeste?.let {
                        Spacer(Modifier.height(8.dp))
                        Text("Código de teste: $it", color = Verde, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                    Spacer(Modifier.height(10.dp))
                    Field("Código", vm.codigo, vm::onCodigo, KeyboardType.NumberPassword)
                }
                vm.error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = DangerRed, fontSize = 13.sp)
                }
            }
        },
        confirmButton = {
            if (vm.step == ContaStep.FORM) {
                TextButton(onClick = { vm.avancar() }, enabled = !vm.loading) {
                    Text("Alterar", color = Verde, fontWeight = FontWeight.Bold)
                }
            } else {
                TextButton(onClick = { vm.confirmar(onSucesso) }, enabled = !vm.loading) {
                    Text("Confirmar", color = Verde, fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { vm.fechar() }) { Text("Cancelar", color = InkMuted, fontWeight = FontWeight.SemiBold) }
        },
    )
}

@Composable
private fun Field(label: String, value: String, onChange: (String) -> Unit, kb: KeyboardType, senha: Boolean = false, phone: Boolean = false) {
    // Telefone: guarda só dígitos (máx. 11) e exibe com a máscara (xx) xxxxx-xxxx.
    val transform = when {
        phone -> io.atlas.servidor.ui.util.PhoneVisualTransformation()
        senha -> PasswordVisualTransformation()
        else -> androidx.compose.ui.text.input.VisualTransformation.None
    }
    OutlinedTextField(
        value = value,
        onValueChange = { if (phone) onChange(it.filter { c -> c.isDigit() }.take(11)) else onChange(it) },
        label = { Text(label) },
        singleLine = true,
        visualTransformation = transform,
        keyboardOptions = KeyboardOptions(keyboardType = kb),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun LinkRow(text: String, onClick: (() -> Unit)? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(vertical = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text, color = Ink, fontSize = 15.sp, fontWeight = FontWeight.Medium)
        if (onClick != null) Text("›", color = InkMuted, fontSize = 20.sp)
    }
}

/** Termo (Termos de Uso / Política de Privacidade) — corpo vem de /averbadora/termos. */
@Composable
private fun TermoDialog(tipo: String, onFechar: () -> Unit) {
    val corpo = io.atlas.servidor.ui.components.rememberTermoCorpo(tipo)
    val titulo = if (tipo == "termos_uso") "Termos de Uso" else "Políticas de Privacidade"
    AlertDialog(
        onDismissRequest = onFechar,
        containerColor = Superficie,
        title = { Text(titulo, fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Text(
                    corpo ?: "Carregando…",
                    color = InkMuted,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onFechar) { Text("Fechar", color = Verde, fontWeight = FontWeight.Bold) }
        },
    )
}

@Composable
private fun SuporteDialog(onFechar: () -> Unit) {
    AlertDialog(
        onDismissRequest = onFechar,
        containerColor = Superficie,
        title = { Text("Suporte", fontWeight = FontWeight.ExtraBold, color = Ink) },
        text = {
            Column {
                Text("Precisa de ajuda com sua margem, contratos ou benefícios?", color = InkMuted, fontSize = 14.sp)
                Spacer(Modifier.height(12.dp))
                InfoRow("E-mail", "suporte@atlasaverbadora.com.br")
                InfoRow("Telefone", "(48) 3000-0000")
                Spacer(Modifier.height(12.dp))
                Text(
                    "Para dúvidas sobre desconto em folha, procure também o RH da sua prefeitura.",
                    color = InkMuted,
                    fontSize = 12.5.sp,
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onFechar) { Text("Fechar", color = Verde, fontWeight = FontWeight.Bold) }
        },
    )
}
