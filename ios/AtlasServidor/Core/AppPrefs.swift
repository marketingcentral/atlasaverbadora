import Foundation

/// Preferências não-secretas do app — espelha `core/AppPrefs.kt` do Android.
/// (Segredos ficam no Keychain, ver `KeychainStore`.)
final class AppPrefs {
    static let shared = AppPrefs()
    private init() {}

    private let d = UserDefaults.standard

    /// Id estável do dispositivo, enviado no login.
    var deviceId: String {
        if let existing = d.string(forKey: "device_id") { return existing }
        let generated = UUID().uuidString
        d.set(generated, forKey: "device_id")
        return generated
    }

    var selectedMatricula: String? {
        get { d.string(forKey: "selected_matricula") }
        set { d.set(newValue, forKey: "selected_matricula") }
    }

    func clearSelection() { d.removeObject(forKey: "selected_matricula") }

    // MARK: - "Lembre-me" no login
    // Guarda só o CPF (identificador), NUNCA a senha — igual ao Android.

    var lembrarLogin: Bool {
        get { d.bool(forKey: "lembrar_login") }
        set { d.set(newValue, forKey: "lembrar_login") }
    }

    var cpfSalvo: String? {
        get { d.string(forKey: "cpf_salvo") }
        set { d.set(newValue, forKey: "cpf_salvo") }
    }
}

/// Bucket de margem de uma proposta — espelha `produtoDaProposta` do Android.
/// Distingue cartão CONSIGNADO de BENEFÍCIO, que compartilham o tipoContrato
/// ECONSIGNADO.
func produtoDaProposta(tipoContrato: String?, tipoMargem: String?) -> String {
    if let m = tipoMargem, !m.isEmpty { return m }
    return tipoContrato?.uppercased() == "ECONSIGNADO" ? "CARTAO_CONSIGNADO" : "EMPRESTIMO"
}

/// A margem só fica bloqueada enquanto a proposta está EM ANÁLISE ("aguardando").
func isReservaPendente(_ situacao: String?) -> Bool {
    (situacao ?? "").lowercased().contains("aguard")
}
