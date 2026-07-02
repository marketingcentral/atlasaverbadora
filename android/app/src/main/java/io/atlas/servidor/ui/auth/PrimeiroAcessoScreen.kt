package io.atlas.servidor.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.ui.components.AtlasCard
import io.atlas.servidor.ui.components.AtlasPrimaryButton
import io.atlas.servidor.ui.components.BackHeader
import io.atlas.servidor.ui.components.InfoRow
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted

/**
 * The Atlas backend does not expose self-service registration/OTP — servidor accounts are
 * provisioned by the prefeitura/averbadora. This screen reflects that real flow instead of
 * faking an OTP step, and routes the user to support.
 */
@Composable
fun PrimeiroAcessoScreen(onBack: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().background(Fundo).padding(20.dp),
    ) {
        BackHeader(title = "Primeiro acesso", onBack = onBack)
        Spacer(Modifier.height(12.dp))
        Text(
            "Seu acesso é criado pela prefeitura",
            color = Ink,
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold,
            lineHeight = 28.sp,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Por segurança, o cadastro do servidor é feito pela averbadora a partir da folha " +
                "de pagamento. Você recebe suas credenciais e faz o primeiro login com o CPF.",
            color = InkMuted,
            fontSize = 15.sp,
        )
        Spacer(Modifier.height(24.dp))
        AtlasCard {
            Text("O que fazer", color = Ink, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Spacer(Modifier.height(10.dp))
            InfoRow("1. Identificação", "CPF cadastrado na folha")
            InfoRow("2. Senha inicial", "Enviada pela prefeitura")
            InfoRow("3. Suporte", "atendimento@atlas.io")
        }
        Spacer(Modifier.height(24.dp))
        AtlasPrimaryButton(text = "Voltar ao login", onClick = onBack)
    }
}
