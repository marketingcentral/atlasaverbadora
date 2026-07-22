import SwiftUI

/// Aba "Benefícios" — telemedicina + parceiros conveniados.
/// Espelha `TelemedicinaScreen.kt`: cotação (a Atlas entra em contato),
/// bloqueio de 48h da margem de empréstimo e "Plano Ativo" quando aprovado.
struct TelemedicinaView: View {
    @ObservedObject var store: HomeStore
    let onSolicitado: () -> Void

    @State private var beneficios: [BeneficioDto] = []
    @State private var mostrarCotacao = false
    @State private var enviando = false
    @State private var erro: String?

    private var cotacaoEmAndamento: CotacaoTelemedicinaDto? {
        store.cotacoesTelePendentes.first
    }

    /// Plano ativo = contrato de telemedicina vigente na matrícula.
    private var planoAtivo: ContratoDto? {
        (store.current()?.contratos ?? []).first {
            ehTelemedicina(convenio: nil, observacoes: $0.observacoes)
                && $0.status.lowercased() != "quitado"
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Text("Benefícios")
                    .font(.system(size: 24, weight: .heavy)).foregroundStyle(Atlas.ink)
                Spacer().frame(height: 8)
                Text("Serviços conveniados com desconto direto em folha.")
                    .font(.system(size: 14)).foregroundStyle(Atlas.inkMuted)
                Spacer().frame(height: 20)

                SectionLabel(text: "Telemedicina Atlas")
                Spacer().frame(height: 8)
                telemedicinaCard

                if !beneficios.isEmpty {
                    Spacer().frame(height: 24)
                    SectionLabel(text: "Parceiros")
                    Spacer().frame(height: 8)
                    ForEach(beneficios) { b in
                        beneficioCard(b)
                        Spacer().frame(height: 12)
                    }
                }
                Spacer().frame(height: 24)
            }
            .padding(20)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Atlas.fundo)
        .task {
            beneficios = (try? await Repo.beneficios(categoria: nil,
                                                     matricula: store.selectedMatricula)) ?? []
        }
        .sheet(isPresented: $mostrarCotacao) {
            TermoAceiteSheet(tipo: "telemedicina",
                             vars: ["parceiro": "Atlas Saúde"],
                             onAceitar: { solicitarCotacao() })
        }
    }

    @ViewBuilder
    private var telemedicinaCard: some View {
        AtlasCard {
            if let plano = planoAtivo {
                // Plano ativo: mostra progresso das 12 mensalidades.
                StatusChip(text: "Plano Ativo", tone: .verde)
                Spacer().frame(height: 10)
                Text("Telemedicina Atlas")
                    .font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                Spacer().frame(height: 6)
                Text("Consultas online 24h com médicos parceiros (Clínico Geral, Pediatria, Psicologia e Nutrição).")
                    .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer().frame(height: 14)
                InfoRow(label: "Mensalidade", value: Format.money(plano.parcela))
                InfoRow(label: "Vigência", value: "\(plano.parcelasPagas)/\(plano.total) meses")
                Spacer().frame(height: 10)
                let pct = plano.total > 0
                    ? min(max(Double(plano.parcelasPagas) / Double(plano.total), 0), 1) : 0
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Atlas.divider).frame(height: 6)
                        Capsule().fill(Atlas.verde).frame(width: geo.size.width * pct, height: 6)
                    }
                }
                .frame(height: 6)
            } else if let cot = cotacaoEmAndamento {
                StatusChip(text: "Em análise", tone: .ambar)
                Spacer().frame(height: 10)
                Text("Telemedicina Atlas")
                    .font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                Spacer().frame(height: 6)
                Text("Sua cotação foi enviada em \(Format.dateBR(cot.criadoEm)). A equipe da Atlas vai entrar em contato com você.")
                    .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer().frame(height: 14)
                FaseTimeline(fase: FaseInfo(ativo: 0, concluido: false), fases: TELE_FASES)
            } else {
                Text("Telemedicina Atlas")
                    .font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                Spacer().frame(height: 6)
                Text("Consultas online 24h com médicos parceiros (Clínico Geral, Pediatria, Psicologia e Nutrição). Plano com compromisso mínimo de 12 meses.")
                    .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer().frame(height: 12)
                Text("Ao solicitar a cotação, a equipe da Atlas recebe seus dados de contato e entra em contato para formalizar a solicitação.")
                    .font(.system(size: 12)).foregroundStyle(Atlas.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
                if let erro {
                    Spacer().frame(height: 10)
                    Text(erro).font(.system(size: 13)).foregroundStyle(Atlas.dangerRed)
                }
                Spacer().frame(height: 14)
                AtlasPrimaryButton(text: "Solicitar Cotação", loading: enviando) {
                    mostrarCotacao = true
                }
            }
        }
    }

    private func beneficioCard(_ b: BeneficioDto) -> some View {
        AtlasCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(b.nome).font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                    if let d = b.descricaoCurta, !d.isEmpty {
                        Text(d).font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if let local = b.local, !local.isEmpty {
                        Text(local).font(.system(size: 12)).foregroundStyle(Atlas.inkMuted)
                    }
                }
                Spacer(minLength: 8)
                if let desconto = b.descontoLabel, !desconto.isEmpty {
                    StatusChip(text: desconto, tone: .verde)
                }
            }
            if let link = b.linkAcesso, let url = URL(string: link.url) {
                Spacer().frame(height: 12)
                AtlasSecondaryButton(text: link.textoBotao ?? "Acessar") {
                    UIApplication.shared.open(url)
                }
            }
        }
    }

    private func solicitarCotacao() {
        mostrarCotacao = false
        enviando = true; erro = nil
        Task {
            do {
                _ = try await Repo.solicitarCotacaoTelemedicina(matricula: store.selectedMatricula)
                enviando = false
                store.load(force: true)
                onSolicitado()
            } catch let e as ApiError {
                erro = "Não foi possível enviar: \(e.userMessage)"; enviando = false
            } catch {
                erro = ApiError.inesperado.userMessage; enviando = false
            }
        }
    }
}
