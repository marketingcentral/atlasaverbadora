package io.atlas.servidor.ui.simular

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.isReservaPendente
import io.atlas.servidor.core.produtoDaProposta
import io.atlas.servidor.data.local.ProposalRequestEntity
import io.atlas.servidor.data.remote.dto.MatriculaInfoDto
import io.atlas.servidor.data.remote.dto.OfertaDto
import io.atlas.servidor.domain.Simulation
import io.atlas.servidor.ui.navigation.Produtos
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

    /** Produto simulado. Só troca qual margem limita a parcela — o cálculo é o mesmo. */
    var produto by mutableStateOf(Produtos.EMPRESTIMO)
        private set

    val produtoLabel: String
        get() = if (produto == Produtos.CARTAO_CONSIGNADO) "Cartão de Crédito Consignado" else "Empréstimo Consignado"

    init { load() }

    /** Define o produto antes/depois do load — recalcula o valor sugerido pela margem certa. */
    fun selecionarProduto(p: String) {
        if (produto == p) return
        produto = p
        valor = round((valorMaximo * 0.6).coerceIn(500.0, maxOf(500.0, valorMaximo)))
    }

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
                // Banco aprovou / proposta encerrou → sem reserva pendente DESTE produto → libera a trava.
                try {
                    val props = repo.getPropostas(prefs.selectedMatricula).propostas
                    val pendenteDoProduto = props.any {
                        isReservaPendente(it.situacao) && produtoDaProposta(it.tipoContrato) == produto
                    }
                    if (!pendenteDoProduto) {
                        (matricula?.matricula ?: prefs.selectedMatricula)?.let { prefs.clearSimLock(it, produto) }
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

    /** Margem que limita a parcela deste produto. Empréstimo usa o bloco `margem`;
     *  cartão de crédito consignado usa a linha correspondente de `margens_por_tipo`. */
    val margemDisponivel: Double
        get() {
            val m = matricula ?: return 0.0
            if (produto == Produtos.EMPRESTIMO) return m.margem.margem.disponivel
            return m.margem.margensPorTipo.firstOrNull { it.tipo == produto }?.disponivel ?: 0.0
        }

    val valorMaximo: Double get() = Simulation.valorMaximo(margemDisponivel, parcelas, taxaAm)

    // ---- Cartão de crédito consignado (fluxo próprio, igual à web) ----
    /** Margem mensal disponível do cartão consignado (5% do salário). */
    val margemCartaoConsignado: Double
        get() = matricula?.margem?.margensPorTipo?.firstOrNull { it.tipo == Produtos.CARTAO_CONSIGNADO }?.disponivel ?: 0.0

    /** Limite proposto do cartão: 30× a margem mensal (mesma regra da web). */
    val limiteCartao: Double get() = kotlin.math.floor(margemCartaoConsignado * 30.0)

    /** Solicita o cartão de crédito consignado no MESMO endpoint da web (/me/cartoes):
     *  cria reserva ECONSIGNADO no bucket do cartão — o banco recebe como cartão. */
    fun solicitarCartao(onDone: () -> Unit) {
        val m = matricula ?: return
        if (lockExpiry() != null) return // já há uma solicitação de cartão em análise (trava 48h)
        submitting = true
        submitError = null
        viewModelScope.launch {
            try {
                repo.solicitarCartao("cartao_consignado", "Banco Atlas", limiteCartao, m.matricula)
                prefs.setSimLock(m.matricula, Produtos.CARTAO_CONSIGNADO)
                submitting = false
                onDone()
            } catch (e: ApiException) {
                submitting = false
                submitError = "Não foi possível enviar sua solicitação ao banco: ${e.userMessage}"
            }
        }
    }

    /** Expiração da trava de 48h da matrícula atual (null se liberada). Chave = matrícula.
     *  Usa a matrícula do VM ou, se ainda não carregou, a selecionada nas prefs. */
    fun lockExpiry(): Long? {
        val mat = matricula?.matricula ?: prefs.selectedMatricula ?: return null
        return prefs.simLockExpiry(mat, produto)
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
                repo.criarProposta(r.valor, r.parcelas, taxaAm, m.matricula, "Banco Atlas", produto)
                // SÓ trava a margem e avança se a proposta REALMENTE foi criada no servidor.
                // Trava só ESTE produto — outros produtos seguem liberados.
                prefs.setSimLock(m.matricula, produto)
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
