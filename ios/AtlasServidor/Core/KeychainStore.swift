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
    }

    // MARK: - Keychain

    private func query(_ key: Key) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
        ]
    }

    private func write(_ key: Key, _ value: String) {
        var q = query(key)
        SecItemDelete(q as CFDictionary)
        q[kSecValueData as String] = Data(value.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(q as CFDictionary, nil)
    }

    private func read(_ key: Key) -> String? {
        var q = query(key)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}
