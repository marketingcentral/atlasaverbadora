package io.atlas.servidor.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import kotlinx.coroutines.launch

enum class PaStep { CPF, NAO_ENCONTRADO, CONTA_EXISTENTE, DADOS, CODIGO, CONCLUIDO }

/** Fluxo de primeiro acesso, igual ao da versão web:
 *  CPF → Dados (e-mail + telefone + senha 2x + termos) → Código (enviado ao e-mail) → concluído.
 *  O e-mail e a senha vão no passo "código"; o backend guarda pendente e só efetiva após o código. */
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

    // Dados que o servidor informa no primeiro acesso.
    var email by mutableStateOf("")
        private set
    var telefone by mutableStateOf("")
        private set
    var senha by mutableStateOf("")
        private set
    var senhaConfirm by mutableStateOf("")
        private set
    var aceiteTermos by mutableStateOf(false)
        private set
    var aceiteLgpd by mutableStateOf(false)
        private set

    var destinoMasked by mutableStateOf("")
        private set
    var codigo by mutableStateOf("")
        private set

    fun onCpfChange(v: String) { cpf = v.filter { it.isDigit() }.take(11); error = null }
    fun onEmailChange(v: String) { email = v.trim(); error = null }
    fun onTelefoneChange(v: String) { telefone = v.filter { it.isDigit() }.take(11); error = null }
    fun onSenhaChange(v: String) { senha = v; error = null }
    fun onSenhaConfirmChange(v: String) { senhaConfirm = v; error = null }
    fun toggleTermos(v: Boolean) { aceiteTermos = v; error = null }
    fun toggleLgpd(v: Boolean) { aceiteLgpd = v; error = null }
    fun onCodigoChange(v: String) { codigo = v.filter { it.isDigit() }.take(6); error = null }

    fun buscar() {
        if (cpf.length != 11) { error = "Informe um CPF válido (11 dígitos)."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                val r = auth.paBuscar(cpf)
                nome = r.nome ?: ""
                cargo = r.cargo
                origem = r.origem
                step = when {
                    !r.encontrado -> PaStep.NAO_ENCONTRADO
                    r.jaTemSenha -> PaStep.CONTA_EXISTENTE // já fez o primeiro acesso
                    else -> PaStep.DADOS
                }
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    /** Valida os dados, cria a conta pendente e envia o código para o e-mail informado. */
    fun enviarCodigo() {
        val emailOk = email.contains("@") && email.substringAfterLast("@").contains(".") && email.length >= 6
        when {
            !emailOk -> { error = "Informe um e-mail válido para receber o código."; return }
            telefone.length < 10 -> { error = "Informe um telefone válido com DDD."; return }
            senha.length < 8 -> { error = "A senha deve ter ao menos 8 caracteres."; return }
            senha != senhaConfirm -> { error = "As senhas não coincidem."; return }
            !aceiteTermos -> { error = "É necessário aceitar os Termos de uso."; return }
            !aceiteLgpd -> { error = "É necessário concordar com a Política de Privacidade."; return }
        }
        loading = true; error = null
        viewModelScope.launch {
            try {
                val r = auth.paEnviarCodigo(cpf, email, senha, telefone)
                destinoMasked = r.destino ?: email
                step = PaStep.CODIGO
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    /** Confirma o código recebido e efetiva o cadastro (senha + e-mail gravados).
     *  Ao concluir, mostra a tela "Conta criada" — a navegação para o login é feita no botão. */
    fun confirmarCodigo() {
        if (codigo.length != 6) { error = "Digite os 6 dígitos do código."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                auth.paConfirmar(cpf, codigo)
                step = PaStep.CONCLUIDO
            } catch (e: ApiException) {
                error = e.userMessage
            } finally { loading = false }
        }
    }

    fun voltarParaDados() { step = PaStep.DADOS; error = null }
    fun voltarParaCpf() { step = PaStep.CPF; error = null }
}
