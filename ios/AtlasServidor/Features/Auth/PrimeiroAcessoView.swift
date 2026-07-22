import SwiftUI

enum PaStep { case cpf, naoEncontrado, contaExistente, dados, codigo, concluido }

/// Fluxo de primeiro acesso, igual ao Android/web:
/// CPF → Dados (e-mail + telefone + senha 2x + termos) → Código → concluído.
@MainActor
final class PrimeiroAcessoModel: ObservableObject {
    @Published var step: PaStep = .cpf
    @Published var loading = false
    @Published var error: String?

    /// Guarda SEMPRE só os dígitos. O campo exibe mascarado ("580.886.363-53"),
    /// mas gravar a máscara aqui fazia a validação contar 14 e barrar um CPF
    /// completo — e mandava o CPF formatado pra API. (Swift não re-dispara o
    /// didSet numa atribuição feita dentro dele.)
    @Published var cpf = "" {
        didSet {
            let d = String(cpf.filter(\.isNumber).prefix(11))
            if d != cpf { cpf = d }
        }
    }
    @Published var nome = ""
    @Published var cargo: String?
    @Published var origem: String?

    @Published var email = ""
    @Published var telefone = ""
    @Published var senha = ""
    @Published var senhaConfirm = ""
    @Published var aceiteTermos = false
    @Published var aceiteLgpd = false

    @Published var destinoMasked = ""
    @Published var codigo = ""

    func buscar() {
        // O campo guarda o CPF MASCARADO — normaliza antes de validar/enviar.
        let digitos = String(cpf.filter(\.isNumber).prefix(11))
        guard digitos.count == 11 else { error = "Informe um CPF válido (11 dígitos)."; return }
        loading = true; error = nil
        Task {
            do {
                let r = try await Repo.paBuscar(cpf: digitos)
                nome = r.nome ?? ""
                cargo = r.cargo
                origem = r.origem
                if !r.encontrado { step = .naoEncontrado }
                else if r.jaTemSenha == true { step = .contaExistente }
                else { step = .dados }
            } catch let e as ApiError { self.error = e.userMessage }
            catch { self.error = ApiError.inesperado.userMessage }
            loading = false
        }
    }

    func enviarCodigo() {
        let emailOk = email.contains("@") && email.split(separator: "@").last?.contains(".") == true && email.count >= 6
        if !emailOk { error = "Informe um e-mail válido para receber o código."; return }
        if telefone.count < 10 { error = "Informe um telefone válido com DDD."; return }
        if senha.count < 8 { error = "A senha deve ter ao menos 8 caracteres."; return }
        if senha != senhaConfirm { error = "As senhas não coincidem."; return }
        if !aceiteTermos { error = "É necessário aceitar os Termos de uso."; return }
        if !aceiteLgpd { error = "É necessário concordar com a Política de Privacidade."; return }

        loading = true; error = nil
        Task {
            do {
                let r = try await Repo.paEnviarCodigo(cpf: cpf, email: email, senha: senha, telefone: telefone)
                destinoMasked = r.destino ?? email
                step = .codigo
            } catch let e as ApiError { self.error = e.userMessage }
            catch { self.error = ApiError.inesperado.userMessage }
            loading = false
        }
    }

    func confirmarCodigo() {
        guard codigo.count == 6 else { error = "Digite os 6 dígitos do código."; return }
        loading = true; error = nil
        Task {
            do {
                _ = try await Repo.paConfirmar(cpf: cpf, codigo: codigo)
                step = .concluido
            } catch let e as ApiError { self.error = e.userMessage }
            catch { self.error = ApiError.inesperado.userMessage }
            loading = false
        }
    }
}

struct PrimeiroAcessoView: View {
    let onBack: () -> Void
    @StateObject private var vm = PrimeiroAcessoModel()
    @State private var termoAberto: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                BackHeader(title: "Primeiro acesso", onBack: onBack)

                switch vm.step {
                case .cpf: passoCpf
                case .naoEncontrado: naoEncontrado
                case .contaExistente: contaExistente
                case .dados: passoDados
                case .codigo: passoCodigo
                case .concluido: concluido
                }

                if let err = vm.error {
                    Text(err).font(.system(size: 13)).foregroundStyle(Atlas.dangerRed)
                }
            }
            .padding(20)
        }
        .background(Atlas.fundo)
        .scrollDismissesKeyboard(.interactively)
        .sheet(item: Binding(get: { termoAberto.map { TermoID(tipo: $0) } },
                             set: { termoAberto = $0?.tipo })) { t in
            TermoSheet(tipo: t.tipo)
        }
    }

    // MARK: - Passos

    private var passoCpf: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Informe seu CPF para localizarmos seu cadastro na prefeitura.")
                .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
            AtlasField(label: "CPF", value: $vm.cpf, placeholder: "000.000.000-00",
                       keyboard: .numberPad, mask: { Format.cpf($0) },
                       onChange: { vm.cpf = String($0.filter(\.isNumber).prefix(11)); vm.error = nil })
            AtlasPrimaryButton(text: "Continuar", loading: vm.loading) { vm.buscar() }
        }
    }

    private var naoEncontrado: some View {
        AtlasCard {
            Text("CPF não encontrado").font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
            Spacer().frame(height: 6)
            Text("Não localizamos esse CPF na base da sua prefeitura. Procure o RH para confirmar seu cadastro.")
                .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
            Spacer().frame(height: 14)
            AtlasSecondaryButton(text: "Tentar outro CPF") { vm.step = .cpf; vm.error = nil }
        }
    }

    private var contaExistente: some View {
        AtlasCard {
            Text("Você já tem acesso").font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
            Spacer().frame(height: 6)
            Text("Esse CPF já concluiu o primeiro acesso. Entre com sua senha ou use \"Esqueci minha senha\".")
                .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
            Spacer().frame(height: 14)
            AtlasSecondaryButton(text: "Voltar ao login", action: onBack)
        }
    }

    private var passoDados: some View {
        VStack(alignment: .leading, spacing: 14) {
            AtlasCard {
                Text(vm.nome).font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                if let cargo = vm.cargo, !cargo.isEmpty {
                    Text(cargo).font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                }
                if let origem = vm.origem, !origem.isEmpty {
                    Text(origem).font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                }
            }
            Text("Crie seu acesso. O código de verificação vai para o e-mail informado.")
                .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)

            AtlasField(label: "E-mail", value: $vm.email, placeholder: "voce@email.com",
                       keyboard: .emailAddress, onChange: { vm.email = $0.trimmingCharacters(in: .whitespaces); vm.error = nil })
            AtlasField(label: "Telefone", value: $vm.telefone, placeholder: "(00) 00000-0000",
                       keyboard: .numberPad, mask: { Format.phone($0) },
                       onChange: { vm.telefone = String($0.filter(\.isNumber).prefix(11)); vm.error = nil })
            AtlasField(label: "Senha (mín. 8)", value: $vm.senha, secure: true, comOlho: true,
                       onChange: { _ in vm.error = nil })
            AtlasField(label: "Repetir senha", value: $vm.senhaConfirm, secure: true, comOlho: true,
                       onChange: { _ in vm.error = nil })

            checkbox(marcado: vm.aceiteTermos, texto: "Li e aceito os **Termos de Uso**",
                     link: "termos_uso") { vm.aceiteTermos.toggle() }
            checkbox(marcado: vm.aceiteLgpd, texto: "Concordo com a **Política de Privacidade**",
                     link: "politica_privacidade") { vm.aceiteLgpd.toggle() }

            AtlasPrimaryButton(text: "Enviar código", loading: vm.loading) { vm.enviarCodigo() }
        }
    }

    private var passoCodigo: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Enviamos um código de 6 dígitos para \(vm.destinoMasked).")
                .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
            AtlasField(label: "Código", value: $vm.codigo, placeholder: "000000",
                       keyboard: .numberPad,
                       onChange: { vm.codigo = String($0.filter(\.isNumber).prefix(6)); vm.error = nil })
            AtlasPrimaryButton(text: "Confirmar", loading: vm.loading) { vm.confirmarCodigo() }
            Button("‹ Voltar") { vm.step = .dados; vm.error = nil }
                .font(.system(size: 14, weight: .semibold)).foregroundStyle(Atlas.verde)
        }
    }

    private var concluido: some View {
        AtlasCard {
            Text("Conta criada!").font(.system(size: 18, weight: .heavy)).foregroundStyle(Atlas.verde)
            Spacer().frame(height: 6)
            Text("Seu acesso foi criado com sucesso. Entre com seu CPF e a senha que você cadastrou.")
                .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
            Spacer().frame(height: 16)
            AtlasPrimaryButton(text: "Ir para o login", action: onBack)
        }
    }

    private func checkbox(marcado: Bool, texto: String, link: String,
                          toggle: @escaping () -> Void) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Button(action: toggle) {
                Image(systemName: marcado ? "checkmark.square.fill" : "square")
                    .foregroundStyle(marcado ? Atlas.verde : Atlas.inkMuted)
                    // Só o ícone (~17pt) era clicável, bem abaixo dos 44pt da Apple —
                    // e sem marcar os aceites não dá pra concluir o primeiro acesso.
                    .frame(width: 44, height: 44, alignment: .topLeading)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            Button { termoAberto = link } label: {
                Text(markdownParaTexto(texto))
                    .font(.system(size: 13))
                    .foregroundStyle(Atlas.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
        }
    }
}

struct TermoID: Identifiable { let tipo: String; var id: String { tipo } }
