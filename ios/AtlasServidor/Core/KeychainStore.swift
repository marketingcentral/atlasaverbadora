import Foundation
import Security

/// Sessão persistida no Keychain do iOS — equivalente ao
/// EncryptedSharedPreferences (AES256 + Android Keystore) do app Android.
///
/// `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`: o token não sai deste
/// aparelho (não vai para backup/iCloud), requisito de segurança para dados
/// financeiros — e alinhado ao que a Apple espera de apps bancários.
final class KeychainStore {
    static let shared = KeychainStore()
    private init() {}

    private let service = "io.atlas.servidor.session"

    #if DEBUG
    /// Fallback SÓ DE DEBUG. Sem uma conta Apple Developer, o app roda sem o
    /// entitlement de Keychain e todo SecItemAdd falha com -34018
    /// (errSecMissingEntitlement) — a sessão não persistia e a primeira chamada
    /// autenticada tomava 401, impedindo testar o app no simulador.
    /// Em Release este bloco não existe: a sessão vive EXCLUSIVAMENTE no Keychain.
    private var memoria: [String: String] = [:]
    private var usandoFallback = false
    #endif

    private enum Key: String {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case userName = "user_name"
        case role = "user_role"
        case userId = "user_id"
    }

    // MARK: - Sessão

    var accessToken: String? { read(.accessToken) }
    var refreshToken: String? { read(.refreshToken) }
    var userName: String? { read(.userName) }
    var role: String? { read(.role) }
    var isLoggedIn: Bool { !(accessToken ?? "").isEmpty }

    func saveSession(_ auth: AuthResponse) {
        write(.accessToken, auth.accessToken)
        write(.refreshToken, auth.refreshToken)
        write(.userName, auth.user.nome)
        write(.role, auth.role)
        write(.userId, String(auth.user.id))
    }

    /// Rotaciona só o par de tokens (usado pelo refresh automático).
    func updateTokens(access: String, refresh: String) {
        write(.accessToken, access)
        write(.refreshToken, refresh)
    }

    func clear() {
        for k in [Key.accessToken, .refreshToken, .userName, .role, .userId] {
            SecItemDelete(query(k) as CFDictionary)
        }
        #if DEBUG
        // Sem isto o logout não limparia o fallback e a sessão seguiria viva.
        memoria.removeAll()
        #endif
    }

    // MARK: - Keychain

    private func query(_ key: Key) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
        ]
    }

    @discardableResult
    private func write(_ key: Key, _ value: String) -> Bool {
        var q = query(key)
        SecItemDelete(q as CFDictionary)
        q[kSecValueData as String] = Data(value.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        if status != errSecSuccess {
            // Não engolir: sem isso a falha era invisível e o app só quebrava
            // depois, com 401 na primeira chamada autenticada. O caso clássico é
            // -34018 (errSecMissingEntitlement), quando o app roda SEM assinatura.
            print("[Keychain] falha ao gravar \(key.rawValue): OSStatus \(status)")
            #if DEBUG
            if status == errSecMissingEntitlement {
                usandoFallback = true
                memoria[key.rawValue] = value
                return true
            }
            #endif
            return false
        }
        return true
    }

    private func read(_ key: Key) -> String? {
        #if DEBUG
        if usandoFallback { return memoria[key.rawValue] }
        #endif
        var q = query(key)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
