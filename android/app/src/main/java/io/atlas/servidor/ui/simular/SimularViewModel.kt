package io.atlas.servidor.ui.simular

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.data.local.ProposalRequestEntity
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.OfertaDto
import io.atlas.servidor.domain.Simulation
import kotlinx.coroutines.launch
import kotlin.math.round

class SimularViewModel : ViewModel() {
    private val repo = ServiceLocator.servidorRepository
    private val prefs = ServiceLocator.appPrefs

    var loading by mutableStateOf(true)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var submitting by mutableStateOf(false)
        private set

    var matricula by mutableStateOf<MatriculaInfoDto?>(null)
        private set
    var ofertas by mutableStateOf<List<OfertaDto>>(emptyList())
        private set

    var valor by mutableStateOf(0.0)
        private set
    var parcelas by mutableStateOf(48)
        private set
    var taxaAm by mutableStateOf(0.0179)
        private set
    var bancoNome by mutableStateOf("")
        private set
    var cidade by mutableStateOf("")
        private set

    init { load() }

    fun load() {
        viewModelScope.launch {
            loading = true
            error = null
            try {
                val mres = repo.matriculas()
                matricula = mres.data.matriculas.firstOrNull { it.matricula == prefs.selectedMatricula }
                    ?: mres.data.matriculas.firstOrNull()
                ofertas = try { repo.ofertas().data.ofertas } catch (e: ApiException) { emptyList() }
                ofertas.firstOrNull()?.let { selectOferta(it) }
                // Start at ~60% of the maximum that fits the margin.
                valor = round((valorMaximo * 0.6).coerceIn(500.0, maxOf(500.0, valorMaximo)))
            } catch (e: ApiException) {
                error = e.userMessage
            } finally {
                loading = false
            }
        }
    }

    val margemDisponivel: Double get() = matricula?.margem?.margem?.disponivel ?: 0.0
    val valorMaximo: Double get() = Simulation.valorMaximo(margemDisponivel, parcelas, taxaAm)

    fun result(): Simulation.Result = Simulation.simular(valor, parcelas, taxaAm, margemDisponivel)

    fun updateValor(v: Double) {
        valor = v.coerceIn(500.0, maxOf(500.0, valorMaximo))
    }

    fun updateParcelas(p: Int) {
        parcelas = p
        valor = valor.coerceAtMost(maxOf(500.0, valorMaximo))
    }

    fun selectOferta(o: OfertaDto) {
        taxaAm = o.taxaMinAm
        bancoNome = o.bancoNome
        cidade = o.cidade
        if (parcelas > o.prazoMaxMeses) parcelas = o.prazoMaxMeses
        valor = valor.coerceAtMost(maxOf(500.0, valorMaximo))
    }

    fun solicitar(onDone: () -> Unit) {
        val m = matricula ?: return
        submitting = true
        viewModelScope.launch {
            val r = result()
            repo.createProposal(
                ProposalRequestEntity(
                    matricula = m.matricula,
                    bancoNome = bancoNome.ifBlank { "Banco parceiro" },
                    cidade = cidade,
                    valor = r.valor,
                    parcelas = r.parcelas,
                    parcelaMensal = r.parcelaMensal,
                    taxaAm = taxaAm,
                    createdAt = System.currentTimeMillis(),
                    status = "EM_ANALISE",
                ),
            )
            submitting = false
            onDone()
        }
    }
}
