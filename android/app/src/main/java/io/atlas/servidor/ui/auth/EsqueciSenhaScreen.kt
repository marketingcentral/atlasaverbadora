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
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.components.BackHeader
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted

@Composable
fun EsqueciSenhaScreen(
    onBack: () -> Unit,
    vm: EsqueciSenhaViewModel = viewModel(),
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        BackHeader(title = "Esqueci minha senha", onBack = onBack)
        Spacer(Modifier.height(8.dp))

        when (vm.step) {
            EsStep.EMAIL -> StepEmail(vm)
            EsStep.REDEFINIR -> StepRedefinir(vm, onBack)
            EsStep.CONCLUIDO -> StepConcluidoEs(onBack)
        }

        val err = vm.error
        if (err != null) {
            Spacer(Modifier.height(10.dp))
            Text(err, color = DangerRed, fontSize = 13.sp)
        }
    }
}

@Composable
private fun EsTitle(text: String, sub: String) {
    Text(text, color = Ink, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 30.sp)
    Spacer(Modifier.height(6.dp))
    Text(sub, color = InkMuted, fontSize = 15.sp)
    Spacer(Modifier.height(20.dp))
}

@Composable
private fun StepEmail(vm: EsqueciSenhaViewModel) {
    EsTitle(
        "Recuperar acesso",
        "Informe o e-mail que você usou no primeiro acesso. Enviaremos um código de verificação para ele.",
    )
    OutlinedTextField(
        value = vm.email,
        onValueChange = vm::onEmailChange,
        label = { Text("Seu e-mail de cadastro") },
        placeholder = { Text("voce@gmail.com") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(24.dp))
    AtlasPrimaryButton("Enviar código", onClick = vm::solicitar, loading = vm.loading)
}

@Composable
private fun StepRedefinir(vm: EsqueciSenhaViewModel, onBack: () -> Unit) {
    EsTitle(
        "Verifique o código",
        "Enviamos um código de 6 dígitos para ${vm.destinoMasked}. Digite-o e escolha sua nova senha.",
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
        label = { Text("Confirmar nova senha") },
        singleLine = true,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(6.dp))
    Text("Mínimo de 8 caracteres.", color = InkMuted, fontSize = 12.sp)
    Spacer(Modifier.height(24.dp))
    AtlasPrimaryButton("Redefinir senha", onClick = { vm.redefinir(onBack) }, loading = vm.loading)
    Spacer(Modifier.height(10.dp))
    AtlasSecondaryButton("Voltar", onClick = vm::voltarParaEmail)
}

@Composable
private fun StepConcluidoEs(onBack: () -> Unit) {
    Spacer(Modifier.height(24.dp))
    Text("✅", fontSize = 52.sp)
    Spacer(Modifier.height(16.dp))
    Text("Senha redefinida!", color = Ink, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
    Spacer(Modifier.height(8.dp))
    Text(
        "Sua nova senha já está valendo. Entre com seu CPF e a nova senha.",
        color = InkMuted,
        fontSize = 15.sp,
    )
    Spacer(Modifier.height(28.dp))
    AtlasPrimaryButton("Acessar", onClick = onBack)
}
