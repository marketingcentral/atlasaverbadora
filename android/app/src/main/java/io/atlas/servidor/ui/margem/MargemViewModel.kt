package io.atlas.servidor.ui.margem

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.data.local.ProposalRequestEntity
import io.atlas.servidor.data.remote.dto.MargemBlockDto
import kotlinx.coroutines.launch

class MargemViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs

    var loading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var margem by mutableStateOf<MargemBlockDto?>(null)
        private set

    val proposals: LiveData<List<ProposalRequestEntity>> =
        repo.observeProposals(prefs.selectedMatricula ?: "").asLiveData()

    init { load() }

    fun load() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                val res = repo.matriculas()
                val sel = res.data.matriculas.firstOrNull { it.matricula == prefs.selectedMatricula }
                    ?: res.data.matriculas.firstOrNull()
                margem = sel?.margem
            } catch (e: ApiException) {
                error = e.userMessage
            } finally {
                loading = false
            }
        }
    }
}
