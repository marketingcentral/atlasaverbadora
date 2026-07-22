import SwiftUI

enum Carga<T> {
    case carregando
    case ok(T)
    case erro(String)
}

/// Estado compartilhado do shell (Início / Contratos / Portabilidade /
/// Telemedicina / Conta). Espelha `HomeViewModel.kt` do Android: carrega o
/// snapshot completo das matrículas e expõe o vínculo selecionado.
@MainActor
final class HomeStore: ObservableObject {
    @Published var matriculasState: Carga<[MatriculaInfoDto]> = .carregando
    @Published var selectedMatricula: String? = AppPrefs.shared.selectedMatricula
    @Published var refreshing = false

    /// Produtos com proposta EM ANÁLISE agora (margem bloqueada para eles).
    /// `nil` = ainda não consultado → NÃO bloqueia.
    @Published var produtosPendentes: Set<String>?
    /// Portabilidade (REFIN) em análise → empréstimo mostra bloqueado.
    @Published var portabilidadeEmAnalise = false

    @Published var propostas: [PropostaDto] = []
    @Published var comunicados: [ComunicadoDto] = []
    @Published var cotacoesTelePendentes: [CotacaoTelemedicinaDto] = []
    @Published var cotacoesTeleCanceladas: [CotacaoTelemedicinaDto] = []

    /// Aba pedida ao abrir Contratos (0 Ativos, 1 Em análise, 2 Histórico).
    private var contratosTabRequest: Int?
    func pedirAbaContratos(_ i: Int) { contratosTabRequest = i }
    func consumirAbaContratos() -> Int? {
        defer { contratosTabRequest = nil }
        return contratosTabRequest
    }

    var userName: String { KeychainStore.shared.userName ?? "Servidor" }

    var matriculas: [MatriculaInfoDto] {
        if case let .ok(list) = matriculasState { return list }
        return []
    }

    func current() -> MatriculaInfoDto? {
        let list = matriculas
        return list.first { $0.matricula == selectedMatricula } ?? list.first
    }

    func selecionar(_ matricula: String) {
        selectedMatricula = matricula
        AppPrefs.shared.selectedMatricula = matricula
    }

    func load(force: Bool = false) {
        Task {
            if force { refreshing = true } else if matriculas.isEmpty { matriculasState = .carregando }
            do {
                let list = try await Repo.matriculas()
                if selectedMatricula == nil || !list.contains(where: { $0.matricula == selectedMatricula }) {
                    selectedMatricula = list.first?.matricula
                    AppPrefs.shared.selectedMatricula = selectedMatricula
                }
                matriculasState = .ok(list)
                await reconcile()
            } catch let e as ApiError {
                matriculasState = .erro(e.userMessage)
            } catch {
                matriculasState = .erro(ApiError.inesperado.userMessage)
            }
            refreshing = false
        }
        Task {
            // Best-effort: sem comunicados os slides caem no conteúdo padrão.
            comunicados = (try? await Repo.comunicados()) ?? []
        }
    }

    /// Confere no servidor quais produtos ainda têm proposta EM ANÁLISE.
    private func reconcile() async {
        if let cots = try? await Repo.minhasCotacoesTelemedicina() {
            cotacoesTeleCanceladas = cots.filter { $0.situacao == "cancelado" }
            cotacoesTelePendentes = cots.filter { $0.situacao == "nova" || $0.situacao == "contatado" }
        }
        guard let props = try? await Repo.propostas(matricula: selectedMatricula) else { return }
        propostas = props
        let pendentes = Set(props.filter { isReservaPendente($0.situacao) }
            .map { produtoDaProposta(tipoContrato: $0.tipoContrato, tipoMargem: $0.tipoMargem) })
        produtosPendentes = pendentes
        portabilidadeEmAnalise = props.contains {
            isReservaPendente($0.situacao) && ($0.tipoContrato?.uppercased() == "REFIN")
        }
    }

    /// Fonte da verdade = servidor. Enquanto não respondeu, NÃO bloqueia.
    func produtoBloqueado(_ produto: String) -> Bool {
        produtosPendentes?.contains(produto) == true
    }

    func logout(onDone: @escaping () -> Void) {
        Task {
            await Repo.logout()
            onDone()
        }
    }
}
