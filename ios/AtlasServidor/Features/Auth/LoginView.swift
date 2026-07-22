import SwiftUI

/// Campo de texto padrão do app (equivale ao OutlinedTextField do Android).
struct AtlasField: View {
    let label: String
    @Binding var value: String
    var placeholder: String = ""
    var keyboard: UIKeyboardType = .default
    var secure: Bool = false
    /// Mostra o "olho" para revelar a senha.
    var comOlho: Bool = false
    var mask: ((String) -> String)? = nil
    var onChange: ((String) -> Void)? = nil

    @State private var revelado = false
    /// Texto EXIBIDO no campo. Precisa ser um @State próprio: com um Binding
    /// computado (get aplicando a máscara), o TextField do SwiftUI mantém o texto
    /// interno enquanto se digita e nunca relê o get — a máscara não aparecia.
    @State private var texto = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Atlas.inkMuted)
            HStack(spacing: 8) {
                Group {
                    if let mask {
                        // Campo com máscara (CPF/telefone) — UIKit por baixo, para não
                        // perder caracteres ao digitar rápido ou colar. Ver MaskedTextField.
                        MaskedTextField(text: $texto, placeholder: placeholder,
                                        keyboard: keyboard, isSecure: secure && !revelado,
                                        mask: mask)
                    } else if secure && !revelado {
                        SecureField(placeholder, text: $texto)
                    } else {
                        TextField(placeholder, text: $texto)
                    }
                }
                .font(.system(size: 16))
                .keyboardType(keyboard)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .foregroundStyle(Atlas.ink)

                if comOlho {
                    Button {
                        revelado.toggle()
                    } label: {
                        Image(systemName: revelado ? "eye.slash" : "eye")
                            .foregroundStyle(Atlas.inkMuted)
                    }
                    .accessibilityLabel(revelado ? "Ocultar senha" : "Mostrar senha")
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
            .background(Atlas.superficie)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Atlas.divider, lineWidth: 1)
            )
        }
        .onAppear { texto = mask?(value) ?? value }
        // Propaga pra fora. A formatação em si é do MaskedTextField (quando há
        // máscara) — reatribuir `texto` aqui brigava com o campo e perdia teclas.
        .onChange(of: texto) { novo in
            if let onChange { onChange(novo) } else { value = novo }
        }
        // Mudança vinda de fora (ex.: CPF pré-preenchido pelo "Lembre-me").
        .onChange(of: value) { novo in
            let formatado = mask?(novo) ?? novo
            if formatado != texto { texto = formatado }
        }
    }
}

@MainActor
final class LoginModel: ObservableObject {
    @Published var cpf = ""
    @Published var senha = ""
    @Published var loading = false
    @Published var error: String?
    @Published var lembrar = false

    init() {
        // Se o servidor marcou "Lembre-me" antes, já traz o CPF preenchido.
        if AppPrefs.shared.lembrarLogin {
            cpf = AppPrefs.shared.cpfSalvo ?? ""
            lembrar = true
        }
    }

    func onCpf(_ v: String) { cpf = String(v.filter(\.isNumber).prefix(11)); error = nil }

    func login(onSuccess: @escaping () -> Void) {
        guard cpf.count == 11 else { error = "Informe um CPF válido (11 dígitos)."; return }
        guard senha.count >= 6 else { error = "A senha deve ter ao menos 6 caracteres."; return }
        loading = true; error = nil
        Task {
            do {
                _ = try await Repo.login(cpf: cpf, senha: senha)
                AppPrefs.shared.lembrarLogin = lembrar
                AppPrefs.shared.cpfSalvo = lembrar ? cpf : nil
                loading = false
                onSuccess()
            } catch let e as ApiError {
                self.error = e.userMessage; loading = false
            } catch {
                self.error = ApiError.inesperado.userMessage; loading = false
            }
        }
    }
}

struct LoginView: View {
    let onLoggedIn: () -> Void
    let onPrimeiroAcesso: () -> Void
    let onEsqueciSenha: () -> Void

    @StateObject private var vm = LoginModel()
    @ObservedObject private var watcher = SessionWatcher.shared

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                AtlasLogo().frame(maxWidth: .infinity)
                Spacer().frame(height: 28)

                Text("Acesso do servidor público")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundStyle(Atlas.ink)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                Spacer().frame(height: 6)
                Text("Empréstimo consignado, direto da sua margem.")
                    .font(.system(size: 15))
                    .foregroundStyle(Atlas.inkMuted)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)

                // Aviso de sessão expirada por inatividade (10 min).
                if watcher.expired {
                    Spacer().frame(height: 20)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Sua sessão expirou")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Atlas.ambar)
                        Text("Por segurança, deslogamos você após 10 minutos sem uso. Faça login novamente para continuar.")
                            .font(.system(size: 13))
                            .foregroundStyle(Atlas.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Atlas.superficie)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                Spacer().frame(height: 28)

                AtlasField(label: "CPF", value: $vm.cpf, placeholder: "000.000.000-00",
                           keyboard: .numberPad, mask: { Format.cpf($0) },
                           onChange: { vm.onCpf($0) })
                Spacer().frame(height: 14)
                AtlasField(label: "Senha", value: $vm.senha, secure: true, comOlho: true,
                           onChange: { _ in vm.error = nil })

                if let err = vm.error {
                    Spacer().frame(height: 10)
                    Text(err).font(.system(size: 13)).foregroundStyle(Atlas.dangerRed)
                }

                // Lembre-me à esquerda · Esqueci minha senha à direita.
                Spacer().frame(height: 10)
                HStack {
                    Button {
                        vm.lembrar.toggle()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: vm.lembrar ? "checkmark.square.fill" : "square")
                                .foregroundStyle(vm.lembrar ? Atlas.verde : Atlas.inkMuted)
                            Text("Lembre-me")
                                .font(.system(size: 13))
                                .foregroundStyle(Atlas.ink)
                        }
                    }
                    Spacer()
                    Button("Esqueci minha senha", action: onEsqueciSenha)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Atlas.verde)
                }

                Spacer().frame(height: 16)
                AtlasPrimaryButton(text: "Entrar", loading: vm.loading) {
                    vm.login(onSuccess: onLoggedIn)
                }

                Spacer().frame(height: 20)
                Text("ou").font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                    .frame(maxWidth: .infinity)
                Spacer().frame(height: 20)
                AtlasSecondaryButton(text: "Primeiro acesso", action: onPrimeiroAcesso)

                Spacer().frame(height: 28)
                Text("🔒 Ambiente seguro · Atlas Averbadora")
                    .font(.system(size: 12))
                    .foregroundStyle(Atlas.inkMuted)
                    .frame(maxWidth: .infinity)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 40)
        }
        .background(Atlas.fundo)
        .scrollDismissesKeyboard(.interactively)
    }
}
