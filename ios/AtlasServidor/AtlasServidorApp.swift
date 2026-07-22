import SwiftUI

@main
struct AtlasServidorApp: App {
    var body: some Scene {
        WindowGroup {
            RootView().atlasTheme()
        }
    }
}

private enum Rota {
    case login, primeiroAcesso, esqueciSenha, selecionarMatricula, main
}

/// Navegação raiz — equivale ao `AtlasNavHost.kt` do Android, incluindo o
/// tratamento de sessão expirada por inatividade (10 min).
struct RootView: View {
    @StateObject private var store = HomeStore()
    @ObservedObject private var watcher = SessionWatcher.shared
    @Environment(\.scenePhase) private var scenePhase

    @State private var rota: Rota = KeychainStore.shared.isLoggedIn ? .main : .login

    var body: some View {
        Group {
            switch rota {
            case .login:
                LoginView(
                    onLoggedIn: {
                        SessionWatcher.shared.arm()   // liga o vigia ao entrar na área logada
                        store.load(force: true)
                        rota = .selecionarMatricula
                    },
                    onPrimeiroAcesso: { rota = .primeiroAcesso },
                    onEsqueciSenha: { rota = .esqueciSenha })

            case .primeiroAcesso:
                PrimeiroAcessoView(onBack: { rota = .login })

            case .esqueciSenha:
                EsqueciSenhaView(onBack: { rota = .login })

            case .selecionarMatricula:
                SelecionarMatriculaView(store: store, onContinue: { rota = .main })

            case .main:
                MainShell(store: store,
                          onSwitchMatricula: { rota = .selecionarMatricula },
                          onLoggedOut: {
                              SessionWatcher.shared.disarm()  // logout manual
                              rota = .login
                          })
            }
        }
        .background(Atlas.fundo)
        .detectaInteracao()
        .onAppear {
            if KeychainStore.shared.isLoggedIn { SessionWatcher.shared.arm() }
        }
        // Inatividade: ao expirar, faz logout e volta pro login (o aviso fica
        // visível na tela de login enquanto `expired` for true).
        // API de 1 parâmetro: mantém compatibilidade com iOS 16.
        .onChange(of: watcher.expired) { expirou in
            guard expirou else { return }
            Task {
                await Repo.logout()
                rota = .login
            }
        }
        // O tempo em segundo plano também conta para o limite de 10 minutos.
        .onChange(of: scenePhase) { fase in
            if fase == .active { SessionWatcher.shared.checarAoVoltar() }
        }
    }
}
