import SwiftUI

/// Exibe um termo cujo corpo vem da tela **Termos de aceite da averbadora**
/// (`/v1/servidores/me/termos/:tipo`), com as variáveis já substituídas pelo
/// servidor. Espelha `TermoRemoto.kt` + `TermoDialog` do Android.
///
/// O conteúdo rola dentro da folha — o app Android teve um bug em que o texto
/// era cortado sem permitir rolagem; aqui isso já nasce resolvido.
struct TermoSheet: View {
    let tipo: String
    var vars: [String: String] = [:]
    var tituloFallback: String? = nil

    @Environment(\.dismiss) private var dismiss
    @State private var termo: TermoDto?
    @State private var erro: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if let termo {
                        Text(markdownParaTexto(termo.corpo))
                            .font(.system(size: 14))
                            .foregroundStyle(Atlas.inkMuted)
                            .lineSpacing(4)
                            .fixedSize(horizontal: false, vertical: true)
                        if let v = termo.versao, !v.isEmpty {
                            Text("Versão \(v)")
                                .font(.system(size: 11))
                                .foregroundStyle(Atlas.inkMuted)
                        }
                    } else if let erro {
                        Text(erro).font(.system(size: 14)).foregroundStyle(Atlas.dangerRed)
                    } else {
                        ProgressView().tint(Atlas.verde).frame(maxWidth: .infinity)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
            }
            .background(Atlas.fundo)
            .navigationTitle(termo?.titulo ?? tituloFallback ?? "Termo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fechar") { dismiss() }.foregroundStyle(Atlas.verde)
                }
            }
        }
        .task {
            do { termo = try await Repo.termo(tipo: tipo, vars: vars) }
            catch let e as ApiError { erro = e.userMessage }
            catch { erro = "Não foi possível carregar o termo." }
        }
    }
}

/// Carrega o corpo de um termo para exibir embutido (fora de uma folha).
@MainActor
final class TermoLoader: ObservableObject {
    @Published var corpo: String?
    @Published var titulo: String?

    func carregar(tipo: String, vars: [String: String] = [:]) {
        Task {
            let t = try? await Repo.termo(tipo: tipo, vars: vars)
            corpo = t?.corpo
            titulo = t?.titulo
        }
    }
}
