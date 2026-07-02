package io.atlas.servidor.ui.shell

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.MatriculasResponse
import io.atlas.servidor.data.remote.dto.OfertasResponse
import kotlinx.coroutines.launch

/**
 * Shared state for the main tabbed shell (Início / Contratos / Conta). Loads the full
 * matrícula snapshot + offers once and exposes the currently selected vínculo.
 */
class HomeViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs
    private val auth = ServiceLocator.authRepository

    var matriculasState by mutableStateOf<UiState<MatriculasResponse>>(UiState.Loading)
        private set
    var ofertasState by mutableStateOf<UiState<OfertasResponse>>(UiState.Loading)
        private set
    var selectedMatricula by mutableStateOf(prefs.selectedMatricula)
        private set
    var refreshing by mutableStateOf(false)
        private set

    val userName: String get() = auth.userName ?: "Servidor"

    init {
        load()
    }

    fun load(force: Boolean = false) {
        viewModelScope.launch {
            if (force) refreshing = true else matriculasState = UiState.Loading
            try {
                val res = repo.matriculas(force)
                val list = res.data.matriculas
                if (selectedMatricula == null || list.none { it.matricula == selectedMatricula }) {
                    selectedMatricula = list.firstOrNull()?.matricula
                    prefs.selectedMatricula = selectedMatricula
                }
                matriculasState = UiState.Success(res.data, res.fromCache)
            } catch (e: ApiException) {
                matriculasState = UiState.Error(e.userMessage)
            } finally {
                refreshing = false
            }
        }
        viewModelScope.launch {
            try {
                val res = repo.ofertas(force)
                ofertasState = UiState.Success(res.data, res.fromCache)
            } catch (e: ApiException) {
                ofertasState = UiState.Error(e.userMessage)
            }
        }
    }

    fun current(): MatriculaInfoDto? {
        val data = (matriculasState as? UiState.Success)?.data ?: return null
        return data.matriculas.firstOrNull { it.matricula == selectedMatricula }
            ?: data.matriculas.firstOrNull()
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            auth.logout()
            onDone()
        }
    }
}
