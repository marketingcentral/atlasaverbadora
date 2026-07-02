package io.atlas.servidor.data.remote

import io.atlas.servidor.data.remote.dto.AuthResponse
import io.atlas.servidor.data.remote.dto.CodigoResponse
import io.atlas.servidor.data.remote.dto.CpfRequest
import io.atlas.servidor.data.remote.dto.DefinirSenhaRequest
import io.atlas.servidor.data.remote.dto.LoginRequest
import io.atlas.servidor.data.remote.dto.MatriculasResponse
import io.atlas.servidor.data.remote.dto.OkResponse
import io.atlas.servidor.data.remote.dto.PrimeiroAcessoBuscarResponse
import io.atlas.servidor.data.remote.dto.MeResponse
import io.atlas.servidor.data.remote.dto.OfertasResponse
import io.atlas.servidor.data.remote.dto.RefreshRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/** Authenticated Atlas API surface used by the servidor app. */
interface ApiService {
    @GET("v1/servidores/me")
    suspend fun me(): MeResponse

    @GET("v1/servidores/me/matriculas")
    suspend fun matriculas(): MatriculasResponse

    @GET("v1/servidores/me/ofertas")
    suspend fun ofertas(): OfertasResponse

    @POST("v1/auth/logout")
    suspend fun logout(): Response<Unit>
}

/** Unauthenticated endpoints (login/refresh) — no bearer, no auto-refresh loop. */
interface AuthApi {
    @POST("v1/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("v1/auth/refresh")
    suspend fun refresh(@Body body: RefreshRequest): AuthResponse

    @POST("v1/auth/primeiro-acesso/buscar")
    suspend fun primeiroAcessoBuscar(@Body body: CpfRequest): PrimeiroAcessoBuscarResponse

    @POST("v1/auth/primeiro-acesso/codigo")
    suspend fun primeiroAcessoCodigo(@Body body: CpfRequest): CodigoResponse

    @POST("v1/auth/primeiro-acesso/senha")
    suspend fun primeiroAcessoSenha(@Body body: DefinirSenhaRequest): OkResponse
}
