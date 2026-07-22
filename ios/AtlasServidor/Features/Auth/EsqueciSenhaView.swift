import SwiftUI

enum EsStep { case cpf, codigo, senha, concluido }

/// Esqueci minha senha por CPF: CPF → código no e-mail cadastrado (mascarado)
/// → nova senha (2x) → volta ao login. Espelha `EsqueciSenhaViewModel.kt`.
@MainActor
final class EsqueciSenhaModel: ObservableObject {
    @Published var step: EsStep = .cpf
    @Published var loading = false
    @Published var error: String?

    @Published var cpf = ""
    @Published var destinoMasked = ""
    @Published var codigo = ""
    @Published var senha = ""
    @Published var senhaConfirm = ""

    func solicitar() {
        guard cpf.count == 11 else { error = "Digite os 11 dígitos do seu CPF."; return }
        loading = true; error = nil
        Task {
            do {
                let r = try await Repo.esqueciSolicitar(cpf: cpf)
                destinoMasked = r.destino ?? "seu e-mail"
                step = .codigo
            } catch let e as ApiError { self.error = e.userMessage }
            catch { self.error = ApiError.inesperado.userMessage }
            loading = false
        }
    }

    /// O código é validado no redefinir — aqui só avança.
    func avancarCodigo() {
        guard codigo.count == 6 else { error = "Digite os 6 dígitos do código."; return }
        error = nil
        step = .senha
    }

    func redefinir() {
        if senha.count < 8 { error = "A nova senha deve ter ao menos 8 caracteres."; return }
        if senha != senhaConfirm { error = "As senhas não coincidem."; return }
        loading = true; error = nil
        Task {
            do {
                _ = try await Repo.esqueciRedefinir(cpf: cpf, codigo: codigo, senha: senha)
                step = .concluido
            } catch let e as ApiError { self.error = e.userMessage }
            catch { self.error = ApiError.inesperado.userMessage }
            loading = false
        }
    }
}

struct EsqueciSenhaView: View {
    let onBack: () -> Void
    @StateObject private var vm = EsqueciSenhaModel()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                BackHeader(title: "Esqueci minha senha", onBack: onBack)

                switch vm.step {
                case .cpf:
                    Text("Informe seu CPF. Enviaremos um código para o e-mail cadastrado.")
                        .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
                    AtlasField(label: "CPF", value: $vm.cpf, placeholder: "000.000.000-00",
                               keyboard: .numberPad, mask: { Format.cpf($0) },
                               onChange: { vm.cpf = String($0.filter(\.isNumber).prefix(11)); vm.error = nil })
                    AtlasPrimaryButton(text: "Enviar código", loading: vm.loading) { vm.solicitar() }

                case .codigo:
                    Text("Enviamos um código de 6 dígitos para \(vm.destinoMasked).")
                        .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
                    AtlasField(label: "Código", value: $vm.codigo, placeholder: "000000",
                               keyboard: .numberPad,
                               onChange: { vm.codigo = String($0.filter(\.isNumber).prefix(6)); vm.error = nil })
                    AtlasPrimaryButton(text: "Continuar") { vm.avancarCodigo() }
                    Button("‹ Voltar") { vm.step = .cpf; vm.error = nil }
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(Atlas.verde)

                case .senha:
                    Text("Defina sua nova senha.")
                        .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
                    AtlasField(label: "Nova senha (mín. 8)", value: $vm.senha, secure: true,
                               comOlho: true, onChange: { _ in vm.error = nil })
                    AtlasField(label: "Repetir nova senha", value: $vm.senhaConfirm, secure: true,
                               comOlho: true, onChange: { _ in vm.error = nil })
                    AtlasPrimaryButton(text: "Redefinir senha", loading: vm.loading) { vm.redefinir() }
                    Button("‹ Voltar") { vm.step = .codigo; vm.error = nil }
                        .font(.system(size: 14, weight: .semibold)).foregroundStyle(Atlas.verde)

                case .concluido:
                    AtlasCard {
                        Text("Senha redefinida!").font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(Atlas.verde)
                        Spacer().frame(height: 6)
                        Text("Sua senha foi alterada com sucesso. Entre com a nova senha.")
                            .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
                        Spacer().frame(height: 16)
                        AtlasPrimaryButton(text: "Ir para o login", action: onBack)
                    }
                }

                if let err = vm.error {
                    Text(err).font(.system(size: 13)).foregroundStyle(Atlas.dangerRed)
                }
            }
            .padding(20)
        }
        .background(Atlas.fundo)
        .scrollDismissesKeyboard(.interactively)
    }
}
