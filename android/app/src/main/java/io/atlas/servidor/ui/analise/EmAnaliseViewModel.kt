package io.atlas.servidor.ui.analise

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.UiState
import io.atlas.servidor.core.isReservaPendente
import io.atlas.servidor.data.remote.dto.PropostaDto
import kotlinx.coroutines.launch

/**
 * Lê as propostas direto do servidor (mesma fonte que o BANCO enxerga, persistida no
 * Postgres). Assim o "Em análise" reflete o estado real do ecossistema — inclusive quando
 * o banco aprova ou a prefeitura aplica a folha.
 */
class EmAnaliseViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs

    var state by mutableStateOf<UiState<List<PropostaDto>>>(UiState.Loading)
        private set

    init { load() }

    fun load() {
        viewModelScope.launch {
            state = UiState.Loading
            try {
                val r = repo.getPropostas(prefs.selectedMatricula)
                // Banco aprovou / proposta encerrou → sem reserva pendente → libera a margem.
                if (r.propostas.none { isReservaPendente(it.situacao) }) {
                    prefs.selectedMatricula?.let { prefs.clearSimLock(it) }
                }
                state = UiState.Success(r.propostas)
            } catch (e: ApiException) {
                state = UiState.Error(e.userMessage)
            }
        }
    }

    /** Fase de teste: apaga TODAS as propostas em análise no servidor e libera a trava de
     *  48h da matrícula ativa. Recarrega a lista ao final. */
    fun liberarSimulacao(onDone: () -> Unit = {}) {
        viewModelScope.launch {
            try {
                repo.removerPropostasEmAnalise(prefs.selectedMatricula)
            } catch (_: ApiException) {
                // Mesmo se a remoção server-side falhar, libera a trava local pra não travar o teste.
            }
            prefs.selectedMatricula?.let { prefs.clearSimLock(it) }
            load()
            onDone()
        }
    }
}
