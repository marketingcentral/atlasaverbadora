import SwiftUI

/// Portabilidade — lista APENAS contratos de OUTROS bancos (a API já filtra os
/// do Banco Atlas). Espelha `PortabilidadeScreen.kt`.
struct PortabilidadeView: View {
    @ObservedObject var store: HomeStore
    let onSolicitado: () -> Void

    @State private var alvo: ElegivelDto?
    @State private var enviando = false
    @State private var erro: String?

    var body: some View {
        let info = store.current()
        let elegiveis = info?.elegiveisPortabilidade ?? []
        // Empréstimo/portabilidade em análise → margem reservada, bloqueia nova.
        let bloqueado = store.produtoBloqueado(Produtos.emprestimo) || store.portabilidadeEmAnalise

        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("Portabilidade")
                    .font(.system(size: 24, weight: .heavy)).foregroundStyle(Atlas.ink)
                Spacer().frame(height: 8)
                Text("Traga seus empréstimos de outros bancos para o Banco Atlas e pague menos juros.")
                    .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer().frame(height: 16)

                if bloqueado {
                    AtlasCard {
                        StatusChip(text: "Em análise", tone: .ambar)
                        Spacer().frame(height: 6)
                        Text("Você tem um empréstimo ou portabilidade em análise. A margem de empréstimo consignado está reservada — aguarde a resposta do banco para solicitar uma portabilidade.")
                            .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer().frame(height: 16)
                }

                if let erro {
                    Text(erro).font(.system(size: 13)).foregroundStyle(Atlas.dangerRed)
                    Spacer().frame(height: 12)
                }

                if elegiveis.isEmpty {
                    AtlasCard {
                        Text("Nenhum empréstimo encontrado")
                            .font(.system(size: 15, weight: .bold)).foregroundStyle(Atlas.ink)
                        Spacer().frame(height: 4)
                        Text("Não encontramos empréstimos de outros bancos na sua matrícula. Quando a prefeitura importar seus contratos, eles aparecem aqui para portabilidade.")
                            .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                } else {
                    Text("Seus contratos em outros bancos")
                        .font(.system(size: 12, weight: .semibold)).foregroundStyle(Atlas.inkMuted)
                    Spacer().frame(height: 12)
                    ForEach(elegiveis) { e in
                        card(e, bloqueado: bloqueado)
                        Spacer().frame(height: 12)
                    }
                }
                Spacer().frame(height: 24)
            }
            .padding(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Atlas.fundo)
        .sheet(item: $alvo) { e in
            TermoAceiteSheet(
                tipo: "portabilidade",
                vars: ["banco": e.banco,
                       "saldoDevedor": Format.money(e.saldoDevedor),
                       "valor": Format.money(e.saldoDevedor),
                       "parcela": Format.money(e.parcela),
                       "parcelas": "\(e.parcelasRestantes)",
                       "prazo": "5 dias",
                       "tipoLabel": e.tipo ?? "Empréstimo Consignado"],
                onAceitar: { solicitar(e) })
        }
    }

    private func card(_ e: ElegivelDto, bloqueado: Bool) -> some View {
        AtlasCard {
            Text(e.banco).font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
            Spacer().frame(height: 2)
            StatusChip(text: e.tipo ?? "Empréstimo Consignado", tone: .neutro)
            Spacer().frame(height: 10)
            InfoRow(label: "Saldo devedor", value: Format.money(e.saldoDevedor))
            InfoRow(label: "Parcela atual", value: Format.money(e.parcela))
            // Parcelas pagas quando a planilha da prefeitura traz o total (ex.: 20/60).
            if e.totalParcelas > 0 {
                InfoRow(label: "Parcelas pagas",
                        value: "\(max(e.totalParcelas - e.parcelasRestantes, 0))/\(e.totalParcelas)")
            }
            InfoRow(label: "Parcelas restantes", value: "\(e.parcelasRestantes)")
            Spacer().frame(height: 12)
            AtlasPrimaryButton(text: "Solicitar Portabilidade",
                               loading: enviando, enabled: !bloqueado) { alvo = e }
        }
    }

    private func solicitar(_ e: ElegivelDto) {
        alvo = nil
        enviando = true; erro = nil
        Task {
            do {
                _ = try await Repo.solicitarPortabilidade(
                    matricula: store.selectedMatricula, elegivelId: e.id)
                enviando = false
                store.load(force: true)
                onSolicitado()
            } catch let err as ApiError {
                erro = "Não foi possível enviar: \(err.userMessage)"; enviando = false
            } catch {
                erro = ApiError.inesperado.userMessage; enviando = false
            }
        }
    }
}
