import SwiftUI

// Acompanhamento em tempo real (servidor → banco → prefeitura).
// Espelha `ui/components/FaseTimeline.kt` do Android, incluindo a regra da ADF.

struct Fase {
    let label: String
    let hint: String
}

let FASES: [Fase] = [
    Fase(label: "Proposta enviada", hint: "Sua solicitação chegou ao banco."),
    Fase(label: "Aguardando aprovação", hint: "O banco está analisando a proposta."),
    Fase(label: "Aprovado pelo banco", hint: "O banco liberou o crédito e vai enviar o dinheiro."),
    Fase(label: "Aguardando ADF da prefeitura", hint: "A prefeitura vai confirmar o desconto em folha."),
    Fase(label: "Autorização completa", hint: "Desconto confirmado em folha. Tudo certo!"),
]

/// Telemedicina tem passo a passo PRÓPRIO — quem aprova é a averbadora
/// (não o banco), e depois ainda depende da ADF da prefeitura.
let TELE_FASES: [Fase] = [
    Fase(label: "Em Análise", hint: "A equipe da Atlas vai entrar em contato com você."),
    Fase(label: "Aprovado pela Averbadora", hint: "A Atlas aprovou seu plano de telemedicina."),
    Fase(label: "Aguardando aprovação de ADF", hint: "A prefeitura vai confirmar o desconto em folha."),
    Fase(label: "ADF Aprovada", hint: "Desconto confirmado em folha pela prefeitura."),
    Fase(label: "Autorização completa", hint: "Plano ativo. Tudo certo!"),
]

struct FaseInfo {
    var ativo: Int
    var concluido: Bool
    var falhaPasso: Int? = nil
    var falhaLabel: String? = nil
    var falhaMotivo: String? = nil
}

/// É um plano de Telemedicina? (marcado nas observações; o convênio é
/// re-derivado do convenioId e não serve sozinho).
func ehTelemedicina(convenio: String?, observacoes: String? = nil) -> Bool {
    "\(observacoes ?? "") \(convenio ?? "")".lowercased().contains("telemedicina")
}

/// Cadeia de fases da TELEMEDICINA (cotação → averbadora → ADF).
func teleFaseChain(situacao: String, folhaStatus: String?, motivo: String?) -> FaseInfo {
    let s = situacao.lowercased()
    if s.contains("cancel") || s.contains("recus") || s.contains("suspens") {
        return FaseInfo(ativo: 1, concluido: false, falhaPasso: 1,
                        falhaLabel: "Cotação cancelada", falhaMotivo: motivo)
    }
    if s.contains("expir") {
        return FaseInfo(ativo: 1, concluido: false, falhaPasso: 1,
                        falhaLabel: "Cotação expirada sem contato")
    }
    switch (folhaStatus ?? "").lowercased() {
    case "aplicada": return FaseInfo(ativo: 4, concluido: true)
    case "falha":
        return FaseInfo(ativo: 2, concluido: false, falhaPasso: 2,
                        falhaLabel: "ADF negada pela prefeitura", falhaMotivo: motivo)
    default: return FaseInfo(ativo: 2, concluido: false)
    }
}

/// Situação terminal de REPROVA (recusada/expirada/cancelada/suspensa).
func terminalHistorico(_ situacao: String?) -> Bool {
    let s = (situacao ?? "").lowercased()
    return s.contains("cancel") || s.contains("recus") || s.contains("expir") || s.contains("suspens")
}

/// Deriva a fase atual a partir da situação do banco + status da ADF.
func faseChain(situacao: String, folhaStatus: String?, motivo: String?) -> FaseInfo {
    let s = situacao.lowercased()
    if s.contains("cancel") || s.contains("recus") || s.contains("suspens") {
        return FaseInfo(ativo: 1, concluido: false, falhaPasso: 1,
                        falhaLabel: "Recusada pelo banco", falhaMotivo: motivo)
    }
    if s.contains("expir") {
        return FaseInfo(ativo: 1, concluido: false, falhaPasso: 1,
                        falhaLabel: "Proposta expirada sem resposta")
    }
    if s.contains("aguard") { return FaseInfo(ativo: 1, concluido: false) }
    switch (folhaStatus ?? "").lowercased() {
    case "aplicada": return FaseInfo(ativo: 4, concluido: true)
    case "falha":
        return FaseInfo(ativo: 3, concluido: false, falhaPasso: 3,
                        falhaLabel: "ADF negada pela prefeitura", falhaMotivo: motivo)
    default: return FaseInfo(ativo: 3, concluido: false)
    }
}

// MARK: - Classificação das propostas (Em análise / Ativos / Histórico)

func faseDe(_ p: PropostaDto) -> FaseInfo {
    ehTelemedicina(convenio: p.convenio, observacoes: p.observacoes)
        ? teleFaseChain(situacao: p.situacao ?? "—", folhaStatus: p.folhaStatus, motivo: p.folhaMotivo)
        : faseChain(situacao: p.situacao ?? "—", folhaStatus: p.folhaStatus, motivo: p.folhaMotivo)
}

/// Proposta encerrada com FALHA/negativa em qualquer etapa → vai pro Histórico.
/// Cobre não só a recusa do banco (situação textual), mas também a **ADF negada
/// pela prefeitura** (folhaStatus "falha") — nesse caso a situação do banco ainda
/// diz "Ativo", então `terminalHistorico` sozinho deixava a proposta presa em
/// "Em análise".
func propostaFalhou(_ p: PropostaDto) -> Bool {
    terminalHistorico(p.situacao) || faseDe(p).falhaPasso != nil
}

/// Em análise = ainda em andamento: não concluiu todas as etapas (a última é a
/// ADF aprovada) E não falhou/foi negada em nenhuma.
func emAnaliseAtivas(_ propostas: [PropostaDto]) -> [PropostaDto] {
    propostas.filter { p in
        let sit = (p.situacao ?? "").lowercased()
        return !propostaFalhou(p) && !sit.contains("quitad") && !faseDe(p).concluido
    }
}

// MARK: - View

/// "Menuzinho" vertical do processo em tempo real, com bolinhas conectadas.
struct FaseTimeline: View {
    let fase: FaseInfo
    var fases: [Fase] = FASES

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionLabel(text: "Acompanhamento em tempo real")
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(fases.enumerated()), id: \.offset) { i, f in
                    let isFalha = fase.falhaPasso == i
                    let done = !isFalha && (fase.concluido || i < fase.ativo)
                    let active = !isFalha && !fase.concluido && i == fase.ativo
                    let last = i == fases.count - 1

                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 0) {
                            ZStack {
                                Circle()
                                    .fill(isFalha ? Atlas.dangerRed
                                          : done ? Atlas.verde
                                          : active ? Atlas.ambar : Atlas.divider)
                                    .frame(width: 22, height: 22)
                                Text(isFalha ? "!" : done ? "✓" : "\(i + 1)")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(isFalha || done || active
                                                     ? Atlas.superficie : Atlas.inkMuted)
                            }
                            if !last {
                                Rectangle()
                                    .fill(done ? Atlas.verde : Atlas.divider)
                                    .frame(width: 2)
                                    .frame(maxHeight: .infinity)
                            }
                        }
                        .frame(width: 22)

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 8) {
                                Text(isFalha ? (fase.falhaLabel ?? f.label) : f.label)
                                    .font(.system(size: 14,
                                                  weight: active || isFalha ? .bold
                                                          : done ? .semibold : .regular))
                                    .foregroundStyle(isFalha ? Atlas.dangerRed
                                                     : (active || done) ? Atlas.ink : Atlas.inkMuted)
                                if active {
                                    Text("● agora")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(Atlas.ambar)
                                }
                            }
                            Text(isFalha
                                 ? (fase.falhaMotivo.map { "Motivo: \($0)" }
                                    ?? "Entre em contato com o banco para resolver.")
                                 : f.hint)
                                .font(.system(size: 12))
                                .foregroundStyle(Atlas.inkMuted)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.bottom, last ? 0 : 14)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}
