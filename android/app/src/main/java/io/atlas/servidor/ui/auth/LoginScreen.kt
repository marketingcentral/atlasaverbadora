package io.atlas.servidor.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.ui.util.CpfVisualTransformation
import io.atlas.servidor.ui.components.AtlasLogo
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Verde

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onPrimeiroAcesso: () -> Unit,
    vm: LoginViewModel = viewModel(),
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Fundo)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 40.dp),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Spacer(Modifier.height(8.dp))
            AtlasLogo(modifier = Modifier.align(Alignment.CenterHorizontally))
            Spacer(Modifier.height(28.dp))
            Text(
                text = "Acesso do servidor público",
                color = Ink,
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                lineHeight = 28.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Empréstimo consignado, direto da sua margem.",
                color = InkMuted,
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(28.dp))

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
            Spacer(Modifier.height(14.dp))
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

            val err = vm.error
            if (err != null) {
                Spacer(Modifier.height(10.dp))
                Text(err, color = DangerRed, fontSize = 13.sp)
            }

            Spacer(Modifier.height(6.dp))
            TextButton(onClick = onPrimeiroAcesso, modifier = Modifier.align(Alignment.End)) {
                Text("Esqueci minha senha", color = Verde, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }

            Spacer(Modifier.height(10.dp))
            AtlasPrimaryButton(
                text = "Entrar",
                onClick = { vm.login(onLoggedIn) },
                loading = vm.loading,
            )

            Spacer(Modifier.height(20.dp))
            Text(
                text = "ou",
                color = InkMuted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(20.dp))
            AtlasSecondaryButton(text = "Primeiro acesso", onClick = onPrimeiroAcesso)

            Spacer(Modifier.height(28.dp))
            Text(
                text = "🔒 Ambiente seguro · Atlas Averbadora",
                color = InkMuted,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
