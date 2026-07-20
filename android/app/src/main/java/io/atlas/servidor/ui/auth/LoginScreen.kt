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
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.clickable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.core.SessionWatcher
import io.atlas.servidor.ui.util.CpfVisualTransformation
import io.atlas.servidor.ui.components.AtlasLogo
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.AtlasSecondaryButton
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.DangerRed
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onPrimeiroAcesso: () -> Unit,
    onEsqueciSenha: () -> Unit,
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

            // Aviso de sessão expirada por inatividade (10 min) — some ao logar de novo.
            if (SessionWatcher.expired) {
                Spacer(Modifier.height(20.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Superficie)
                        .padding(14.dp),
                ) {
                    Text("Sua sessão expirou", color = Ambar, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Por segurança, deslogamos você após 10 minutos sem uso. Faça login novamente para continuar.",
                        color = InkMuted,
                        fontSize = 13.sp,
                    )
                }
            }

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
            var senhaVisivel by remember { mutableStateOf(false) }
            OutlinedTextField(
                value = vm.senha,
                onValueChange = vm::onSenhaChange,
                label = { Text("Senha") },
                singleLine = true,
                visualTransformation = if (senhaVisivel) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                trailingIcon = {
                    // Olho: mostra/oculta a senha digitada.
                    IconButton(onClick = { senhaVisivel = !senhaVisivel }) {
                        Icon(
                            imageVector = if (senhaVisivel) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                            contentDescription = if (senhaVisivel) "Ocultar senha" else "Mostrar senha",
                            tint = InkMuted,
                        )
                    }
                },
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            )

            val err = vm.error
            if (err != null) {
                Spacer(Modifier.height(10.dp))
                Text(err, color = DangerRed, fontSize = 13.sp)
            }

            // Lembre-me (salva o CPF) à esquerda · Esqueci minha senha à direita.
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    modifier = Modifier
                        .clickable { vm.onLembrarChange(!vm.lembrar) }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Checkbox(
                        checked = vm.lembrar,
                        onCheckedChange = { vm.onLembrarChange(it) },
                        colors = CheckboxDefaults.colors(checkedColor = Verde),
                    )
                    Text("Lembre-me", color = Ink, fontSize = 13.sp)
                }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onEsqueciSenha) {
                    Text("Esqueci minha senha", color = Verde, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
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
