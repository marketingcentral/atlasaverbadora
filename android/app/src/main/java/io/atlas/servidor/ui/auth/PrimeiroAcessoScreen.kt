package io.atlas.servidor.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
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
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.util.CpfVisualTransformation
import io.atlas.servidor.ui.util.PhoneVisualTransformation

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
            PaStep.CONTA_EXISTENTE -> StepContaExistente(vm, onBack)
            PaStep.DADOS -> StepDados(vm)
            PaStep.CODIGO -> StepCodigo(vm, onBack)
            PaStep.CONCLUIDO -> StepConcluido(onBack)
        }

        val err = vm.error
        if (err != null && vm.step != PaStep.NAO_ENCONTRADO && vm.step != PaStep.CONTA_EXISTENTE) {
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
private fun StepContaExistente(vm: PrimeiroAcessoViewModel, onBack: () -> Unit) {
    Title("Conta existente", "Este CPF já possui cadastro na Atlas.")
    AtlasCard {
        Text(
            "${vm.nome.ifBlank { "Este servidor" }} já fez o primeiro acesso e tem uma conta ativa. " +
                "Entre com seu CPF e senha. Se esqueceu a senha, use \"Esqueci minha senha\" na tela de login.",
            color = InkMuted,
            fontSize = 14.sp,
        )
    }
    Spacer(Modifier.height(20.dp))
    AtlasPrimaryButton("Ir para o login", onClick = onBack)
    Spacer(Modifier.height(10.dp))
    AtlasSecondaryButton("Tentar outro CPF", onClick = vm::voltarParaCpf)
}

@Composable
private fun StepDados(vm: PrimeiroAcessoViewModel) {
    Title(
        "Confirme seu cadastro",
        "Informe um e-mail seu (pode ser pessoal), seu telefone e escolha uma senha. " +
            "Enviaremos um código para o e-mail para confirmar que é seu.",
    )
    AtlasCard {
        Text(vm.nome, color = Ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        val sub = listOfNotNull(vm.cargo, vm.origem).joinToString(" · ")
        if (sub.isNotBlank()) {
            Spacer(Modifier.height(4.dp))
            Text(sub, color = InkMuted, fontSize = 13.sp)
        }
    }
    Spacer(Modifier.height(16.dp))
    OutlinedTextField(
        value = vm.email,
        onValueChange = vm::onEmailChange,
        label = { Text("Seu e-mail") },
        placeholder = { Text("voce@gmail.com") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(12.dp))
    OutlinedTextField(
        value = vm.telefone,
        onValueChange = vm::onTelefoneChange,
        label = { Text("Telefone (com DDD)") },
        placeholder = { Text("(48) 99999-8888") },
        singleLine = true,
        visualTransformation = PhoneVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(12.dp))
    OutlinedTextField(
        value = vm.senha,
        onValueChange = vm::onSenhaChange,
        label = { Text("Nova senha") },
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
        label = { Text("Confirmar senha") },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(6.dp))
    Text("Mínimo de 8 caracteres.", color = InkMuted, fontSize = 12.sp)

    Spacer(Modifier.height(16.dp))
    AtlasCard {
        Text(
            "Termos. Ao ativar, você autoriza a Atlas a consultar sua margem e intermediar " +
                "averbações junto à prefeitura e bancos parceiros.\n\nLGPD. Seus dados (nome, CPF, " +
                "e-mail, telefone, matrícula, salário, contratos) são tratados conforme a Lei 13.709/2018. " +
                "Você pode pedir exclusão a qualquer momento.",
            color = InkMuted,
            fontSize = 12.sp,
            lineHeight = 17.sp,
        )
    }
    Spacer(Modifier.height(10.dp))
    CheckRow("Li e aceito os Termos de uso", vm.aceiteTermos, vm::toggleTermos)
    CheckRow("Concordo com a Política de Privacidade (LGPD)", vm.aceiteLgpd, vm::toggleLgpd)

    Spacer(Modifier.height(28.dp))
    AtlasPrimaryButton("Enviar código para meu e-mail", onClick = vm::enviarCodigo, loading = vm.loading)
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun CheckRow(text: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onChange(!checked) }.padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(
            checked = checked,
            onCheckedChange = onChange,
            colors = CheckboxDefaults.colors(checkedColor = Verde, checkmarkColor = Superficie),
        )
        Spacer(Modifier.height(0.dp))
        Text(text, color = Ink, fontSize = 13.sp)
    }
}

@Composable
private fun StepCodigo(vm: PrimeiroAcessoViewModel, onBack: () -> Unit) {
    Title(
        "Verifique o código",
        "Enviamos um código de 6 dígitos para ${vm.destinoMasked}. Confira sua caixa de entrada (e o spam).",
    )
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
    AtlasPrimaryButton("Confirmar e ativar", onClick = { vm.confirmarCodigo() }, loading = vm.loading)
    Spacer(Modifier.height(10.dp))
    AtlasSecondaryButton("Voltar", onClick = vm::voltarParaDados)
}

@Composable
private fun StepConcluido(onBack: () -> Unit) {
    Spacer(Modifier.height(24.dp))
    Text("✅", fontSize = 52.sp)
    Spacer(Modifier.height(16.dp))
    Text("Conta criada!", color = Ink, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
    Spacer(Modifier.height(8.dp))
    Text(
        "Seu acesso foi ativado com sucesso. Agora é só entrar com seu CPF e a senha que você criou.",
        color = InkMuted,
        fontSize = 15.sp,
    )
    Spacer(Modifier.height(28.dp))
    AtlasPrimaryButton("Acessar", onClick = onBack)
}
