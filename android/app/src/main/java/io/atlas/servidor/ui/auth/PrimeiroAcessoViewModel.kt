package io.atlas.servidor.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import kotlinx.coroutines.launch

enum class PaStep { CPF, NAO_ENCONTRADO, CONFIRMAR, CODIGO, SENHA, CONCLUIDO }

/** Drives the real "primeiro acesso" flow (telas 01B–01E): CPF lookup → confirmar →
 *  código (test-mode) → criar senha, tudo contra a API. */
class PrimeiroAcessoViewModel : ViewModel() {
    private val auth = ServiceLocator.authRepository

    var step by mutableStateOf(PaStep.CPF)
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var cpf by mutableStateOf("")
        private set
    var nome by mutableStateOf("")
        private set
    var cargo by mutableStateOf<String?>(null)
        private set
    var origem by mutableStateOf<String?>(null)
        private set
    var emailMasked by mutableStateOf("")
        private set
    var telefoneMasked by mutableStateOf("")
        private set

    // O servidor informa o e-mail (e telefone) que vai receber o código de verificação.
    var email by mutableStateOf("")
        private set
    var telefone by mutableStateOf("")
        private set

    var codigoTeste by mutableStateOf<String?>(null)
        private set
    var codigo by mutableStateOf("")
        private set
    var senha by mutableStateOf("")
        private set
    var senhaConfirm by mutableStateOf("")
        private set

    fun onCpfChange(v: String) { cpf = v.filter { it.isDigit() }.take(11); error = null }
    fun onEmailChange(v: String) { email = v.trim(); error = null }
    fun onTelefoneChange(v: String) { telefone = v.filter { it.isDigit() }.take(11); error = null }
    fun onCodigoChange(v: String) { codigo = v.filter { it.isDigit() }.take(6); error = null }
    fun onSenhaChange(v: String) { senha = v; error = null }
    fun onSenhaConfirmChange(v: String) { senhaConfirm = v; error = null }

    fun buscar() {
        if (cpf.length != 11) { error = "Informe um CPF válido (11 dígitos)."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                val r = auth.paBuscar(cpf)
                if (!r.encontrado) {
                    step = PaStep.NAO_ENCONTRADO
                } else {
                    nome = r.nome ?: ""
                    cargo = r.cargo
                    origem = r.origem
                    emailMasked = r.emailMasked ?: ""
                    telefoneMasked = r.telefoneMasked ?: ""
                    step = PaStep.CONFIRMAR
                }
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    fun enviarCodigo() {
        val emailOk = email.contains("@") && email.contains(".") && email.length >= 6
        if (!emailOk) { error = "Informe um e-mail válido para receber o código."; return }
        if (telefone.length < 10) { error = "Informe um telefone válido com DDD."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                // Envia o código para o e-mail informado pelo servidor.
                val r = auth.paEnviarCodigo(cpf, email, telefone)
                codigoTeste = r.codigoTeste
                emailMasked = r.destino ?: email
                step = PaStep.CODIGO
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    fun validarCodigo() {
        if (codigo.length != 6) { error = "Digite os 6 dígitos do código."; return }
        error = null
        step = PaStep.SENHA
    }

    fun definirSenha(onConcluido: () -> Unit) {
        if (senha.length < 8) { error = "A senha deve ter ao menos 8 caracteres."; return }
        if (senha != senhaConfirm) { error = "As senhas não coincidem."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                auth.paDefinirSenha(cpf, codigo, senha)
                step = PaStep.CONCLUIDO
                onConcluido()
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    fun voltarParaCpf() { step = PaStep.CPF; error = null }
}
