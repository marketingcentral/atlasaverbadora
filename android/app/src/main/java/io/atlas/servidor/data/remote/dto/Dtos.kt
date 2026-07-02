package io.atlas.servidor.data.remote.dto

import com.google.gson.annotations.SerializedName

// ---------- Auth ----------

data class LoginRequest(
    val identifier: String,
    val password: String,
    @SerializedName("device_id") val deviceId: String? = null,
)

data class RefreshRequest(
    @SerializedName("refresh_token") val refreshToken: String,
)

data class AuthUser(
    val id: Long,
    val nome: String,
    val role: String,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
)

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    @SerializedName("expires_in") val expiresIn: Long,
    val role: String,
    val user: AuthUser,
)

// ---------- Error envelope ----------

data class ApiErrorBody(val error: ApiErrorDetail?)
data class ApiErrorDetail(
    val code: String?,
    val message: String?,
    @SerializedName("trace_id") val traceId: String? = null,
)

// ---------- Primeiro acesso ----------

data class CpfRequest(val cpf: String)

data class PrimeiroAcessoBuscarResponse(
    val encontrado: Boolean,
    val nome: String? = null,
    val matricula: String? = null,
    val cargo: String? = null,
    val origem: String? = null,
    @SerializedName("email_masked") val emailMasked: String? = null,
    @SerializedName("telefone_masked") val telefoneMasked: String? = null,
    @SerializedName("ja_tem_senha") val jaTemSenha: Boolean = false,
)

data class CodigoResponse(
    val enviado: Boolean,
    val destino: String? = null,
    @SerializedName("codigo_teste") val codigoTeste: String? = null,
)

data class DefinirSenhaRequest(val cpf: String, val codigo: String, val senha: String)

data class OkResponse(val ok: Boolean = false)

// ---------- Proposta (servidor -> banco) ----------

data class CriarPropostaRequest(
    val valor: Double,
    val parcelas: Int,
    val taxaAm: Double,
    val matricula: String? = null,
    val bancoNome: String? = null,
)

data class PropostaResponse(
    val id: String,
    val situacao: String? = null,
    val banco: String? = null,
    val valor: Double = 0.0,
    val parcelas: Int = 0,
    val parcela: Double = 0.0,
)

// ---------- Servidor profile ----------

data class MeResponse(
    val id: Long,
    val nome: String,
    @SerializedName("cpf_masked") val cpfMasked: String,
    val matricula: String,
    @SerializedName("prefeitura_id") val prefeituraId: Long,
    val vinculo: String,
    @SerializedName("situacao_funcional") val situacaoFuncional: String,
    val status: String,
)

// ---------- Ofertas (marketplace) ----------

data class OfertasResponse(val ofertas: List<OfertaDto>)

data class OfertaDto(
    val id: String,
    val bancoNome: String,
    val convenioId: String,
    val convenio: String,
    val cidade: String,
    val taxaMinAm: Double,
    val taxaMaxAm: Double,
    val prazoMaxMeses: Int,
    val vigenciaInicio: String,
    val vigenciaFim: String? = null,
)

// ---------- Matriculas (full snapshot: margem + contratos + portabilidade) ----------

data class MatriculasResponse(val matriculas: List<MatriculaInfoDto>)

data class MatriculaInfoDto(
    val idMatricula: String,
    val matricula: String,
    val prefeitura: String,
    @SerializedName("prefeitura_id") val prefeituraId: Long,
    @SerializedName("servidor_id") val servidorId: Long,
    val uf: String,
    val cargo: String,
    val vinculo: String,
    val nome: String,
    val email: String,
    val telefone: String,
    val endereco: String,
    val ativa: Boolean,
    val margem: MargemBlockDto,
    val contratos: List<ContratoDto> = emptyList(),
    val elegiveisPortabilidade: List<ElegivelDto> = emptyList(),
)

data class MargemBlockDto(
    @SerializedName("servidor_id") val servidorId: Long,
    val matricula: String,
    @SerializedName("prefeitura_id") val prefeituraId: Long,
    val margem: MargemValoresDto,
    @SerializedName("margens_por_tipo") val margensPorTipo: List<MargemTipoDto> = emptyList(),
    val fonte: FonteDto? = null,
)

data class MargemValoresDto(
    @SerializedName("salario_base") val salarioBase: Double,
    val comprometido: Double,
    val disponivel: Double,
    @SerializedName("percentual_uso") val percentualUso: Double,
)

data class MargemTipoDto(
    val tipo: String,
    val total: Double,
    val disponivel: Double,
)

data class FonteDto(
    val tipo: String,
    @SerializedName("sincronizado_em") val sincronizadoEm: String? = null,
    @SerializedName("cache_status") val cacheStatus: String? = null,
)

data class ContratoDto(
    val id: String,
    val banco: String,
    val parcela: Double,
    val parcelasPagas: Int,
    val total: Int,
    val status: String,
    val proximaParcela: String? = null,
    val taxaAm: Double,
    val valorFinanciado: Double,
    val pdfUrl: String? = null,
)

data class ElegivelDto(
    val id: String,
    val banco: String,
    val saldoDevedor: Double,
    val parcela: Double,
    val parcelasRestantes: Int,
    val totalParcelas: Int,
    val taxaAm: Double,
    val tipoContrato: String,
)
