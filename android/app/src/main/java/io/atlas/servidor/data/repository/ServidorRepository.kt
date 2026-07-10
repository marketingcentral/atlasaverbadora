package io.atlas.servidor.data.repository

import com.google.gson.Gson
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.CachedData
import io.atlas.servidor.core.safeApi
import io.atlas.servidor.data.local.AppDatabase
import io.atlas.servidor.data.local.CacheEntity
import io.atlas.servidor.data.local.ProposalRequestEntity
import io.atlas.servidor.data.local.TokenStore
import io.atlas.servidor.data.remote.ApiService
import io.atlas.servidor.data.remote.dto.MatriculasResponse
import io.atlas.servidor.data.remote.dto.MeResponse
import io.atlas.servidor.data.remote.dto.OfertasResponse
import kotlinx.coroutines.flow.Flow

class ServidorRepository(
    private val api: ApiService,
    private val db: AppDatabase,
    private val gson: Gson,
    private val tokenStore: TokenStore,
) {
    suspend fun me(): MeResponse = safeApi(gson) { api.me() }

    suspend fun matriculas(forceRefresh: Boolean = false): CachedData<MatriculasResponse> =
        cachedRead(userKey(KEY_MATRICULAS), MatriculasResponse::class.java, forceRefresh) { api.matriculas() }

    suspend fun ofertas(forceRefresh: Boolean = false): CachedData<OfertasResponse> =
        cachedRead(userKey(KEY_OFERTAS), OfertasResponse::class.java, forceRefresh) { api.ofertas() }

    /** Cache keys são escopadas ao usuário logado — nunca compartilham entre contas. */
    private fun userKey(base: String) = "$base:${tokenStore.userId}"

    /** Lista as propostas do servidor direto do servidor (mesma fonte que o banco lê). */
    suspend fun getPropostas(matricula: String?) = safeApi(gson) { api.propostas(matricula) }

    /** Remove as propostas EM ANÁLISE (fase de teste). */
    suspend fun removerPropostasEmAnalise(matricula: String?) = safeApi(gson) { api.removerPropostasEmAnalise(matricula) }

    /** Envia a proposta ao ecossistema — cria a pré-reserva que o banco recebe. */
    suspend fun criarProposta(valor: Double, parcelas: Int, taxaAm: Double, matricula: String, bancoNome: String) =
        safeApi(gson) {
            api.criarProposta(
                io.atlas.servidor.data.remote.dto.CriarPropostaRequest(valor, parcelas, taxaAm, matricula, bancoNome),
            )
        }

    // ---- Conta: alterar contato / senha (código por e-mail) ----
    suspend fun enviarCodigoConta() = safeApi(gson) { api.contaCodigo() }

    suspend fun atualizarContato(codigo: String, email: String?, telefone: String?) =
        safeApi(gson) { api.atualizarContato(io.atlas.servidor.data.remote.dto.ContatoRequest(codigo, email, telefone)) }

    suspend fun alterarSenha(senhaAtual: String, codigo: String, novaSenha: String) =
        safeApi(gson) { api.alterarSenha(io.atlas.servidor.data.remote.dto.AlterarSenhaRequest(senhaAtual, codigo, novaSenha)) }

    /** Network-first with offline fallback: on failure, returns the last cached copy if any. */
    private suspend fun <T> cachedRead(
        key: String,
        clazz: Class<T>,
        forceRefresh: Boolean,
        block: suspend () -> T,
    ): CachedData<T> {
        try {
            val fresh = safeApi(gson) { block() }
            db.cacheDao().put(CacheEntity(key, gson.toJson(fresh), System.currentTimeMillis()))
            return CachedData(fresh, fromCache = false)
        } catch (e: ApiException) {
            val cached = db.cacheDao().get(key)
            if (cached != null) {
                val data = gson.fromJson(cached.json, clazz)
                return CachedData(data, fromCache = true, note = "Exibindo dados salvos. ${e.userMessage}")
            }
            throw e
        }
    }

    // ---- Local proposal requests (simular → solicitar) ----

    fun observeProposals(matricula: String): Flow<List<ProposalRequestEntity>> =
        db.proposalDao().observeByMatricula(matricula)

    suspend fun createProposal(entity: ProposalRequestEntity): Long =
        db.proposalDao().insert(entity)

    suspend fun deleteProposal(id: Long) = db.proposalDao().delete(id)

    private companion object {
        const val KEY_MATRICULAS = "servidores_me_matriculas"
        const val KEY_OFERTAS = "servidores_me_ofertas"
    }
}
