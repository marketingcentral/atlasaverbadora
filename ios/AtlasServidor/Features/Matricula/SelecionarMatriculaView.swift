import SwiftUI

/// Seleção de vínculo — cada matrícula tem margem própria.
/// Espelha `SelecionarMatriculaScreen.kt`: a tela rola inteira e o botão
/// acompanha a lista (não fica preso no rodapé atrás da barra do sistema).
struct SelecionarMatriculaView: View {
    @ObservedObject var store: HomeStore
    let onContinue: () -> Void

    @State private var escolhida: String?

    var body: some View {
        Group {
            switch store.matriculasState {
            case .carregando:
                LoadingBox().frame(maxWidth: .infinity, maxHeight: .infinity).background(Atlas.fundo)
            case .erro(let msg):
                ErrorBox(message: msg) { store.load(force: true) }
                    .frame(maxWidth: .infinity, maxHeight: .infinity).background(Atlas.fundo)
            case .ok(let lista):
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Selecione a matrícula")
                            .font(.system(size: 24, weight: .heavy))
                            .foregroundStyle(Atlas.ink)
                        Spacer().frame(height: 6)
                        Text("Você pode ter vínculos em mais de um órgão. Cada um tem uma margem própria.")
                            .font(.system(size: 14))
                            .foregroundStyle(Atlas.inkMuted)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer().frame(height: 20)

                        if lista.isEmpty {
                            EmptyHint(text: "Nenhuma matrícula ativa encontrada para o seu CPF.")
                        }

                        ForEach(lista) { m in
                            card(m)
                            Spacer().frame(height: 12)
                        }

                        Spacer().frame(height: 12)
                        AtlasPrimaryButton(text: "Continuar", enabled: escolhidaAtual != nil) {
                            if let sel = escolhidaAtual {
                                store.selecionar(sel)
                                onContinue()
                            }
                        }
                        Spacer().frame(height: 16)
                    }
                    .padding(20)
                }
                .background(Atlas.fundo)
                .onAppear {
                    if escolhida == nil {
                        escolhida = store.selectedMatricula ?? lista.first?.matricula
                    }
                }
            }
        }
    }

    private var escolhidaAtual: String? { escolhida ?? store.selectedMatricula }

    private func card(_ info: MatriculaInfoDto) -> some View {
        let selected = info.matricula == escolhidaAtual
        return Button {
            escolhida = info.matricula
        } label: {
            VStack(alignment: .leading, spacing: 0) {
                Text(info.cargo)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Atlas.ink)
                Text(info.prefeitura)
                    .font(.system(size: 13))
                    .foregroundStyle(Atlas.inkMuted)
                Spacer().frame(height: 12)
                Text("Matrícula \(info.matricula)")
                    .font(.system(size: 14))
                    .foregroundStyle(Atlas.ink)
                Spacer().frame(height: 4)
                Text("Margem disponível \(Format.money(info.margem.margem.disponivel))")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Atlas.verde)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .background(selected ? Atlas.verdeSoft : Atlas.superficie)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(selected ? Atlas.verde : Atlas.divider, lineWidth: selected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}
