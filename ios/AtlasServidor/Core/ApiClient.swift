import Foundation

/// Erro de domínio com mensagem pronta para o usuário (PT-BR).
/// Espelha `core/Network.kt` (ApiException + safeApi) do app Android.
struct ApiError: LocalizedError {
    let userMessage: String
    let httpCode: Int?
    var errorDescription: String? { userMessage }

    static func http(_ code: Int) -> ApiError {
        let msg: String
        switch code {
        case 401: msg = "Sessão expirada. Entre novamente."
        case 403: msg = "Você não tem acesso a este recurso."
        case 404: msg = "Não encontramos o que você procura."
        case 422: msg = "Não foi possível processar a solicitação."
        case 429: msg = "Muitas tentativas. Aguarde um instante."
        case 500...599: msg = "O servidor está indisponível no momento."
        default: msg = "Falha na comunicação (HTTP \(code))."
        }
        return ApiError(userMessage: msg, httpCode: code)
    }

    static let semConexao = ApiError(
        userMessage: "Sem conexão. Verifique sua internet e tente novamente.", httpCode: nil)
    static let timeout = ApiError(
        userMessage: "Tempo de conexão esgotado. Tente novamente.", httpCode: nil)
    static let inesperado = ApiError(
        userMessage: "Ocorreu um erro inesperado. Tente novamente.", httpCode: nil)
}

/// Cliente HTTP do app. Injeta o bearer, renova o token no 401 (equivalente ao
/// TokenAuthenticator do OkHttp) e traduz qualquer falha em `ApiError`.
actor ApiClient {
    static let shared = ApiClient()

    /// Mesma base do app Android (`API_BASE_URL` no build.gradle.kts).
    private let baseURL = URL(string: "https://atlas-api.perfectdesigner.workers.dev/")!

    private let session: URLSession
    private var refreshTask: Task<Bool, Never>?

    private init() {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 30
        cfg.timeoutIntervalForResource = 60
        cfg.waitsForConnectivity = true
        session = URLSession(configuration: cfg)
    }

    // MARK: - API pública

    func get<T: Decodable>(_ path: String, query: [String: String?] = [:], auth: Bool = true) async throws -> T {
        try await send(path: path, method: "GET", body: Optional<Int>.none, query: query, auth: auth)
    }

    @discardableResult
    func post<T: Decodable, B: Encodable>(_ path: String, body: B?, auth: Bool = true) async throws -> T {
        try await send(path: path, method: "POST", body: body, query: [:], auth: auth)
    }

    @discardableResult
    func delete<T: Decodable>(_ path: String, query: [String: String?] = [:], auth: Bool = true) async throws -> T {
        try await send(path: path, method: "DELETE", body: Optional<Int>.none, query: query, auth: auth)
    }

    /// POST que ignora o corpo da resposta (ex.: logout).
    func postIgnoringResponse<B: Encodable>(_ path: String, body: B?, auth: Bool = true) async {
        _ = try? await send(path: path, method: "POST", body: body, query: [:], auth: auth) as EmptyResponse
    }

    // MARK: - Núcleo

    private func send<T: Decodable, B: Encodable>(
        path: String, method: String, body: B?, query: [String: String?], auth: Bool,
        isRetry: Bool = false
    ) async throws -> T {
        let request = try buildRequest(path: path, method: method, body: body, query: query, auth: auth)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let e as URLError {
            switch e.code {
            case .timedOut: throw ApiError.timeout
            case .notConnectedToInternet, .networkConnectionLost, .cannotConnectToHost:
                throw ApiError.semConexao
            default: throw ApiError.semConexao
            }
        } catch {
            throw ApiError.inesperado
        }

        guard let http = response as? HTTPURLResponse else { throw ApiError.inesperado }

        // 401 numa rota autenticada → tenta renovar o token uma única vez.
        if http.statusCode == 401, auth, !isRetry {
            if await refreshToken() {
                return try await send(path: path, method: method, body: body,
                                      query: query, auth: auth, isRetry: true)
            }
            KeychainStore.shared.clear()
            throw ApiError.http(401)
        }

        guard (200..<300).contains(http.statusCode) else {
            throw parseError(data: data, code: http.statusCode)
        }

        if T.self == EmptyResponse.self { return EmptyResponse() as! T }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw ApiError.inesperado
        }
    }

    private func buildRequest<B: Encodable>(
        path: String, method: String, body: B?, query: [String: String?], auth: Bool
    ) throws -> URLRequest {
        var comps = URLComponents(
            url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        let items = query.compactMap { k, v -> URLQueryItem? in
            guard let v, !v.isEmpty else { return nil }
            return URLQueryItem(name: k, value: v)
        }
        if !items.isEmpty { comps.queryItems = items }

        var req = URLRequest(url: comps.url!)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if auth, let token = KeychainStore.shared.accessToken, !token.isEmpty {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }
        return req
    }

    /// Renova o par de tokens. Concorrência controlada: várias chamadas que
    /// tomam 401 ao mesmo tempo compartilham um único refresh.
    private func refreshToken() async -> Bool {
        if let existing = refreshTask { return await existing.value }
        let task = Task<Bool, Never> { [session, baseURL] in
            guard let refresh = KeychainStore.shared.refreshToken, !refresh.isEmpty else { return false }
            var req = URLRequest(url: baseURL.appendingPathComponent("v1/auth/refresh"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONEncoder().encode(RefreshRequest(refreshToken: refresh))
            guard let (data, resp) = try? await session.data(for: req),
                  let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode),
                  let auth = try? JSONDecoder().decode(AuthResponse.self, from: data)
            else { return false }
            KeychainStore.shared.updateTokens(access: auth.accessToken, refresh: auth.refreshToken)
            return true
        }
        refreshTask = task
        let ok = await task.value
        refreshTask = nil
        return ok
    }

    /// Prefere a mensagem amigável de campo (`details.email`) sobre a genérica,
    /// pulando o shape do Zod (`fieldErrors`/`formErrors`), igual ao Android.
    private func parseError(data: Data, code: Int) -> ApiError {
        guard let body = try? JSONDecoder().decode(ApiErrorBody.self, from: data),
              let err = body.error else { return .http(code) }
        if let details = err.details,
           details["fieldErrors"] == nil, details["formErrors"] == nil {
            for (_, v) in details {
                if let s = v.stringValue, !s.trimmingCharacters(in: .whitespaces).isEmpty {
                    return ApiError(userMessage: s, httpCode: code)
                }
            }
        }
        if let m = err.message, !m.isEmpty { return ApiError(userMessage: m, httpCode: code) }
        return .http(code)
    }
}

struct EmptyResponse: Decodable {}
