package io.atlas.servidor.data.repository

import com.google.gson.Gson
import io.atlas.servidor.core.ApiException
import io.atlas.servidor.core.AppPrefs
import io.atlas.servidor.core.safeApi
import io.atlas.servidor.data.local.AppDatabase
import io.atlas.servidor.data.local.TokenStore
import io.atlas.servidor.data.remote.ApiService
import io.atlas.servidor.data.remote.AuthApi
import io.atlas.servidor.data.remote.dto.AuthResponse
import io.atlas.servidor.data.remote.dto.LoginRequest

class AuthRepository(
    private val authApi: AuthApi,
    private val api: ApiService,
    private val tokenStore: TokenStore,
    private val db: AppDatabase,
    private val prefs: AppPrefs,
    private val gson: Gson,
) {
    val isLoggedIn: Boolean get() = tokenStore.isLoggedIn
    val userName: String? get() = tokenStore.userName

    /** Logs in by CPF (or formatted CPF — the backend normalises). Servidor-only app. */
    suspend fun login(identifier: String, password: String): AuthResponse {
        val auth = safeApi(gson) {
            authApi.login(LoginRequest(identifier.trim(), password, prefs.deviceId))
        }
        if (auth.role != "servidor") {
            throw ApiException("Este aplicativo é exclusivo para servidores públicos.")
        }
        // SEGURANÇA: zera qualquer dado local do usuário anterior antes de abrir a
        // nova sessão — evita que dados em cache (matrículas/ofertas/pré-reservas)
        // de outra conta apareçam para este usuário.
        db.cacheDao().clear()
        db.proposalDao().clear()
        prefs.clearSelection()
        tokenStore.saveSession(auth)
        return auth
    }

    // ---- Primeiro acesso (endpoints não autenticados) ----
    suspend fun paBuscar(cpf: String) =
        safeApi(gson) { authApi.primeiroAcessoBuscar(io.atlas.servidor.data.remote.dto.CpfRequest(cpf)) }

    suspend fun paEnviarCodigo(cpf: String, email: String? = null, telefone: String? = null) =
        safeApi(gson) { authApi.primeiroAcessoCodigo(io.atlas.servidor.data.remote.dto.PaCodigoRequest(cpf, email, telefone)) }

    suspend fun paDefinirSenha(cpf: String, codigo: String, senha: String) =
        safeApi(gson) {
            authApi.primeiroAcessoSenha(io.atlas.servidor.data.remote.dto.DefinirSenhaRequest(cpf, codigo, senha))
        }

    suspend fun logout() {
        try {
            safeApi(gson) { api.logout() }
        } catch (_: Exception) {
            // Logout is best-effort; local session is cleared regardless.
        }
        tokenStore.clear()
        prefs.clearSelection()
        db.cacheDao().clear()
        db.proposalDao().clear()
    }
}
