package io.atlas.servidor.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.components.BackHeader
import io.atlas.servidor.ui.components.InfoRow
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.util.CpfVisualTransformation

@Composable
fun PrimeiroAcessoScreen(
    onBack: () -> Unit,
    vm: PrimeiroAcessoViewModel = viewModel(),
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        BackHeader(title = "Primeiro acesso", onBack = onBack)
        Spacer(Modifier.height(8.dp))

        when (vm.step) {
            PaStep.CPF -> StepCpf(vm)
            PaStep.NAO_ENCONTRADO -> StepNaoEncontrado(vm, onBack)
            PaStep.CONFIRMAR -> StepConfirmar(vm)
            PaStep.CODIGO -> StepCodigo(vm)
            PaStep.SENHA -> StepSenha(vm, onBack)
            PaStep.CONCLUIDO -> StepConcluido(onBack)
        }

        val err = vm.error
        if (err != null && vm.step != PaStep.NAO_ENCONTRADO) {
            Spacer(Modifier.height(10.dp))
            Text(err, color = DangerRed, fontSize = 13.sp)
        }
    }
}

@Composable
private fun Title(text: String, sub: String) {
    Text(text, color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 30.sp)
    Spacer(Modifier.height(6.dp))
    Text(sub, color = InkMuted, fontSize = 15.sp)
    Spacer(Modifier.height(20.dp))
}

@Composable
private fun StepCpf(vm: PrimeiroAcessoViewModel) {
    Title("Vamos localizar seu cadastro", "Informe seu CPF para procurarmos na base da prefeitura.")
    OutlinedTextField(
        value = vm.cpf,
        onValueChange = vm::onCpfChange,
        label = { Text("CPF") },
        placeholder = { Text("000.000.000-00") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        visualTransformation = CpfVisualTransformation(),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(20.dp))
    AtlasPrimaryButton("Continuar", onClick = vm::buscar, loading = vm.loading)
}

@Composable
private fun StepNaoEncontrado(vm: PrimeiroAcessoViewModel, onBack: () -> Unit) {
    Title("Cadastro não encontrado", "Não localizamos um servidor com esse CPF na base da prefeitura.")
    AtlasCard {
        Text(
            "O cadastro do servidor é feito pela prefeitura/averbadora a partir da folha. " +
                "Confira o CPF ou fale com o suporte: atendimento@atlas.io",
            color = InkMuted,
            fontSize = 14.sp,
        )
    }
    Spacer(Modifier.height(20.dp))
    AtlasPrimaryButton("Tentar outro CPF", onClick = vm::voltarParaCpf)
    Spacer(Modifier.height(10.dp))
    AtlasSecondaryButton("Voltar ao login", onClick = onBack)
}

@Composable
private fun StepConfirmar(vm: PrimeiroAcessoViewModel) {
    Title("Confirme seus dados", "Encontramos seu cadastro. Vamos enviar um código de verificação.")
    AtlasCard {
        Text(vm.nome, color = Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Spacer(Modifier.height(8.dp))
        if (vm.cargo != null) InfoRow("Cargo", vm.cargo!!)
        if (vm.origem != null) InfoRow("Órgão", vm.origem!!)
        InfoRow("E-mail", vm.emailMasked)
        InfoRow("Telefone", vm.telefoneMasked)
    }
    Spacer(Modifier.height(20.dp))
    AtlasPrimaryButton("Enviar código", onClick = vm::enviarCodigo, loading = vm.loading)
}

@Composable
private fun StepCodigo(vm: PrimeiroAcessoViewModel) {
    Title("Verifique o código", "Enviamos um código de 6 dígitos para ${vm.emailMasked}.")
    val teste = vm.codigoTeste
    if (teste != null) {
        AtlasCard {
            Text("Modo de teste", color = Verde, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Spacer(Modifier.height(4.dp))
            Text("Sem envio de e-mail nesta fase — seu código é:", color = InkMuted, fontSize = 13.sp)
            Text(teste, color = Ink, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
        }
        Spacer(Modifier.height(16.dp))
    }
    OutlinedTextField(
        value = vm.codigo,
        onValueChange = vm::onCodigoChange,
        label = { Text("Código") },
        placeholder = { Text("000000") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(20.dp))
    AtlasPrimaryButton("Validar", onClick = vm::validarCodigo)
}

@Composable
private fun StepSenha(vm: PrimeiroAcessoViewModel, onBack: () -> Unit) {
    Title("Crie sua senha", "Você usará essa senha para acessar o aplicativo.")
    OutlinedTextField(
        value = vm.senha,
        onValueChange = vm::onSenhaChange,
        label = { Text("Senha") },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(12.dp))
    OutlinedTextField(
        value = vm.senhaConfirm,
        onValueChange = vm::onSenhaConfirmChange,
        label = { Text("Repetir senha") },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(8.dp))
    Text("Mínimo de 8 caracteres.", color = InkMuted, fontSize = 12.sp)
    Spacer(Modifier.height(20.dp))
    AtlasPrimaryButton("Criar senha e acessar", onClick = { vm.definirSenha(onBack) }, loading = vm.loading)
}

@Composable
private fun StepConcluido(onBack: () -> Unit) {
    Title("Senha criada! ✅", "Agora é só entrar com seu CPF e a senha que você acabou de criar.")
    AtlasPrimaryButton("Ir para o login", onClick = onBack)
}
