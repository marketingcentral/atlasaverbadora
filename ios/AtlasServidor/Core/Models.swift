import Foundation

// Espelho fiel de `data/remote/dto/Dtos.kt`. Os nomes em snake_case da API
// são mapeados por CodingKeys (o Android faz o mesmo com @SerializedName).

// MARK: - Auth

struct LoginRequest: Encodable {
    let identifier: String
    let password: String
    let deviceId: String?
    enum CodingKeys: String, CodingKey {
        case identifier, password
        case deviceId = "device_id"
    }
}

struct RefreshRequest: Encodable {
    let refreshToken: String
    enum CodingKeys: String, CodingKey { case refreshToken = "refresh_token" }
}

struct AuthUser: Decodable {
    let id: Int64
    let nome: String
    let role: String
}

struct AuthResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int64
    let role: String
    let user: AuthUser
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case role, user
    }
}

// MARK: - Envelope de erro

struct ApiErrorBody: Decodable {
    let error: ApiErrorDetail?
}

struct ApiErrorDetail: Decodable {
    let code: String?
    let message: String?
    let details: [String: AnyCodableValue]?
}

/// Aceita qualquer valor no `details` para conseguir extrair mensagens amigáveis
/// de campo (ex.: {"email": "E-mail em uso"}) sem quebrar em shapes do Zod.
struct AnyCodableValue: Decodable {
    let stringValue: String?
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        stringValue = try? c.decode(String.self)
    }
}

// MARK: - Primeiro acesso / senha

struct CpfRequest: Encodable { let cpf: String }

struct PaCodigoRequest: Encodable {
    let cpf: String
    let email: String
    let senha: String
    let telefone: String?
}

struct PaConfirmarRequest: Encodable { let cpf: String; let codigo: String }
struct EsqueciEmailRequest: Encodable { let email: String }
struct EsqueciCpfRequest: Encodable { let cpf: String }
struct RedefinirSenhaRequest: Encodable { let cpf: String; let codigo: String; let senha: String }

struct EsqueciSolicitarResponse: Decodable {
    let enviado: Bool?
    let cpf: String?
    let destino: String?
}

struct PrimeiroAcessoBuscarResponse: Decodable {
    let encontrado: Bool
    let nome: String?
    let matricula: String?
    let cargo: String?
    let origem: String?
    let emailMasked: String?
    let telefoneMasked: String?
    let jaTemSenha: Bool?
    enum CodingKeys: String, CodingKey {
        case encontrado, nome, matricula, cargo, origem
        case emailMasked = "email_masked"
        case telefoneMasked = "telefone_masked"
        case jaTemSenha = "ja_tem_senha"
    }
}

struct CodigoResponse: Decodable {
    let enviado: Bool?
    let destino: String?
    let codigoTeste: String?
    enum CodingKeys: String, CodingKey {
        case enviado, destino
        case codigoTeste = "codigo_teste"
    }
}

struct OkResponse: Decodable { let ok: Bool? }

struct ContatoRequest: Encodable {
    let codigo: String
    let email: String?
    let telefone: String?
}

struct AlterarSenhaRequest: Encodable {
    let senhaAtual: String
    let codigo: String
    let novaSenha: String
    enum CodingKeys: String, CodingKey {
        case senhaAtual = "senha_atual"
        case codigo
        case novaSenha = "nova_senha"
    }
}

// MARK: - Propostas

struct CriarPropostaRequest: Encodable {
    let valor: Double
    let parcelas: Int
    let taxaAm: Double
    let matricula: String?
    let bancoNome: String?
    let produto: String?
}

struct PropostaResponse: Decodable {
    let id: String
    let situacao: String?
    let banco: String?
    let valor: Double?
    let parcelas: Int?
    let parcela: Double?
}

struct PropostaDto: Decodable, Identifiable, Equatable {
    let id: String
    let banco: String?
    let valor: Double
    let parcelas: Int
    let parcela: Double
    /// Já vem em % (ex.: 1.79)
    let taxaAm: Double
    let situacao: String?
    let tipoContrato: String?
    let convenio: String?
    let observacoes: String?
    let tipoMargem: String?
    let folhaStatus: String?
    let folhaMotivo: String?
    let data: String?
    let expiraEm: String?
    let bancoOrigem: String?
    let contratoOrigem: String?
    let saldoDevedorOrigem: Double?

    enum CodingKeys: String, CodingKey {
        case id, banco, valor, parcelas, parcela, taxaAm, situacao, tipoContrato
        case convenio, observacoes, tipoMargem, folhaStatus, folhaMotivo, data
        case expiraEm = "expira_em"
        case bancoOrigem, contratoOrigem, saldoDevedorOrigem
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        banco = try? c.decodeIfPresent(String.self, forKey: .banco)
        valor = (try? c.decodeIfPresent(Double.self, forKey: .valor)) as? Double ?? 0
        parcelas = (try? c.decodeIfPresent(Int.self, forKey: .parcelas)) as? Int ?? 0
        parcela = (try? c.decodeIfPresent(Double.self, forKey: .parcela)) as? Double ?? 0
        taxaAm = (try? c.decodeIfPresent(Double.self, forKey: .taxaAm)) as? Double ?? 0
        situacao = try? c.decodeIfPresent(String.self, forKey: .situacao)
        tipoContrato = try? c.decodeIfPresent(String.self, forKey: .tipoContrato)
        convenio = try? c.decodeIfPresent(String.self, forKey: .convenio)
        observacoes = try? c.decodeIfPresent(String.self, forKey: .observacoes)
        tipoMargem = try? c.decodeIfPresent(String.self, forKey: .tipoMargem)
        folhaStatus = try? c.decodeIfPresent(String.self, forKey: .folhaStatus)
        folhaMotivo = try? c.decodeIfPresent(String.self, forKey: .folhaMotivo)
        data = try? c.decodeIfPresent(String.self, forKey: .data)
        expiraEm = try? c.decodeIfPresent(String.self, forKey: .expiraEm)
        bancoOrigem = try? c.decodeIfPresent(String.self, forKey: .bancoOrigem)
        contratoOrigem = try? c.decodeIfPresent(String.self, forKey: .contratoOrigem)
        saldoDevedorOrigem = try? c.decodeIfPresent(Double.self, forKey: .saldoDevedorOrigem)
    }
}

struct PropostasResponse: Decodable { let propostas: [PropostaDto]? }
struct RemoverPropostasResponse: Decodable { let removidas: Int? }

// MARK: - Cartões / benefícios / comunicados

struct SolicitarCartaoRequest: Encodable {
    let produto: String   // "cartao_consignado" | "cartao_beneficio"
    let bancoNome: String
    let limite: Double
    let matricula: String?
}

struct SolicitarCartaoResponse: Decodable {
    let ok: Bool?
    let protocolo: String?
    let mensagem: String?
}

struct ComunicadoDto: Decodable, Identifiable {
    let id: String
    let titulo: String
    let corpo: String
    let linkLabel: String?
    let linkHref: String?
}
struct ComunicadosResponse: Decodable { let comunicados: [ComunicadoDto]? }

struct LinkAcessoDto: Decodable { let url: String; let textoBotao: String? }

struct BeneficioDto: Decodable, Identifiable {
    let id: String
    let nome: String
    let categorias: [String]?
    let local: String?
    let icone: String?
    let cor: String?
    let descontoLabel: String?
    let descontoComplemento: String?
    let descricaoCurta: String?
    let bancoNome: String?
    let linkAcesso: LinkAcessoDto?
}
struct BeneficiosResponse: Decodable { let beneficios: [BeneficioDto]? }

// MARK: - Termos

struct TermoDto: Decodable {
    let id: String
    let titulo: String
    let versao: String?
    let corpo: String
}
struct TermoResponse: Decodable { let termo: TermoDto }

// MARK: - Telemedicina / portabilidade

struct CotacaoTelemedicinaRequest: Encodable { let matricula: String? }

struct CotacaoTelemedicinaDto: Decodable, Identifiable {
    let id: String
    let situacao: String
    let criadoEm: String
    let ativadoEm: String?
}
struct MinhasCotacoesResponse: Decodable { let cotacoes: [CotacaoTelemedicinaDto]? }

struct SolicitarPortabilidadeRequest: Encodable {
    let matricula: String?
    let elegivelId: String?
}
struct PortabilidadeSolicitadaResponse: Decodable { let id: String?; let situacao: String? }

// MARK: - Perfil

struct MeResponse: Decodable {
    let id: Int64
    let nome: String
    let cpfMasked: String
    let matricula: String
    let vinculo: String
    let situacaoFuncional: String
    let status: String
    enum CodingKeys: String, CodingKey {
        case id, nome, matricula, vinculo, status
        case cpfMasked = "cpf_masked"
        case situacaoFuncional = "situacao_funcional"
    }
}

// MARK: - Ofertas

struct OfertaDto: Decodable, Identifiable {
    let id: String
    let bancoNome: String
    let convenio: String
    let cidade: String
    let taxaMinAm: Double
    let taxaMaxAm: Double
    let prazoMaxMeses: Int
}
struct OfertasResponse: Decodable { let ofertas: [OfertaDto]? }

// MARK: - Matrículas (snapshot completo: margem + contratos + portabilidade)

struct MargemValoresDto: Decodable {
    let salarioBase: Double
    let comprometido: Double
    let disponivel: Double
    let percentualUso: Double
    enum CodingKeys: String, CodingKey {
        case salarioBase = "salario_base"
        case comprometido, disponivel
        case percentualUso = "percentual_uso"
    }
}

struct MargemTipoDto: Decodable, Identifiable {
    let tipo: String
    let total: Double
    let disponivel: Double
    var id: String { tipo }
}

struct MargemBlockDto: Decodable {
    let matricula: String
    let margem: MargemValoresDto
    let margensPorTipo: [MargemTipoDto]?
    enum CodingKeys: String, CodingKey {
        case matricula, margem
        case margensPorTipo = "margens_por_tipo"
    }
}

struct ContratoDto: Decodable, Identifiable {
    let id: String
    let banco: String
    let parcela: Double
    let parcelasPagas: Int
    let total: Int
    let status: String
    let proximaParcela: String?
    let taxaAm: Double
    let valorFinanciado: Double
    let tipoContrato: String?
    let tipoMargem: String?
    let observacoes: String?
    let bancoOrigem: String?
    /// Nome real do arquivo anexado — usado pra baixar no formato original.
    let anexoNome: String?
}

struct ElegivelDto: Decodable, Identifiable {
    let id: String
    let banco: String
    let saldoDevedor: Double
    let parcela: Double
    let parcelasRestantes: Int
    let totalParcelas: Int
    let taxaAm: Double
    let tipoContrato: String?
    let tipo: String?
}

struct MatriculaInfoDto: Decodable, Identifiable {
    let idMatricula: String
    let matricula: String
    let prefeitura: String
    let uf: String
    let cargo: String
    let vinculo: String
    let nome: String
    let email: String
    let telefone: String
    let endereco: String?
    let ativa: Bool?
    let margem: MargemBlockDto
    let contratos: [ContratoDto]?
    let elegiveisPortabilidade: [ElegivelDto]?
    let telemedicinaEmAnalise: Bool?

    var id: String { matricula }
}

struct MatriculasResponse: Decodable { let matriculas: [MatriculaInfoDto]? }
