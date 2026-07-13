package io.atlas.servidor.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import kotlinx.coroutines.launch

enum class EsStep { CPF, CODIGO, SENHA, CONCLUIDO }

/** Esqueci minha senha por CPF: informa o CPF → recebe o código no e-mail cadastrado
 *  (mostrado mascarado) → digita o código → define a nova senha (2x) → volta ao login. */
class EsqueciSenhaViewModel : ViewModel() {
    private val auth = ServiceLocator.authRepository

    var step by mutableStateOf(EsStep.CPF)
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var cpf by mutableStateOf("")
        private set
    var destinoMasked by mutableStateOf("")
        private set
    var codigo by mutableStateOf("")
        private set
    var senha by mutableStateOf("")
        private set
    var senhaConfirm by mutableStateOf("")
        private set

    fun onCpfChange(v: String) { cpf = v.filter { it.isDigit() }.take(11); error = null }
    fun onCodigoChange(v: String) { codigo = v.filter { it.isDigit() }.take(6); error = null }
    fun onSenhaChange(v: String) { senha = v; error = null }
    fun onSenhaConfirmChange(v: String) { senhaConfirm = v; error = null }

    /** Passo 1: valida o CPF e envia o código pro e-mail cadastrado. */
    fun solicitar() {
        if (cpf.length != 11) { error = "Digite os 11 dígitos do seu CPF."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                val r = auth.esqueciSolicitar(cpf)
                destinoMasked = r.destino ?: "seu e-mail"
                step = EsStep.CODIGO
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    /** Passo 2: apenas avança pra tela de nova senha — o código é validado no redefinir. */
    fun avancarCodigo() {
        if (codigo.length != 6) { error = "Digite os 6 dígitos do código."; return }
        error = null
        step = EsStep.SENHA
    }

    /** Passo 3: valida a nova senha, confirma o código e grava. */
    fun redefinir() {
        when {
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

    /** Volta um passo (usado pelos links "‹ Voltar" das telas de código/senha). */
    fun voltarCodigo() { step = EsStep.CODIGO; error = null }
    fun voltarCpf() { step = EsStep.CPF; error = null }
}
