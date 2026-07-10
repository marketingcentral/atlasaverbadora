package io.atlas.servidor.ui.portabilidade

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.UiState
import io.atlas.servidor.data.remote.dto.ElegivelDto
import io.atlas.servidor.domain.Simulation
import kotlinx.coroutines.launch

/**
 * Portabilidade: lista os contratos elegíveis (de outros bancos) e permite trazê-los para o
 * Banco Atlas com taxa menor. Ao solicitar, cria a proposta que o banco recebe (mesmo fluxo
 * do empréstimo novo — `POST /me/propostas`).
 */
class PortabilidadeViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs

    var state by mutableStateOf<UiState<List<ElegivelDto>>>(UiState.Loading)
        private set
    var taxaAtlas by mutableStateOf(0.0155)
        private set
    var submitting by mutableStateOf(false)
        private set
    private var matriculaAtiva: String? = null

    init { load() }

    fun load() {
        viewModelScope.launch {
            state = UiState.Loading
            try {
                val res = repo.matriculas()
                val info = res.data.matriculas.firstOrNull { it.matricula == prefs.selectedMatricula }
                    ?: res.data.matriculas.firstOrNull()
                matriculaAtiva = info?.matricula
                taxaAtlas = try {
                    repo.ofertas().data.ofertas.minOfOrNull { it.taxaMinAm } ?: 0.0155
                } catch (e: ApiException) { 0.0155 }
                state = UiState.Success(info?.elegiveisPortabilidade.orEmpty())
            } catch (e: ApiException) {
                state = UiState.Error(e.userMessage)
            }
        }
    }

    /** Nova parcela ao portar o saldo devedor para o Banco Atlas (taxa menor). */
    fun novaParcela(e: ElegivelDto): Double =
        Simulation.parcela(e.saldoDevedor, e.parcelasRestantes, taxaAtlas)

    fun economiaMensal(e: ElegivelDto): Double = (e.parcela - novaParcela(e)).coerceAtLeast(0.0)

    fun solicitar(e: ElegivelDto, onDone: () -> Unit) {
        val mat = matriculaAtiva ?: return
        submitting = true
        viewModelScope.launch {
            try {
                // Portabilidade é um refinanciamento de empréstimo → trava o produto EMPRESTIMO.
                repo.criarProposta(e.saldoDevedor, e.parcelasRestantes, taxaAtlas, mat, "Banco Atlas (portabilidade)", "EMPRESTIMO")
                prefs.setSimLock(mat, "EMPRESTIMO")
            } catch (ex: ApiException) {
                // best-effort
            }
            submitting = false
            onDone()
        }
    }
}
