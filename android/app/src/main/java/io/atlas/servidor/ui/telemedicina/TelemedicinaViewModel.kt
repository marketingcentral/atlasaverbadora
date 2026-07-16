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

    // Cotação de telemedicina: idle → enviando → enviada; erro guarda a mensagem.
    var cotacaoEnviando by mutableStateOf(false)
        private set
    var cotacaoEnviada by mutableStateOf(false)
        private set
    var cotacaoErro by mutableStateOf<String?>(null)
        private set
    /** Já existe cotação em andamento (nova/contatado) → esconde o botão, mostra "em análise". */
    var cotacaoPendente by mutableStateOf(false)
        private set
    /** Progresso (0..1) do plano ATIVO (fechado) — null se não há plano ativo. */
    var planoProgresso by mutableStateOf<Float?>(null)
        private set
    var planoMesesRestantes by mutableStateOf(0)
        private set

    init { load(); carregarCotacoes() }

    /** Recarrega ao (re)entrar na tela — reflete a aprovação da averbadora sem reabrir o app. */
    fun recarregar() { load(); carregarCotacoes() }

    fun carregarCotacoes() {
        viewModelScope.launch {
            try {
                val r = repo.minhasCotacoesTelemedicina()
                cotacaoPendente = r.cotacoes.any { it.situacao == "nova" || it.situacao == "contatado" }
                val ativa = r.cotacoes.firstOrNull { it.situacao == "fechado" }
                if (ativa?.ativadoEm != null) {
                    val ini = runCatching { java.time.Instant.parse(ativa.ativadoEm).toEpochMilli() }.getOrNull()
                    if (ini != null) {
                        val fim = ini + 12L * 30 * 24 * 3600 * 1000
                        val agora = System.currentTimeMillis()
                        planoProgresso = ((agora - ini).toFloat() / (fim - ini)).coerceIn(0f, 1f)
                        planoMesesRestantes = (((fim - agora).toDouble() / (30.0 * 24 * 3600 * 1000)).let { Math.ceil(it) }).toInt().coerceAtLeast(0)
                    }
                } else {
                    planoProgresso = null
                }
            } catch (_: ApiException) { /* mantém estado */ }
        }
    }

    /** Envia a cotação de telemedicina (a averbadora recebe os dados do servidor). */
    fun solicitarCotacao(onSucesso: () -> Unit) {
        if (cotacaoEnviando) return
        viewModelScope.launch {
            cotacaoEnviando = true; cotacaoErro = null
            try {
                repo.solicitarCotacaoTelemedicina(prefs.selectedMatricula)
                cotacaoEnviada = true
                cotacaoPendente = true // esconde o botão na hora
                onSucesso()
            } catch (e: ApiException) {
                cotacaoErro = e.userMessage
            } finally {
                cotacaoEnviando = false
            }
        }
    }

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
