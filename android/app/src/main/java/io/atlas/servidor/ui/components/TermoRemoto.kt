package io.atlas.servidor.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import io.atlas.servidor.core.ServiceLocator

/**
 * Texto do termo de aceite configurado pela averbadora em /averbadora/termos.
 *
 * A fonte da verdade é SEMPRE a averbadora: o corpo vem de lá com as variáveis
 * ({{valor}}, {{banco}}, …) já substituídas pelo servidor, então editar o termo
 * no painel reflete no app sem novo release.
 *
 * Devolve null enquanto carrega (ou se a rede falhar) — a tela cai no texto de
 * fallback nesse caso, pra nunca bloquear o aceite do servidor.
 */
@Composable
fun rememberTermoCorpo(tipo: String, vars: Map<String, String> = emptyMap()): String? {
    val chave = tipo + vars.entries.sortedBy { it.key }.joinToString { "${it.key}=${it.value}" }
    var corpo by remember(chave) { mutableStateOf<String?>(null) }
    LaunchedEffect(chave) {
        corpo = runCatching {
            ServiceLocator.servidorRepository.getTermo(tipo, vars).termo.corpo
        }.getOrNull()
    }
    return corpo
}
