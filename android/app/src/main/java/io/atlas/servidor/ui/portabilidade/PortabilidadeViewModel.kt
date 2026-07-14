package io.atlas.servidor.ui.portabilidade

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.UiState
import io.atlas.servidor.core.isReservaPendente
import io.atlas.servidor.core.produtoDaProposta
import io.atlas.servidor.data.remote.dto.ElegivelDto
import io.atlas.servidor.domain.Simulation
import io.atlas.servidor.ui.navigation.Produtos
import kotlinx.coroutines.launch

/**
 * Portabilidade: lista os empréstimos que o servidor tem em OUTROS bancos (importados pela
 * prefeitura + trazidos pelo servidor de teste) e permite trazê-los para o Banco Atlas. Ao
 * solicitar, o banco recebe em "Propostas e Portabilidade" com os dados do contrato de origem
 * e o telefone do servidor; a margem de empréstimo consignado fica reservada por até 5 dias.
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
    var submitError by mutableStateOf<String?>(null)
        private set
    /** Já há empréstimo/portabilidade EM ANÁLISE → não permite nova portabilidade (margem reservada). */
    var emprestimoEmAnalise by mutableStateOf(false)
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
                emprestimoEmAnalise = try {
                    repo.getPropostas(matriculaAtiva).propostas.any {
                        isReservaPendente(it.situacao) && produtoDaProposta(it.tipoContrato, it.tipoMargem) == Produtos.EMPRESTIMO
                    }
                } catch (e: ApiException) { false }
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

    /** Solicita a portabilidade do contrato escolhido — o banco recebe os dados de origem + telefone.
     *  A margem de empréstimo consignado fica reservada por até 5 dias (regra igual à do empréstimo). */
    fun solicitar(e: ElegivelDto, onDone: () -> Unit) {
        val mat = matriculaAtiva ?: return
        if (submitting || emprestimoEmAnalise) return
        submitting = true
        submitError = null
        viewModelScope.launch {
            try {
                repo.solicitarPortabilidade(mat, e.id)
                prefs.setSimLock(mat, Produtos.EMPRESTIMO)
                emprestimoEmAnalise = true
                submitting = false
                onDone()
            } catch (ex: ApiException) {
                submitting = false
                submitError = ex.userMessage
            }
        }
    }
}
