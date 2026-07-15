package io.atlas.servidor.ui.telemedicina

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.BeneficioDto
import kotlinx.coroutines.launch

/** Rede de saúde parceira (benefícios da categoria "saude") — alimenta a tela de Telemedicina. */
class TelemedicinaViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs

    var state by mutableStateOf<UiState<List<BeneficioDto>>>(UiState.Loading)
        private set

    // Cotação de telemedicina: idle → enviando → enviada; erro guarda a mensagem.
    var cotacaoEnviando by mutableStateOf(false)
        private set
    var cotacaoEnviada by mutableStateOf(false)
        private set
    var cotacaoErro by mutableStateOf<String?>(null)
        private set

    init { load() }

    /** Envia a cotação de telemedicina (a averbadora recebe os dados do servidor). */
    fun solicitarCotacao(onSucesso: () -> Unit) {
        if (cotacaoEnviando) return
        viewModelScope.launch {
            cotacaoEnviando = true; cotacaoErro = null
            try {
                repo.solicitarCotacaoTelemedicina(prefs.selectedMatricula)
                cotacaoEnviada = true
                onSucesso()
            } catch (e: ApiException) {
                cotacaoErro = e.userMessage
            } finally {
                cotacaoEnviando = false
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            state = UiState.Loading
            try {
                val r = repo.getBeneficios("saude", prefs.selectedMatricula)
                state = UiState.Success(r.beneficios)
            } catch (e: ApiException) {
                state = UiState.Error(e.userMessage)
            }
        }
    }
}
