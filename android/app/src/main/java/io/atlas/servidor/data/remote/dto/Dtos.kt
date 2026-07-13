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

/** Primeiro acesso — passo Dados: e-mail + senha (guardados pendentes) + telefone; o código
 *  de verificação é enviado para o e-mail informado. */
data class PaCodigoRequest(val cpf: String, val email: String, val senha: String, val telefone: String? = null)

/** Primeiro acesso — passo Código: confirma o código e efetiva o cadastro. */
data class PaConfirmarRequest(val cpf: String, val codigo: String)

/** Esqueci minha senha (por e-mail): valida o e-mail e envia o código pra ele. */
data class EsqueciEmailRequest(val email: String)
data class EsqueciSolicitarResponse(val enviado: Boolean = false, val cpf: String? = null, val destino: String? = null)

/** Redefinir senha: valida o código e grava a nova senha. */
data class RedefinirSenhaRequest(val cpf: String, val codigo: String, val senha: String)

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

data class ContatoRequest(val codigo: String, val email: String? = null, val telefone: String? = null)

data class AlterarSenhaRequest(
    @SerializedName("senha_atual") val senhaAtual: String,
    val codigo: String,
    @SerializedName("nova_senha") val novaSenha: String,
)

// ---------- Proposta (servidor -> banco) ----------

data class CriarPropostaRequest(
    val valor: Double,
    val parcelas: Int,
    val taxaAm: Double,
    val matricula: String? = null,
    val bancoNome: String? = null,
    val produto: String? = null,
)

data class PropostaResponse(
    val id: String,
    val situacao: String? = null,
    val banco: String? = null,
    val valor: Double = 0.0,
    val parcelas: Int = 0,
    val parcela: Double = 0.0,
    @SerializedName("expira_em") val expiraEm: String? = null,
)

/** Proposta como o BANCO vê (fonte compartilhada, persistida no Postgres). */
data class PropostaDto(
    val id: String,
    val banco: String? = null,
    val valor: Double = 0.0,
    val parcelas: Int = 0,
    val parcela: Double = 0.0,
    val taxaAm: Double = 0.0, // já em % (ex.: 1.79)
    val situacao: String? = null,
    val tipoContrato: String? = null,
    val folhaStatus: String? = null,
    val folhaMotivo: String? = null,
    val data: String? = null,
    @SerializedName("expira_em") val expiraEm: String? = null,
)

data class PropostasResponse(val propostas: List<PropostaDto> = emptyList())

data class RemoverPropostasResponse(val removidas: Int = 0, val ids: List<String> = emptyList())

/** Solicitação de cartão (consignado/benefício) — mesmo endpoint da web (/me/cartoes).
 *  Cria uma reserva ECONSIGNADO no bucket de margem do cartão; o banco recebe como cartão. */
data class SolicitarCartaoRequest(
    val produto: String, // "cartao_consignado" | "cartao_beneficio"
    val bancoNome: String,
    val limite: Double,
    val matricula: String? = null,
)

data class SolicitarCartaoResponse(
    val ok: Boolean = false,
    val protocolo: String? = null,
    val produto: String? = null,
    val bancoNome: String? = null,
    val limite: Double = 0.0,
    val mensagem: String? = null,
)

/** Comunicado publicado pela averbadora com público-alvo "servidor" (aparece nos slides). */
data class ComunicadoDto(
    val id: String,
    val titulo: String,
    val corpo: String,
    val linkLabel: String? = null,
    val linkHref: String? = null,
)

data class ComunicadosResponse(val comunicados: List<ComunicadoDto> = emptyList())

/** Benefício/parceiro (saúde, alimentação, etc.) oferecido via Cartão Benefício. */
data class LinkAcessoDto(val url: String, val textoBotao: String? = null)
data class BeneficioDto(
    val id: String,
    val nome: String,
    val categorias: List<String> = emptyList(),
    val local: String? = null,
    val icone: String? = null,
    val cor: String? = null,
    val descontoLabel: String? = null,
    val descontoComplemento: String? = null,
    val descricaoCurta: String? = null,
    val bancoNome: String? = null,
    val linkAcesso: LinkAcessoDto? = null,
)
data class BeneficiosResponse(val beneficios: List<BeneficioDto> = emptyList())

data class SolicitarPortabilidadeRequest(val matricula: String? = null)
data class PortabilidadeSolicitadaResponse(val id: String? = null, val situacao: String? = null)

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
    // Documento do contrato anexado pelo banco (quando disponível). Enquanto o banco não
    // anexa, fica null e o app mostra o contrato montado a partir dos dados da operação.
    @SerializedName("anexoUrl") val anexoUrl: String? = null,
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
