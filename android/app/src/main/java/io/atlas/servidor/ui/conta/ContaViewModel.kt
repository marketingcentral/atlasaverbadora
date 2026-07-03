package io.atlas.servidor.ui.conta

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import kotlinx.coroutines.launch

enum class ContaEdit { NONE, EMAIL, TELEFONE, SENHA }
enum class ContaStep { FORM, CODIGO }

/** Fluxos de edição de contato e troca de senha (com código enviado ao e-mail). */
class ContaViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository

    var mode by mutableStateOf(ContaEdit.NONE); private set
    var step by mutableStateOf(ContaStep.FORM); private set
    var loading by mutableStateOf(false); private set
    var error by mutableStateOf<String?>(null); private set

    var campo by mutableStateOf(""); private set          // email ou telefone
    var senhaAtual by mutableStateOf(""); private set
    var novaSenha by mutableStateOf(""); private set
    var novaSenha2 by mutableStateOf(""); private set
    var codigo by mutableStateOf(""); private set
    var codigoTeste by mutableStateOf<String?>(null); private set

    val titulo: String get() = when (mode) {
        ContaEdit.EMAIL -> "Alterar e-mail"
        ContaEdit.TELEFONE -> "Alterar telefone"
        ContaEdit.SENHA -> "Alterar senha"
        ContaEdit.NONE -> ""
    }

    fun abrirEmail(atual: String) { mode = ContaEdit.EMAIL; campo = atual; reset() }
    fun abrirTelefone(atual: String) { mode = ContaEdit.TELEFONE; campo = atual; reset() }
    fun abrirSenha() { mode = ContaEdit.SENHA; reset() }
    fun fechar() { mode = ContaEdit.NONE }

    private fun reset() { step = ContaStep.FORM; error = null; codigo = ""; codigoTeste = null; senhaAtual = ""; novaSenha = ""; novaSenha2 = "" }

    fun onCampo(v: String) { campo = v; error = null }
    fun onSenhaAtual(v: String) { senhaAtual = v; error = null }
    fun onNovaSenha(v: String) { novaSenha = v; error = null }
    fun onNovaSenha2(v: String) { novaSenha2 = v; error = null }
    fun onCodigo(v: String) { codigo = v.filter { it.isDigit() }.take(6); error = null }

    /** Valida o formulário e envia o código pro e-mail (test-mode: mostra na tela). */
    fun avancar() {
        when (mode) {
            ContaEdit.EMAIL -> if (!campo.contains("@")) { error = "Informe um e-mail válido."; return }
            ContaEdit.TELEFONE -> if (campo.filter { it.isDigit() }.length < 10) { error = "Informe um telefone válido."; return }
            ContaEdit.SENHA -> {
                if (senhaAtual.isBlank()) { error = "Informe a senha atual."; return }
                if (novaSenha.length < 8) { error = "A nova senha deve ter ao menos 8 caracteres."; return }
                if (novaSenha != novaSenha2) { error = "As senhas não coincidem."; return }
            }
            ContaEdit.NONE -> return
        }
        loading = true; error = null
        viewModelScope.launch {
            try {
                val r = repo.enviarCodigoConta()
                codigoTeste = r.codigoTeste
                step = ContaStep.CODIGO
            } catch (e: ApiException) { error = e.userMessage } finally { loading = false }
        }
    }

    /** Confirma com o código e persiste (contato ou senha). */
    fun confirmar(onSucesso: () -> Unit) {
        if (codigo.length != 6) { error = "Digite o código de 6 dígitos."; return }
        loading = true; error = null
        viewModelScope.launch {
            try {
                when (mode) {
                    ContaEdit.EMAIL -> repo.atualizarContato(codigo, email = campo, telefone = null)
                    ContaEdit.TELEFONE -> repo.atualizarContato(codigo, email = null, telefone = campo)
                    ContaEdit.SENHA -> repo.alterarSenha(senhaAtual, codigo, novaSenha)
                    ContaEdit.NONE -> {}
                }
                mode = ContaEdit.NONE
                onSucesso()
            } catch (e: ApiException) { error = e.userMessage } finally { loading = false }
        }
    }
}
