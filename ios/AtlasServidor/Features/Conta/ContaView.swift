import SwiftUI

/// Conta — matrícula ativa, dados funcionais, contato, suporte e termos.
/// Espelha `ContaScreen.kt` já com as correções aplicadas no Android: dados
/// funcionais **empilhados** (não desalinham com nomes/órgãos longos) e **sem
/// o campo Endereço**.
struct ContaView: View {
    @ObservedObject var store: HomeStore
    let onSwitchMatricula: () -> Void
    let onLoggedOut: () -> Void

    @State private var termoAberto: String?
    @State private var suporteAberto = false
    @State private var confirmarSaida = false

    var body: some View {
        Group {
            switch store.matriculasState {
            case .carregando: LoadingBox()
            case .erro(let m): ErrorBox(message: m) { store.load(force: true) }
            case .ok: conteudo
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Atlas.fundo)
        .sheet(item: Binding(get: { termoAberto.map { TermoID(tipo: $0) } },
                             set: { termoAberto = $0?.tipo })) { t in
            TermoSheet(tipo: t.tipo)
        }
        .sheet(isPresented: $suporteAberto) { SuporteSheet() }
        .confirmationDialog("Sair da conta?", isPresented: $confirmarSaida, titleVisibility: .visible) {
            Button("Sair", role: .destructive) { store.logout(onDone: onLoggedOut) }
            Button("Cancelar", role: .cancel) {}
        }
    }

    private var conteudo: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("Conta")
                    .font(.system(size: 24, weight: .heavy)).foregroundStyle(Atlas.ink)
                Spacer().frame(height: 4)
                Text(store.userName).font(.system(size: 15)).foregroundStyle(Atlas.inkMuted)
                Spacer().frame(height: 20)

                if let info = store.current() {
                    SectionLabel(text: "Matrícula ativa")
                    Spacer().frame(height: 8)
                    AtlasCard {
                        Text(info.cargo).font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                        Text("\(info.prefeitura) · \(info.uf)")
                            .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                        Spacer().frame(height: 6)
                        Text("Mat. \(info.matricula)").font(.system(size: 14)).foregroundStyle(Atlas.ink)
                    }
                    Spacer().frame(height: 10)
                    AtlasSecondaryButton(text: "Trocar matrícula", action: onSwitchMatricula)

                    Spacer().frame(height: 24)
                    SectionLabel(text: "Dados funcionais · não editáveis")
                    Spacer().frame(height: 8)
                    // Empilhado: o layout lado-a-lado quebrava com nomes/órgãos longos.
                    AtlasCard {
                        StackedRow(label: "Nome", value: info.nome)
                        RowDivider()
                        StackedRow(label: "Cargo", value: info.cargo)
                        RowDivider()
                        StackedRow(label: "Vínculo", value: info.vinculo)
                        RowDivider()
                        StackedRow(label: "Órgão", value: info.prefeitura)
                    }

                    Spacer().frame(height: 24)
                    SectionLabel(text: "Contato")
                    Spacer().frame(height: 8)
                    AtlasCard {
                        StackedRow(label: "E-mail", value: info.email)
                        RowDivider()
                        StackedRow(label: "Telefone", value: Format.phone(info.telefone))
                    }
                }

                Spacer().frame(height: 24)
                SectionLabel(text: "Suporte")
                Spacer().frame(height: 8)
                AtlasCard {
                    linkRow("Suporte") { suporteAberto = true }
                    RowDivider()
                    linkRow("Termos de Uso") { termoAberto = "termos_uso" }
                    RowDivider()
                    linkRow("Políticas de Privacidade") { termoAberto = "politica_privacidade" }
                }

                Spacer().frame(height: 28)
                Button { confirmarSaida = true } label: {
                    Text("Sair da conta")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Atlas.dangerRed)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                }
                Spacer().frame(height: 24)
            }
            .padding(20)
        }
    }

    private func linkRow(_ text: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(text).font(.system(size: 15, weight: .medium)).foregroundStyle(Atlas.ink)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
            }
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }
}

struct SuporteSheet: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Precisa de ajuda com sua margem, contratos ou benefícios?")
                        .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                    // Empilhado: e-mail longo desalinhava no layout lado-a-lado.
                    StackedRow(label: "E-mail", value: "suporte@atlasaverbadora.com.br")
                    StackedRow(label: "Telefone", value: "(48) 3000-0000")
                    Text("Para dúvidas sobre desconto em folha, procure também o RH da sua prefeitura.")
                        .font(.system(size: 12.5)).foregroundStyle(Atlas.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }
            .background(Atlas.fundo)
            .navigationTitle("Suporte")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fechar") { dismiss() }.foregroundStyle(Atlas.verde)
                }
            }
        }
    }
}
