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

    /** Comunicados publicados pela averbadora para o servidor (slides do início). */
    @GET("v1/servidores/me/comunicados")
    suspend fun comunicados(): io.atlas.servidor.data.remote.dto.ComunicadosResponse

    /** Solicita um cartão (consignado/benefício) — mesmo fluxo da web. */
    @POST("v1/servidores/me/cartoes")
    suspend fun solicitarCartao(@Body body: io.atlas.servidor.data.remote.dto.SolicitarCartaoRequest): io.atlas.servidor.data.remote.dto.SolicitarCartaoResponse

    /** Solicita cotação de telemedicina — a averbadora recebe os dados do servidor (telefone). */
    @POST("v1/servidores/me/telemedicina/cotacao")
    suspend fun solicitarCotacaoTelemedicina(@Body body: io.atlas.servidor.data.remote.dto.CotacaoTelemedicinaRequest): io.atlas.servidor.data.remote.dto.OkResponse

    /** Cotações de telemedicina do próprio servidor (situação/data). */
    @GET("v1/servidores/me/telemedicina/cotacoes")
    suspend fun minhasCotacoesTelemedicina(): io.atlas.servidor.data.remote.dto.MinhasCotacoesResponse

    /** Termo de aceite renderizado — texto configurado em /averbadora/termos.
     *  `vars` é um JSON com as variáveis ({{valor}}, {{banco}}, …). */
    @GET("v1/servidores/me/termos/{tipo}")
    suspend fun getTermo(
        @retrofit2.http.Path("tipo") tipo: String,
        @retrofit2.http.Query("vars") vars: String?,
    ): io.atlas.servidor.data.remote.dto.TermoResponse

    /** Benefícios/parceiros por categoria (ex.: "saude" para a Telemedicina). */
    @GET("v1/servidores/me/beneficios")
    suspend fun beneficios(
        @retrofit2.http.Query("categoria") categoria: String?,
        @retrofit2.http.Query("matricula") matricula: String?,
    ): io.atlas.servidor.data.remote.dto.BeneficiosResponse

    /** Solicita portabilidade — o banco recebe o pedido e avalia os contratos do servidor. */
    @POST("v1/servidores/me/portabilidade/solicitar")
    suspend fun solicitarPortabilidade(@Body body: io.atlas.servidor.data.remote.dto.SolicitarPortabilidadeRequest): io.atlas.servidor.data.remote.dto.PortabilidadeSolicitadaResponse

    @POST("v1/servidores/me/propostas")
    suspend fun criarProposta(@Body body: io.atlas.servidor.data.remote.dto.CriarPropostaRequest): io.atlas.servidor.data.remote.dto.PropostaResponse

    @GET("v1/servidores/me/propostas")
    suspend fun propostas(@retrofit2.http.Query("matricula") matricula: String?): io.atlas.servidor.data.remote.dto.PropostasResponse

    /** Remove as propostas EM ANÁLISE (fase de teste). Retorna quantas saíram. */
    @retrofit2.http.DELETE("v1/servidores/me/propostas")
    suspend fun removerPropostasEmAnalise(@retrofit2.http.Query("matricula") matricula: String?): io.atlas.servidor.data.remote.dto.RemoverPropostasResponse

    @POST("v1/servidores/me/codigo")
    suspend fun contaCodigo(): io.atlas.servidor.data.remote.dto.CodigoResponse

    @POST("v1/servidores/me/contato")
    suspend fun atualizarContato(@Body body: io.atlas.servidor.data.remote.dto.ContatoRequest): io.atlas.servidor.data.remote.dto.OkResponse

    @POST("v1/servidores/me/senha")
    suspend fun alterarSenha(@Body body: io.atlas.servidor.data.remote.dto.AlterarSenhaRequest): io.atlas.servidor.data.remote.dto.OkResponse

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
    suspend fun primeiroAcessoCodigo(@Body body: io.atlas.servidor.data.remote.dto.PaCodigoRequest): CodigoResponse

    @POST("v1/auth/primeiro-acesso/senha")
    suspend fun primeiroAcessoSenha(@Body body: io.atlas.servidor.data.remote.dto.PaConfirmarRequest): OkResponse

    @POST("v1/auth/esqueci-senha/solicitar-email")
    suspend fun esqueciSolicitarEmail(@Body body: io.atlas.servidor.data.remote.dto.EsqueciEmailRequest): io.atlas.servidor.data.remote.dto.EsqueciSolicitarResponse

    @POST("v1/auth/esqueci-senha/solicitar")
    suspend fun esqueciSolicitar(@Body body: io.atlas.servidor.data.remote.dto.EsqueciCpfRequest): io.atlas.servidor.data.remote.dto.EsqueciSolicitarResponse

    @POST("v1/auth/esqueci-senha/redefinir")
    suspend fun esqueciRedefinir(@Body body: io.atlas.servidor.data.remote.dto.RedefinirSenhaRequest): OkResponse
}
