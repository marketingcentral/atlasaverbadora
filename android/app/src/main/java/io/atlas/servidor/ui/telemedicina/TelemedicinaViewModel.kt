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

    init { load() }

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
