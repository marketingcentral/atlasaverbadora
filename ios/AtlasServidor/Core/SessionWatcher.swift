import SwiftUI
import Combine

/// Vigia de inatividade — segurança do servidor logado.
/// Espelha `core/SessionWatcher.kt` do Android: 10 minutos sem interação →
/// logout automático e volta pro login com "Sua sessão expirou".
///
/// No iOS não existe `onUserInteraction`, então a detecção de toque é feita por
/// um gesto simultâneo instalado na raiz da navegação (ver `.detectaInteracao()`).
/// O tempo em segundo plano também conta: ao voltar, comparamos o instante da
/// última interação com o relógio.
@MainActor
final class SessionWatcher: ObservableObject {
    static let shared = SessionWatcher()
    private init() {}

    private let timeout: TimeInterval = 10 * 60  // 10 minutos

    /// Sessão expirou por inatividade? A UI observa e reage.
    @Published private(set) var expired = false

    private var armed = false
    private var ultimaInteracao = Date()
    private var timer: Timer?

    /// Liga o vigia — chamar quando o usuário entra numa área logada.
    func arm() {
        armed = true
        expired = false
        ultimaInteracao = Date()
        agendar()
    }

    /// Desliga — logout manual/expiração já tratados.
    func disarm() {
        armed = false
        timer?.invalidate()
        timer = nil
    }

    /// Registra interação do usuário — adia o timeout.
    func touch() {
        guard armed else { return }
        ultimaInteracao = Date()
    }

    /// Chamado quando o app volta do segundo plano: se passou do limite
    /// enquanto estava fora, expira na hora.
    func checarAoVoltar() {
        guard armed else { return }
        if Date().timeIntervalSince(ultimaInteracao) >= timeout { expirar() }
    }

    func consumirExpiracao() { expired = false }

    private func agendar() {
        timer?.invalidate()
        // Checagem a cada 15s — barata e suficiente para um limite de 10 min.
        timer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.armed else { return }
                if Date().timeIntervalSince(self.ultimaInteracao) >= self.timeout {
                    self.expirar()
                }
            }
        }
    }

    private func expirar() {
        disarm()
        expired = true
    }
}

extension View {
    /// Instala um detector de toque que não interfere nos gestos da tela
    /// (o `.simultaneousGesture` deixa botões e scroll funcionarem normalmente).
    func detectaInteracao() -> some View {
        simultaneousGesture(
            DragGesture(minimumDistance: 0, coordinateSpace: .global)
                .onChanged { _ in SessionWatcher.shared.touch() },
            including: .all
        )
    }
}
