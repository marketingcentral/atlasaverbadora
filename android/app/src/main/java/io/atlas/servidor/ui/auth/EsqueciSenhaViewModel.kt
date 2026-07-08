package io.atlas.servidor.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import kotlinx.coroutines.launch

enum class EsStep { EMAIL, REDEFINIR, CONCLUIDO }

/** Esqueci minha senha por E-MAIL: informa o e-mail do cadastro → recebe o código →
 *  digita código + nova senha. Se o e-mail não for o do cadastro, mostra erro. */
class EsqueciSenhaViewModel : ViewModel() {
    private val auth = ServiceLocator.authRepository

    var step by mutableStateOf(EsStep.EMAIL)
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var email by mutableStateOf("")
        private set
    var destinoMasked by mutableStateOf("")
        private set
    private var cpf: String = ""
    var codigo by mutableStateOf("")
        private set
    var senha by mutableStateOf("")
        private set
    var senhaConfirm by mutableStateOf("")
        private set

    fun onEmailChange(v: String) { email = v.trim(); error = null }
    fun onCodigoChange(v: String) { codigo = v.filter { it.isDigit() }.take(6); error = null }
    fun onSenhaChange(v: String) { senha = v; error = null }
    fun onSenhaConfirmChange(v: String) { senhaConfirm = v; error = null }

    /** Valida o e-mail contra a conta cadastrada e envia o código pra ele. */
    fun solicitar() {
        val emailOk = email.contains("@") && email.substringAfterLast("@").contains(".") && email.length >= 6
        if (!emailOk) { error = "Informe um e-mail válido."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                val r = auth.esqueciSolicitarEmail(email)
                cpf = r.cpf ?: ""
                destinoMasked = r.destino ?: email
                step = EsStep.REDEFINIR
            } catch (e: ApiException) {
                // O backend retorna "E-mail errado ou inexistente" quando não bate.
                error = e.userMessage
            } finally { loading = false }
        }
    }

    /** Confirma o código e grava a nova senha. */
    fun redefinir(onConcluido: () -> Unit) {
        when {
            codigo.length != 6 -> { error = "Digite os 6 dígitos do código."; return }
            senha.length < 8 -> { error = "A nova senha deve ter ao menos 8 caracteres."; return }
            senha != senhaConfirm -> { error = "As senhas não coincidem."; return }
        }
        loading = true; error = null
        viewModelScope.launch {
            try {
                auth.esqueciRedefinir(cpf, codigo, senha)
                step = EsStep.CONCLUIDO
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    fun voltarParaEmail() { step = EsStep.EMAIL; error = null }
}
