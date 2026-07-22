import Foundation

/// Superfície da API usada pelo app do servidor — espelha `ApiService.kt` +
/// `AuthApi.kt` do Android, endpoint por endpoint.
enum Repo {
    private static var api: ApiClient { .shared }

    // MARK: - Auth (sem bearer)

    static func login(cpf: String, senha: String) async throws -> AuthResponse {
        let auth: AuthResponse = try await api.post(
            "v1/auth/login",
            body: LoginRequest(identifier: cpf.filter(\.isNumber), password: senha,
                               deviceId: AppPrefs.shared.deviceId),
            auth: false)
        guard auth.role == "servidor" else {
            throw ApiError(userMessage: "Este aplicativo é exclusivo para servidores públicos.",
                           httpCode: nil)
        }
        KeychainStore.shared.saveSession(auth)
        AppPrefs.shared.clearSelection()
        return auth
    }

    static func logout() async {
        await api.postIgnoringResponse("v1/auth/logout", body: Optional<Int>.none)
        KeychainStore.shared.clear()
        AppPrefs.shared.clearSelection()
    }

    // MARK: - Primeiro acesso

    static func paBuscar(cpf: String) async throws -> PrimeiroAcessoBuscarResponse {
        try await api.post("v1/auth/primeiro-acesso/buscar",
                           body: CpfRequest(cpf: cpf.filter(\.isNumber)), auth: false)
    }

    static func paEnviarCodigo(cpf: String, email: String, senha: String,
                               telefone: String?) async throws -> CodigoResponse {
        try await api.post("v1/auth/primeiro-acesso/codigo",
                           body: PaCodigoRequest(cpf: cpf.filter(\.isNumber), email: email,
                                                 senha: senha, telefone: telefone),
                           auth: false)
    }

    static func paConfirmar(cpf: String, codigo: String) async throws -> OkResponse {
        try await api.post("v1/auth/primeiro-acesso/senha",
                           body: PaConfirmarRequest(cpf: cpf.filter(\.isNumber), codigo: codigo),
                           auth: false)
    }

    // MARK: - Esqueci minha senha

    static func esqueciSolicitar(cpf: String) async throws -> EsqueciSolicitarResponse {
        try await api.post("v1/auth/esqueci-senha/solicitar",
                           body: EsqueciCpfRequest(cpf: cpf.filter(\.isNumber)), auth: false)
    }

    static func esqueciSolicitarEmail(email: String) async throws -> EsqueciSolicitarResponse {
        try await api.post("v1/auth/esqueci-senha/solicitar-email",
                           body: EsqueciEmailRequest(email: email), auth: false)
    }

    static func esqueciRedefinir(cpf: String, codigo: String, senha: String) async throws -> OkResponse {
        try await api.post("v1/auth/esqueci-senha/redefinir",
                           body: RedefinirSenhaRequest(cpf: cpf.filter(\.isNumber),
                                                       codigo: codigo, senha: senha),
                           auth: false)
    }

    // MARK: - Servidor

    static func matriculas() async throws -> [MatriculaInfoDto] {
        let r: MatriculasResponse = try await api.get("v1/servidores/me/matriculas")
        return r.matriculas ?? []
    }

    static func propostas(matricula: String?) async throws -> [PropostaDto] {
        let r: PropostasResponse = try await api.get(
            "v1/servidores/me/propostas", query: ["matricula": matricula])
        return r.propostas ?? []
    }

    static func comunicados() async throws -> [ComunicadoDto] {
        let r: ComunicadosResponse = try await api.get("v1/servidores/me/comunicados")
        return r.comunicados ?? []
    }

    static func beneficios(categoria: String?, matricula: String?) async throws -> [BeneficioDto] {
        let r: BeneficiosResponse = try await api.get(
            "v1/servidores/me/beneficios",
            query: ["categoria": categoria, "matricula": matricula])
        return r.beneficios ?? []
    }

    static func criarProposta(valor: Double, parcelas: Int, taxaAm: Double,
                              matricula: String?, bancoNome: String?,
                              produto: String?) async throws -> PropostaResponse {
        try await api.post("v1/servidores/me/propostas",
                           body: CriarPropostaRequest(valor: valor, parcelas: parcelas,
                                                      taxaAm: taxaAm, matricula: matricula,
                                                      bancoNome: bancoNome, produto: produto))
    }

    static func solicitarCartao(produto: String, bancoNome: String, limite: Double,
                                matricula: String?) async throws -> SolicitarCartaoResponse {
        try await api.post("v1/servidores/me/cartoes",
                           body: SolicitarCartaoRequest(produto: produto, bancoNome: bancoNome,
                                                        limite: limite, matricula: matricula))
    }

    static func solicitarPortabilidade(matricula: String?, elegivelId: String?) async throws
        -> PortabilidadeSolicitadaResponse {
        try await api.post("v1/servidores/me/portabilidade/solicitar",
                           body: SolicitarPortabilidadeRequest(matricula: matricula,
                                                               elegivelId: elegivelId))
    }

    // MARK: - Telemedicina

    static func solicitarCotacaoTelemedicina(matricula: String?) async throws -> OkResponse {
        try await api.post("v1/servidores/me/telemedicina/cotacao",
                           body: CotacaoTelemedicinaRequest(matricula: matricula))
    }

    static func minhasCotacoesTelemedicina() async throws -> [CotacaoTelemedicinaDto] {
        let r: MinhasCotacoesResponse = try await api.get("v1/servidores/me/telemedicina/cotacoes")
        return r.cotacoes ?? []
    }

    // MARK: - Termos (texto vem da tela Termos de aceite da averbadora)

    static func termo(tipo: String, vars: [String: String] = [:]) async throws -> TermoDto {
        var q: [String: String?] = [:]
        if !vars.isEmpty,
           let data = try? JSONSerialization.data(withJSONObject: vars),
           let json = String(data: data, encoding: .utf8) {
            q["vars"] = json
        }
        let r: TermoResponse = try await api.get("v1/servidores/me/termos/\(tipo)", query: q)
        return r.termo
    }

    // MARK: - Conta

    static func contaCodigo() async throws -> CodigoResponse {
        try await api.post("v1/servidores/me/codigo", body: Optional<Int>.none)
    }

    static func atualizarContato(codigo: String, email: String?, telefone: String?) async throws -> OkResponse {
        try await api.post("v1/servidores/me/contato",
                           body: ContatoRequest(codigo: codigo, email: email, telefone: telefone))
    }

    static func alterarSenha(senhaAtual: String, codigo: String, novaSenha: String) async throws -> OkResponse {
        try await api.post("v1/servidores/me/senha",
                           body: AlterarSenhaRequest(senhaAtual: senhaAtual, codigo: codigo,
                                                     novaSenha: novaSenha))
    }
}
