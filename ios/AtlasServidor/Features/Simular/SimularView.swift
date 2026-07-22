import SwiftUI

/// Simulação pela Tabela Price (mesma fórmula PMT do domínio server-side).
enum Simulation {
    static func parcela(valor: Double, parcelas: Int, taxaAm: Double) -> Double {
        guard parcelas > 0 else { return 0 }
        guard taxaAm > 0 else { return valor / Double(parcelas) }
        let factor = pow(1 + taxaAm, -Double(parcelas))
        return valor * taxaAm / (1 - factor)
    }

    /// Maior empréstimo cuja parcela cabe na margem disponível.
    static func valorMaximo(margem: Double, parcelas: Int, taxaAm: Double) -> Double {
        guard parcelas > 0, margem > 0 else { return 0 }
        guard taxaAm > 0 else { return margem * Double(parcelas) }
        let factor = pow(1 + taxaAm, -Double(parcelas))
        return margem * (1 - factor) / taxaAm
    }
}

@MainActor
final class SimularModel: ObservableObject {
    @Published var valor: Double = 0
    @Published var parcelas: Int = 48
    @Published var taxaAm: Double = 0.0179
    @Published var enviando = false
    @Published var erro: String?
    @Published var termoAberto = false

    let produto: String
    private let info: MatriculaInfoDto?

    init(produto: String, info: MatriculaInfoDto?) {
        self.produto = produto
        self.info = info
        valor = (valorMaximo * 0.5).rounded()
    }

    var produtoLabel: String {
        switch produto {
        case Produtos.cartaoConsignado: return "Cartão de Crédito Consignado"
        case Produtos.cartaoBeneficios: return "Cartão Benefício Consignado"
        default: return "Empréstimo Consignado"
        }
    }

    var ehCartao: Bool {
        produto == Produtos.cartaoConsignado || produto == Produtos.cartaoBeneficios
    }

    /// Empréstimo usa o bloco `margem`; cartões usam o bucket próprio.
    var margemDisponivel: Double {
        guard let info else { return 0 }
        if produto == Produtos.emprestimo { return info.margem.margem.disponivel }
        return (info.margem.margensPorTipo ?? []).first { $0.tipo == produto }?.disponivel ?? 0
    }

    var valorMaximo: Double { Simulation.valorMaximo(margem: margemDisponivel, parcelas: parcelas, taxaAm: taxaAm) }
    var parcelaMensal: Double { Simulation.parcela(valor: valor, parcelas: parcelas, taxaAm: taxaAm) }
    var totalPago: Double { parcelaMensal * Double(parcelas) }
    var cabeNaMargem: Bool { parcelaMensal <= margemDisponivel + 0.005 }
    /// Limite do cartão = 30x a margem do bucket (regra do Android).
    var limiteCartao: Double { floor(margemDisponivel * 30) }

    func enviar(matricula: String?, onOk: @escaping () -> Void) {
        enviando = true; erro = nil
        Task {
            do {
                if ehCartao {
                    _ = try await Repo.solicitarCartao(
                        produto: produto == Produtos.cartaoConsignado ? "cartao_consignado" : "cartao_beneficio",
                        bancoNome: "Banco Atlas", limite: limiteCartao, matricula: matricula)
                } else {
                    _ = try await Repo.criarProposta(
                        valor: valor, parcelas: parcelas, taxaAm: taxaAm,
                        matricula: matricula, bancoNome: "Banco Atlas", produto: produto)
                }
                enviando = false
                onOk()
            } catch let e as ApiError { erro = e.userMessage; enviando = false }
            catch { erro = ApiError.inesperado.userMessage; enviando = false }
        }
    }
}

/// Simulação + termo de aceite antes de enviar a proposta ao banco.
struct SimularView: View {
    @ObservedObject var store: HomeStore
    let produto: String
    let onSolicitado: () -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var vm: SimularModel

    init(store: HomeStore, produto: String, onSolicitado: @escaping () -> Void) {
        self.store = store
        self.produto = produto
        self.onSolicitado = onSolicitado
        _vm = StateObject(wrappedValue: SimularModel(produto: produto, info: store.current()))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if vm.ehCartao { cartaoConteudo } else { emprestimoConteudo }

                    if let erro = vm.erro {
                        Text(erro).font(.system(size: 13)).foregroundStyle(Atlas.dangerRed)
                    }

                    AtlasPrimaryButton(
                        text: vm.ehCartao ? "Solicitar cartão" : "Solicitar empréstimo",
                        loading: vm.enviando,
                        enabled: vm.ehCartao ? vm.limiteCartao > 0 : (vm.cabeNaMargem && vm.valor > 0)
                    ) { vm.termoAberto = true }
                }
                .padding(20)
            }
            .background(Atlas.fundo)
            .navigationTitle(vm.produtoLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }.foregroundStyle(Atlas.inkMuted)
                }
            }
            .sheet(isPresented: $vm.termoAberto) {
                TermoAceiteSheet(
                    tipo: vm.ehCartao
                        ? (produto == Produtos.cartaoConsignado ? "cartao_consignado" : "cartao_beneficio")
                        : "emprestimo",
                    vars: vm.ehCartao
                        ? ["produto": vm.produtoLabel, "limite": Format.money(vm.limiteCartao), "banco": "Banco Atlas"]
                        : ["tipoLabel": "Novo empréstimo", "valor": Format.money(vm.valor),
                           "parcelas": "\(vm.parcelas)", "parcela": Format.money(vm.parcelaMensal),
                           "banco": "Banco Atlas", "prazo": "48 horas"],
                    onAceitar: {
                        vm.termoAberto = false
                        vm.enviar(matricula: store.selectedMatricula) {
                            store.load(force: true)
                            dismiss()
                            onSolicitado()
                        }
                    })
            }
        }
    }

    // MARK: - Empréstimo

    private var emprestimoConteudo: some View {
        VStack(alignment: .leading, spacing: 16) {
            AtlasCard {
                Text("Margem disponível")
                    .font(.system(size: 11, weight: .bold)).foregroundStyle(Atlas.inkMuted)
                Text(Format.money(vm.margemDisponivel))
                    .font(.system(size: 24, weight: .heavy)).foregroundStyle(Atlas.verde)
                Spacer().frame(height: 4)
                Text("Valor máximo estimado: \(Format.money(vm.valorMaximo))")
                    .font(.system(size: 12)).foregroundStyle(Atlas.inkMuted)
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Valor solicitado")
                Text(Format.money(vm.valor))
                    .font(.system(size: 28, weight: .heavy)).foregroundStyle(Atlas.ink)
                Slider(value: $vm.valor, in: 0...max(vm.valorMaximo, 1), step: 100)
                    .tint(Atlas.verde)
            }

            VStack(alignment: .leading, spacing: 8) {
                SectionLabel(text: "Parcelas")
                Picker("Parcelas", selection: $vm.parcelas) {
                    ForEach([12, 24, 36, 48, 60, 72, 84, 96], id: \.self) { p in
                        Text("\(p)x").tag(p)
                    }
                }
                .pickerStyle(.segmented)
            }

            AtlasCard {
                InfoRow(label: "Parcela mensal", value: Format.money(vm.parcelaMensal),
                        valueColor: vm.cabeNaMargem ? Atlas.verde : Atlas.dangerRed)
                InfoRow(label: "Taxa", value: Format.rateAm(vm.taxaAm))
                InfoRow(label: "Total a pagar", value: Format.money(vm.totalPago))
                if !vm.cabeNaMargem {
                    Spacer().frame(height: 8)
                    Text("A parcela ultrapassa sua margem disponível. Reduza o valor ou aumente o prazo.")
                        .font(.system(size: 12)).foregroundStyle(Atlas.dangerRed)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    // MARK: - Cartão

    private var cartaoConteudo: some View {
        VStack(alignment: .leading, spacing: 16) {
            AtlasCard {
                Text("Margem do cartão")
                    .font(.system(size: 11, weight: .bold)).foregroundStyle(Atlas.inkMuted)
                Text(Format.money(vm.margemDisponivel))
                    .font(.system(size: 24, weight: .heavy)).foregroundStyle(Atlas.verde)
                Spacer().frame(height: 12)
                RowDivider()
                Spacer().frame(height: 12)
                Text("Limite proposto")
                    .font(.system(size: 11, weight: .bold)).foregroundStyle(Atlas.inkMuted)
                Text(Format.money(vm.limiteCartao))
                    .font(.system(size: 24, weight: .heavy)).foregroundStyle(Atlas.ink)
            }
            AtlasCard {
                Text("Como funciona")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(Atlas.ink)
                Spacer().frame(height: 6)
                Text("A fatura mínima mensal é descontada direto da folha, respeitando o limite regulatório de 5% do seu salário líquido para este cartão.")
                    .font(.system(size: 13)).foregroundStyle(Atlas.inkMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

/// Termo de aceite com botão de confirmação — o corpo vem da averbadora.
struct TermoAceiteSheet: View {
    let tipo: String
    var vars: [String: String] = [:]
    let onAceitar: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var termo: TermoDto?
    @State private var erro: String?
    @State private var aceito = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        if let termo {
                            Text(markdownParaTexto(termo.corpo))
                                .font(.system(size: 14))
                                .foregroundStyle(Atlas.inkMuted)
                                .lineSpacing(4)
                                .fixedSize(horizontal: false, vertical: true)
                        } else if let erro {
                            Text(erro).font(.system(size: 14)).foregroundStyle(Atlas.dangerRed)
                        } else {
                            ProgressView().tint(Atlas.verde).frame(maxWidth: .infinity)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                }
                VStack(spacing: 12) {
                    Button { aceito.toggle() } label: {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: aceito ? "checkmark.square.fill" : "square")
                                .foregroundStyle(aceito ? Atlas.verde : Atlas.inkMuted)
                            Text("Li, entendi e **aceito o termo de autorização**")
                                .font(.system(size: 13)).foregroundStyle(Atlas.ink)
                            Spacer()
                        }
                    }
                    AtlasPrimaryButton(text: "Autorizar e continuar", enabled: aceito) {
                        onAceitar()
                    }
                }
                .padding(20)
                .background(Atlas.superficie)
            }
            .background(Atlas.fundo)
            .navigationTitle(termo?.titulo ?? "Termo de autorização")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }.foregroundStyle(Atlas.inkMuted)
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
