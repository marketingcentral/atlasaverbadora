package io.atlas.servidor.ui.matricula

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import kotlinx.coroutines.launch

class MatriculaSelectViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs

    var state by mutableStateOf<UiState<List<MatriculaInfoDto>>>(UiState.Loading)
        private set
    var selected by mutableStateOf(prefs.selectedMatricula)
        private set

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            state = UiState.Loading
            try {
                val res = repo.matriculas()
                val list = res.data.matriculas
                if (selected == null || list.none { it.matricula == selected }) {
                    selected = list.firstOrNull()?.matricula
                }
                state = UiState.Success(list, res.fromCache)
            } catch (e: ApiException) {
                state = UiState.Error(e.userMessage)
            }
        }
    }

    fun select(matricula: String) {
        selected = matricula
    }

    fun confirm(onDone: () -> Unit) {
        prefs.selectedMatricula = selected
        onDone()
    }
}
