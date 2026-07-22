import SwiftUI

/// Buckets de margem (regulados): empréstimo 35%, cartão consignado 5%,
/// cartão benefício 5%. Mesmas chaves usadas pela API.
enum Produtos {
    static let emprestimo = "EMPRESTIMO"
    static let cartaoConsignado = "CARTAO_CONSIGNADO"
    static let cartaoBeneficios = "CARTAO_BENEFICIOS"
}

private struct Banner {
    let tag: String, titulo: String, sub: String
}

private let BANNERS = [
    Banner(tag: "ANTECIPAÇÃO 13º", titulo: "Receba seu 13º adiantado", sub: "Taxa a partir de 1,55% a.m."),
    Banner(tag: "BANCO ATLAS", titulo: "Crédito com a menor taxa", sub: "Simule em segundos, direto da sua margem"),
    Banner(tag: "PORTABILIDADE", titulo: "Traga seu contrato e economize", sub: "Menos juros, mais dinheiro no bolso"),
]

/// Tela inicial — 3 cards de produto com margem por bucket, banners e atalho
/// de portabilidade. Espelha `InicioScreen.kt`.
struct InicioView: View {
    @ObservedObject var store: HomeStore
    let onAbrirContratos: (Int) -> Void
    let onAbrirPortabilidade: () -> Void
    let onAbrirBeneficios: () -> Void

    @State private var simular: String?

    var body: some View {
        Group {
            switch store.matriculasState {
            case .carregando: LoadingBox()
            case .erro(let m): ErrorBox(message: m) { store.load(force: true) }
            case .ok:
                if let info = store.current() { conteudo(info) } else {
                    EmptyHint(text: "Nenhuma matrícula ativa.")
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Atlas.fundo)
        .sheet(item: Binding(get: { simular.map { TermoID(tipo: $0) } },
                             set: { simular = $0?.tipo })) { p in
            SimularView(store: store, produto: p.tipo) {
                simular = nil
                onAbrirContratos(1)
            }
        }
    }

    private func conteudo(_ info: MatriculaInfoDto) -> some View {
        let teleEmAnalise = (info.telemedicinaEmAnalise ?? false) || !store.cotacoesTelePendentes.isEmpty
        let lockEmprestimo = store.produtoBloqueado(Produtos.emprestimo) || teleEmAnalise
        let lockCartao = store.produtoBloqueado(Produtos.cartaoConsignado)
        let lockBeneficio = store.produtoBloqueado(Produtos.cartaoBeneficios)

        let porTipo = Dictionary(uniqueKeysWithValues:
            (info.margem.margensPorTipo ?? []).map { ($0.tipo, $0) })
        let m = info.margem.margem
        let emprestimo = porTipo[Produtos.emprestimo]
            ?? MargemTipoDto(tipo: Produtos.emprestimo, total: m.comprometido + m.disponivel,
                             disponivel: m.disponivel)
        let cartaoCredito = porTipo[Produtos.cartaoConsignado]
            ?? MargemTipoDto(tipo: Produtos.cartaoConsignado, total: 0, disponivel: 0)
        let cartaoBeneficio = porTipo[Produtos.cartaoBeneficios]
            ?? MargemTipoDto(tipo: Produtos.cartaoBeneficios, total: 0, disponivel: 0)

        return ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header(info)
                Spacer().frame(height: 16)
                bannerCarrossel
                Spacer().frame(height: 24)

                SectionLabel(text: "Minhas margens")
                Spacer().frame(height: 12)

                produtoCard(
                    titulo: "Empréstimo Consignado",
                    descricao: "Dinheiro na sua conta, descontado direto da folha.",
                    margem: emprestimo, bloqueado: lockEmprestimo,
                    textoBotao: lockEmprestimo
                        ? (store.portabilidadeEmAnalise ? "Solicitação Bloqueada" : "Acompanhar análise")
                        : "Simular",
                    acao: { lockEmprestimo ? onAbrirContratos(1) : (simular = Produtos.emprestimo) })
                Spacer().frame(height: 12)

                produtoCard(
                    titulo: "Cartão de Crédito Consignado",
                    descricao: "Cartão com limite próprio e fatura descontada em folha.",
                    margem: cartaoCredito, bloqueado: lockCartao,
                    textoBotao: lockCartao ? "Acompanhar análise" : "Simular",
                    acao: { lockCartao ? onAbrirContratos(1) : (simular = Produtos.cartaoConsignado) })
                Spacer().frame(height: 12)

                produtoCard(
                    titulo: "Cartão Benefício Consignado",
                    descricao: "Cartão com limite próprio e fatura descontada em folha.",
                    margem: cartaoBeneficio, bloqueado: lockBeneficio,
                    textoBotao: lockBeneficio ? "Acompanhar análise" : "Ver Marketplace",
                    acao: { lockBeneficio ? onAbrirContratos(1) : onAbrirBeneficios() })

                Spacer().frame(height: 24)
                SectionLabel(text: "Portabilidade")
                Spacer().frame(height: 8)
                AtlasCard {
                    Text("Portabilidade")
                        .font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                    Spacer().frame(height: 6)
                    Text("Traga os empréstimos que você tem em outros bancos para o Atlas e pague menos juros.")
                        .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer().frame(height: 14)
                    AtlasSecondaryButton(text: "Ver Condições", action: onAbrirPortabilidade)
                }
                Spacer().frame(height: 24)
            }
            .padding(20)
        }
        .refreshable { store.load(force: true) }
    }

    private func header(_ info: MatriculaInfoDto) -> some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Olá, \(primeiroNome(store.userName))")
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundStyle(Atlas.ink)
                Text("\(info.prefeitura) · Mat. \(info.matricula)")
                    .font(.system(size: 13))
                    .foregroundStyle(Atlas.inkMuted)
            }
            Spacer()
        }
    }

    private var bannerCarrossel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(BANNERS.enumerated()), id: \.offset) { _, b in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(b.tag)
                            .font(.system(size: 10, weight: .black))
                            .kerning(0.8)
                            .foregroundStyle(Atlas.verde)
                        Text(b.titulo)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(Atlas.ink)
                        Text(b.sub)
                            .font(.system(size: 12))
                            .foregroundStyle(Atlas.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(width: 240, alignment: .leading)
                    .padding(16)
                    .background(Atlas.superficie)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Atlas.divider, lineWidth: 1))
                }
            }
        }
    }

    private func produtoCard(titulo: String, descricao: String, margem: MargemTipoDto,
                             bloqueado: Bool, textoBotao: String,
                             acao: @escaping () -> Void) -> some View {
        let usado = max(margem.total - margem.disponivel, 0)
        let pct = margem.total > 0 ? min(max(usado / margem.total, 0), 1) : 0
        return AtlasCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(titulo).font(.system(size: 16, weight: .bold)).foregroundStyle(Atlas.ink)
                    Text(descricao).font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                if bloqueado { StatusChip(text: "Em análise", tone: .ambar) }
            }
            Spacer().frame(height: 14)
            Text("Margem disponível")
                .font(.system(size: 11, weight: .bold)).kerning(0.5)
                .foregroundStyle(Atlas.inkMuted)
            Text(Format.money(margem.disponivel))
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(Atlas.verde)
            Spacer().frame(height: 10)
            // Barra "Em uso R$ X / Limite R$ Y"
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Atlas.divider).frame(height: 6)
                    Capsule().fill(Atlas.verde)
                        .frame(width: geo.size.width * pct, height: 6)
                }
            }
            .frame(height: 6)
            Spacer().frame(height: 8)
            Text("Em uso \(Format.money(usado)) / Limite \(Format.money(margem.total))")
                .font(.system(size: 12)).foregroundStyle(Atlas.inkMuted)
            Spacer().frame(height: 14)
            if bloqueado {
                AtlasSecondaryButton(text: textoBotao, action: acao)
            } else {
                AtlasPrimaryButton(text: textoBotao, action: acao)
            }
        }
    }

    /// "DIEGO PEREZ FERREIRA" -> "Diego"
    private func primeiroNome(_ name: String) -> String {
        guard let first = name.split(separator: " ").first else { return name }
        return first.prefix(1).uppercased() + first.dropFirst().lowercased()
    }
}
