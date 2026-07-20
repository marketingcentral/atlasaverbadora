package io.atlas.servidor.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {
    private val auth = ServiceLocator.authRepository
    private val prefs = ServiceLocator.appPrefs

    var cpf by mutableStateOf("")
        private set
    var senha by mutableStateOf("")
        private set
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    /** "Lembre-me": pré-preenche o CPF no próximo acesso. */
    var lembrar by mutableStateOf(false)
        private set

    init {
        // Se o servidor marcou "Lembre-me" antes, já traz o CPF preenchido.
        if (prefs.lembrarLogin) {
            cpf = prefs.cpfSalvo.orEmpty()
            lembrar = true
        }
    }

    fun onCpfChange(value: String) {
        cpf = value.filter { it.isDigit() }.take(11)
        error = null
    }

    fun onSenhaChange(value: String) {
        senha = value
        error = null
    }

    fun onLembrarChange(value: Boolean) {
        lembrar = value
    }

    fun login(onSuccess: () -> Unit) {
        if (cpf.length != 11) {
            error = "Informe um CPF válido (11 dígitos)."
            return
        }
        if (senha.length < 6) {
            error = "A senha deve ter ao menos 6 caracteres."
            return
        }
        loading = true
        error = null
        viewModelScope.launch {
            try {
                auth.login(cpf, senha)
                // Persiste (ou limpa) o CPF conforme o "Lembre-me".
                prefs.lembrarLogin = lembrar
                prefs.cpfSalvo = if (lembrar) cpf else null
                onSuccess()
            } catch (e: ApiException) {
                error = e.userMessage
            } finally {
                loading = false
            }
        }
    }
}
