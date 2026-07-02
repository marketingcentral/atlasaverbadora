package io.atlas.servidor.ui.analise

import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.data.local.ProposalRequestEntity
import kotlinx.coroutines.launch

class EmAnaliseViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs

    // Reactive stream of the servidor's pending proposals, exposed as LiveData.
    val proposals: LiveData<List<ProposalRequestEntity>> =
        repo.observeProposals(prefs.selectedMatricula ?: "").asLiveData()

    /** Cancela a pré-reserva e libera a trava de 48h daquela matrícula. */
    fun cancelar(id: Long, matricula: String) {
        viewModelScope.launch {
            repo.deleteProposal(id)
            prefs.clearSimLock(matricula)
        }
    }
}
