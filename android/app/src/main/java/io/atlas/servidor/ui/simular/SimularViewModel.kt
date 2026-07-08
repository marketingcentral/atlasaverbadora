package io.atlas.servidor.ui.simular

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.isReservaPendente
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
    var submitError by mutableStateOf<String?>(null)
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
                // Banco aprovou / proposta encerrou → sem reserva pendente → libera a trava.
                try {
                    val props = repo.getPropostas(prefs.selectedMatricula).propostas
                    if (props.none { isReservaPendente(it.situacao) }) {
                        (matricula?.matricula ?: prefs.selectedMatricula)?.let { prefs.clearSimLock(it) }
                    }
                } catch (_: ApiException) { /* sem rede: mantém a trava */ }
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

    /** Expiração da trava de 48h da matrícula atual (null se liberada). Chave = matrícula.
     *  Usa a matrícula do VM ou, se ainda não carregou, a selecionada nas prefs. */
    fun lockExpiry(): Long? {
        val mat = matricula?.matricula ?: prefs.selectedMatricula ?: return null
        return prefs.simLockExpiry(mat)
    }

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
        // A averbadora opera, por ora, apenas com o Banco Atlas — nome exibido fixo.
        bancoNome = "Banco Atlas"
        cidade = o.cidade
        if (parcelas > o.prazoMaxMeses) parcelas = o.prazoMaxMeses
        valor = valor.coerceAtMost(maxOf(500.0, valorMaximo))
    }

    fun solicitar(onDone: () -> Unit) {
        val m = matricula ?: return
        if (lockExpiry() != null) return // já há uma pré-reserva ativa (trava de 48h)
        submitting = true
        submitError = null
        val r = result()
        viewModelScope.launch {
            try {
                // Envia ao ecossistema: cria a proposta que PERSISTE no Postgres e o BANCO recebe.
                repo.criarProposta(r.valor, r.parcelas, taxaAm, m.matricula, "Banco Atlas")
                // SÓ trava a margem e avança se a proposta REALMENTE foi criada no servidor.
                prefs.setSimLock(m.matricula)
                submitting = false
                onDone()
            } catch (e: ApiException) {
                // Falhou de verdade — NÃO trava, NÃO avança, e mostra o erro pro servidor.
                submitting = false
                submitError = "Não foi possível enviar sua solicitação ao banco: ${e.userMessage}"
            }
        }
    }

    fun limparErro() { submitError = null }
}
