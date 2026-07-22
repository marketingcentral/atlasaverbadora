import SwiftUI

/// Abas: 0 Ativos · 1 Em análise · 2 Histórico. Espelha `ContratosScreen.kt`.
struct ContratosView: View {
    @ObservedObject var store: HomeStore
    @State private var tab = 0

    var body: some View {
        Group {
            switch store.matriculasState {
            case .carregando: LoadingBox()
            case .erro(let m): ErrorBox(message: m) { store.load(force: true) }
            case .ok:
                if let info = store.current() { conteudo(info) } else {
                    ErrorBox(message: "Nenhuma matrícula ativa.", onRetry: nil)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Atlas.fundo)
        .onAppear {
            if let pedida = store.consumirAbaContratos() { tab = pedida }
            store.load(force: true)
        }
    }

    private func conteudo(_ info: MatriculaInfoDto) -> some View {
        // Recusadas/expiradas/canceladas E as com ADF negada pela prefeitura
        // (falha em folha) vêm da lista de propostas → Histórico.
        let recusadas = store.propostas.filter { propostaFalhou($0) }
        let recusadasIds = Set(recusadas.map(\.id))
        let contratos = info.contratos ?? []
        let ativos = contratos.filter {
            $0.status.lowercased() != "quitado" && !recusadasIds.contains($0.id)
        }
        let quitados = contratos.filter {
            $0.status.lowercased() == "quitado" && !recusadasIds.contains($0.id)
        }
        let emAnalise = emAnaliseAtivas(store.propostas)
        let emAnaliseCount = emAnalise.count + store.cotacoesTelePendentes.count
        let histCount = quitados.count + recusadas.count + store.cotacoesTeleCanceladas.count
        let saldoPorId = Dictionary(
            (info.elegiveisPortabilidade ?? []).map { ($0.id, $0.saldoDevedor) },
            uniquingKeysWith: { a, _ in a })

        return VStack(alignment: .leading, spacing: 0) {
            Text("Contratos")
                .font(.system(size: 24, weight: .heavy)).foregroundStyle(Atlas.ink)
                .padding(.horizontal, 20).padding(.top, 16)
            Spacer().frame(height: 12)

            HStack(spacing: 4) {
                seg("Ativos", ativos.count, 0)
                seg("Em análise", emAnaliseCount, 1)
                seg("Histórico", histCount, 2)
            }
            .padding(4)
            .background(Atlas.superficie)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .padding(.horizontal, 20)

            Spacer().frame(height: 16)

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    switch tab {
                    case 0:
                        if ativos.isEmpty { EmptyHint(text: "Você não tem contratos ativos.") }
                        else { ForEach(ativos) { ContratoCard(c: $0, saldoDevedor: saldoPorId[$0.id]) } }
                    case 1:
                        Text("Solicitações enviadas ao banco. O status atualiza conforme a análise (banco) e a aplicação em folha (prefeitura).")
                            .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                        if emAnalise.isEmpty && store.cotacoesTelePendentes.isEmpty {
                            EmptyHint(text: "Você não tem solicitações em análise.")
                        } else {
                            ForEach(store.cotacoesTelePendentes) { CotacaoTeleCard(cot: $0) }
                            ForEach(emAnalise) { PropostaCard(p: $0) }
                        }
                    default:
                        if histCount == 0 { EmptyHint(text: "Nenhum contrato no histórico.") }
                        else {
                            ForEach(store.cotacoesTeleCanceladas) { TeleCanceladaCard(cot: $0) }
                            ForEach(recusadas.reversed()) { RecusadaCard(p: $0) }
                            ForEach(quitados) { ContratoCard(c: $0, saldoDevedor: saldoPorId[$0.id]) }
                        }
                    }
                    Spacer().frame(height: 24)
                }
                .padding(.horizontal, 20)
            }
        }
    }

    private func seg(_ label: String, _ count: Int, _ idx: Int) -> some View {
        let selected = tab == idx
        return Button { tab = idx } label: {
            VStack(spacing: 0) {
                Text(label)
                    .font(.system(size: 12, weight: .bold))
                    .lineLimit(1).minimumScaleFactor(0.8)
                Text("\(count)")
                    .font(.system(size: 15, weight: .heavy))
            }
            .foregroundStyle(selected ? Atlas.superficie : Atlas.inkMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(selected ? Atlas.verde : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Cards

/// Nome do TIPO da solicitação — pro servidor identificar o que está em análise.
func tipoPropostaNome(_ p: PropostaDto) -> String {
    if ehTelemedicina(convenio: p.convenio, observacoes: p.observacoes) { return "Telemedicina" }
    if p.tipoContrato?.uppercased() == "REFIN" || p.bancoOrigem != nil { return "Portabilidade" }
    switch p.tipoMargem?.uppercased() {
    case "CARTAO_CONSIGNADO": return "Cartão de Crédito Consignado"
    case "CARTAO_BENEFICIOS": return "Cartão Benefício Consignado"
    default:
        return p.tipoContrato?.uppercased() == "ECONSIGNADO"
            ? "Cartão de Crédito Consignado" : "Empréstimo Consignado"
    }
}

private func situacaoCurta(_ situacao: String) -> String {
    let s = situacao.lowercased()
    if s.contains("aguard") { return "Em análise" }
    if s.contains("ativo") || s.contains("averb") || s.contains("quitad") { return "Liberada" }
    if s.contains("expir") { return "Expirada" }
    if s.contains("cancel") { return "Cancelada" }
    if s.contains("recus") { return "Recusada" }
    return situacao
}

private func statusTone(_ situacao: String) -> ChipTone {
    let s = situacao.lowercased()
    if s.contains("aguard") { return .ambar }
    if s.contains("ativo") || s.contains("averb") || s.contains("quitad") { return .verde }
    return .neutro
}

struct PropostaCard: View {
    let p: PropostaDto
    var body: some View {
        let situacao = p.situacao ?? "—"
        let tipoNome = tipoPropostaNome(p)
        AtlasCard {
            StatusChip(text: situacaoCurta(situacao), tone: statusTone(situacao))
            Spacer().frame(height: 10)
            Text(tipoNome).font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
            Text("\(p.banco ?? "Banco Atlas") · \(p.id)\(p.data.map { " · criada em \($0)" } ?? "")")
                .font(.system(size: 12)).foregroundStyle(Atlas.inkMuted)

            Spacer().frame(height: 16)
            HStack(alignment: .top, spacing: 12) {
                switch tipoNome {
                case "Empréstimo Consignado":
                    statCol("Valor liberado", Format.money(p.valor), accent: true)
                    statCol("Parcelas", "\(p.parcelas)x de \(Format.money(p.parcela))")
                    statCol("Taxa mensal", Format.percentValue(p.taxaAm))
                case "Portabilidade":
                    statCol("Saldo a portar", Format.money(p.saldoDevedorOrigem ?? p.valor), accent: true)
                case "Telemedicina":
                    statCol("Plano", "\(Format.money(p.parcela))/mês · 12 meses", accent: true)
                default:
                    statCol("Limite", Format.money(p.valor), accent: true)
                }
            }

            Spacer().frame(height: 18)
            FaseTimeline(fase: faseDe(p),
                         fases: ehTelemedicina(convenio: p.convenio, observacoes: p.observacoes)
                            ? TELE_FASES : FASES)
        }
    }

    private func statCol(_ label: String, _ value: String, accent: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold)).kerning(0.6)
                .foregroundStyle(Atlas.inkMuted)
            Text(value)
                .font(.system(size: 14, weight: accent ? .heavy : .semibold))
                .foregroundStyle(accent ? Atlas.verde : Atlas.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct RecusadaCard: View {
    let p: PropostaDto
    @State private var expandido = false

    var body: some View {
        AtlasCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Proposta \(p.id)")
                        .font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                    Text(p.banco ?? "Banco Atlas")
                        .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                }
                Spacer()
                StatusChip(text: recusaRotulo(p.situacao, p.folhaStatus), tone: .neutro)
            }
            Spacer().frame(height: 12)
            RowDivider()
            Spacer().frame(height: 10)
            InfoRow(label: "Valor", value: Format.money(p.valor))
            InfoRow(label: "Parcela", value: "\(p.parcelas)x de \(Format.money(p.parcela))")
            if let d = p.data { InfoRow(label: "Solicitada em", value: d) }
            Spacer().frame(height: 6)
            Button { withAnimation { expandido.toggle() } } label: {
                HStack {
                    Text(expandido ? "Ocultar andamento" : "Ver andamento")
                        .font(.system(size: 14, weight: .bold))
                    Spacer()
                    Image(systemName: expandido ? "chevron.up" : "chevron.down")
                }
                .foregroundStyle(Atlas.verde)
            }
            if expandido {
                Spacer().frame(height: 12)
                FaseTimeline(fase: faseDe(p),
                             fases: ehTelemedicina(convenio: p.convenio, observacoes: p.observacoes)
                                ? TELE_FASES : FASES)
            }
        }
    }

    private func recusaRotulo(_ situacao: String?, _ folhaStatus: String?) -> String {
        let s = (situacao ?? "").lowercased()
        if s.contains("expir") { return "Expirada" }
        if s.contains("cancel") { return "Cancelada" }
        if s.contains("suspens") { return "Suspensa" }
        if s.contains("recus") { return "Recusada" }
        // Banco aprovou mas a prefeitura negou o desconto em folha (ADF).
        if folhaStatus?.lowercased() == "falha" { return "ADF negada" }
        return "Recusada"
    }
}

struct ContratoCard: View {
    let c: ContratoDto
    let saldoDevedor: Double?
    @State private var baixando = false

    var body: some View {
        let quitado = c.status.lowercased() == "quitado"
        let atual = quitado ? c.total : min(c.parcelasPagas + 1, c.total)
        let faltam = max(c.total - c.parcelasPagas, 0)
        let pct = c.total > 0 ? min(max(Double(c.parcelasPagas) / Double(c.total), 0), 1) : 0

        AtlasCard {
            Text(tipoContratoNome(c))
                .font(.system(size: 11, weight: .heavy)).foregroundStyle(Atlas.verde)
            Spacer().frame(height: 6)
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Contrato \(c.id)")
                        .font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                    Text(c.banco).font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                }
                Spacer()
                StatusChip(text: c.status,
                           tone: quitado ? .neutro : (c.status.lowercased() == "averbado" ? .ambar : .verde))
            }
            Spacer().frame(height: 14)
            RowDivider()
            Spacer().frame(height: 10)
            InfoRow(label: "Parcela", value: Format.money(c.parcela))
            InfoRow(label: "Parcela atual", value: "\(atual)/\(c.total)", valueColor: Atlas.verde)
            InfoRow(label: "Próxima parcela", value: c.proximaParcela ?? "—")
            InfoRow(label: "Taxa", value: Format.rateAm(c.taxaAm))
            if let saldo = saldoDevedor {
                InfoRow(label: "Saldo devedor", value: Format.money(saldo))
            } else {
                InfoRow(label: "Valor financiado", value: Format.money(c.valorFinanciado))
            }
            Spacer().frame(height: 10)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Atlas.divider).frame(height: 6)
                    Capsule().fill(Atlas.verde).frame(width: geo.size.width * pct, height: 6)
                }
            }
            .frame(height: 6)
            Spacer().frame(height: 8)
            Text(quitado ? "\(c.total) de \(c.total) parcelas pagas · quitado"
                         : "Faltam \(faltam) de \(c.total) parcelas")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(quitado ? Atlas.verde : Atlas.inkMuted)
            Spacer().frame(height: 12)
            AtlasSecondaryButton(text: "📄 Baixar Contrato") {
                ContratoDownloader.baixar(adf: c.id, anexoNome: c.anexoNome)
            }
        }
    }

    /// Rótulo do TIPO do contrato ativo — mesma classificação de "Em análise".
    private func tipoContratoNome(_ c: ContratoDto) -> String {
        if ehTelemedicina(convenio: nil, observacoes: c.observacoes) { return "TELEMEDICINA" }
        if c.tipoContrato?.uppercased() == "REFIN" || c.bancoOrigem != nil { return "PORTABILIDADE" }
        switch c.tipoMargem?.uppercased() {
        case "CARTAO_CONSIGNADO": return "CARTÃO DE CRÉDITO CONSIGNADO"
        case "CARTAO_BENEFICIOS": return "CARTÃO BENEFÍCIO CONSIGNADO"
        default:
            return c.tipoContrato?.uppercased() == "ECONSIGNADO"
                ? "CARTÃO DE CRÉDITO CONSIGNADO" : "EMPRÉSTIMO CONSIGNADO"
        }
    }
}

struct CotacaoTeleCard: View {
    let cot: CotacaoTelemedicinaDto
    var body: some View {
        AtlasCard {
            StatusChip(text: "Em análise", tone: .ambar)
            Spacer().frame(height: 10)
            Text("Telemedicina").font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
            Text("Cotação · solicitada em \(Format.dateBR(cot.criadoEm))")
                .font(.system(size: 12)).foregroundStyle(Atlas.inkMuted)
            Spacer().frame(height: 18)
            FaseTimeline(fase: FaseInfo(ativo: 0, concluido: false), fases: TELE_FASES)
        }
    }
}

struct TeleCanceladaCard: View {
    let cot: CotacaoTelemedicinaDto
    var body: some View {
        AtlasCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Telemedicina")
                        .font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                    Text("Cotação · solicitada em \(Format.dateBR(cot.criadoEm))")
                        .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                }
                Spacer()
                StatusChip(text: "Cancelada", tone: .neutro)
            }
        }
    }
}
