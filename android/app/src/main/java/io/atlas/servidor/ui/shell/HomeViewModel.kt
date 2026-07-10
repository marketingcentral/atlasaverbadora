package io.atlas.servidor.ui.shell

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.UiState
import io.atlas.servidor.core.isReservaPendente
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

    // null = ainda não consultado; true = há proposta em análise (margem bloqueada);
    // false = nenhuma reserva pendente (aprovada/encerrada) → margem liberada.
    var reservaPendente by mutableStateOf<Boolean?>(null)
        private set

    // Propostas cruas (fonte do banco) — usadas pelo Histórico de Contratos (recusadas).
    var propostas by mutableStateOf<List<io.atlas.servidor.data.remote.dto.PropostaDto>>(emptyList())
        private set

    // Aba pedida ao abrir Contratos (0 Ativos, 1 Em análise, 2 Histórico). Lida uma única vez.
    private var contratosTabRequest: Int? = null

    /** Abre Contratos já numa aba específica (ex.: após solicitar, cai em "Em análise"). */
    fun pedirAbaContratos(index: Int) { contratosTabRequest = index }

    /** Consome o pedido de aba — retorna null se não havia. */
    fun consumirAbaContratos(): Int? = contratosTabRequest.also { contratosTabRequest = null }

    // Notificações derivadas das propostas (sino do Início) + estado lida/dispensada.
    private var notifRaw by mutableStateOf<List<io.atlas.servidor.domain.AppNotif>>(emptyList())
    private var notifReadIds by mutableStateOf(prefs.readNotifIds())
    private var notifDismissed by mutableStateOf(prefs.dismissedNotifIds())

    /** Notificações visíveis (exclui as já limpas). */
    val notificacoes: List<io.atlas.servidor.domain.AppNotif> get() = notifRaw.filter { it.id !in notifDismissed }
    val notifNaoLidas: Int get() = notificacoes.count { it.id !in notifReadIds }
    fun notifLida(id: String): Boolean = id in notifReadIds

    fun marcarNotificacoesLidas() {
        prefs.markNotifsRead(notificacoes.map { it.id })
        notifReadIds = prefs.readNotifIds()
    }

    /** Limpa (dispensa) as notificações visíveis — somem da lista. */
    fun limparNotificacoes() {
        prefs.dismissNotifs(notificacoes.map { it.id })
        notifDismissed = prefs.dismissedNotifIds()
    }

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
                reconcileReserva()
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

    /** Confere no servidor se a matrícula ativa ainda tem proposta EM ANÁLISE. Se não tiver
     *  (banco aprovou ou proposta encerrou), remove a trava local — libera a margem sem
     *  esperar as 48h. */
    private suspend fun reconcileReserva() {
        try {
            val r = repo.getPropostas(selectedMatricula)
            propostas = r.propostas
            notifRaw = io.atlas.servidor.domain.Notificacoes.fromPropostas(r.propostas)
            val pending = r.propostas.any { isReservaPendente(it.situacao) }
            reservaPendente = pending
            if (!pending) selectedMatricula?.let { prefs.clearSimLock(it) }
        } catch (_: ApiException) {
            // sem rede: mantém a trava local como estava
        }
    }

    /** Expiração da trava da matrícula ativa (null se liberada). Enquanto a proposta está
     *  em análise vale a trava de 48h; após a aprovação a reserva deixa de ser pendente. */
    fun lockExpiry(): Long? {
        val mat = current()?.matricula ?: selectedMatricula ?: return null
        val exp = prefs.simLockExpiry(mat) ?: return null
        return if (reservaPendente == false) null else exp
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            auth.logout()
            onDone()
        }
    }
}
