import SwiftUI

enum AtlasTab: Hashable {
    case inicio, contratos, portabilidade, beneficios, conta
}

/// Shell principal com a barra inferior de 5 abas — mesma ordem e rótulos do
/// Android: Início · Contratos · **Portabilidade** (central, destaque verde) ·
/// Benefícios · Conta.
///
/// A barra é customizada (não usa TabView) para reproduzir o botão central
/// elevado em destaque, igual ao app Android.
struct MainShell: View {
    @ObservedObject var store: HomeStore
    let onSwitchMatricula: () -> Void
    let onLoggedOut: () -> Void

    @State private var tab: AtlasTab = .inicio

    var body: some View {
        VStack(spacing: 0) {
            conteudo
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                // O ScrollView do iOS estende os limites por baixo da barra de
                // status, então o conteúdo rolado colidia com o relógio (visível
                // na aba Conta). O Android confina o conteúdo via Scaffold —
                // clipar aqui reproduz esse comportamento.
                .clipped()
            BottomBar(atual: tab) { novo in
                tab = novo
            }
        }
        .background(Atlas.fundo)
        .onAppear { store.load() }
    }

    @ViewBuilder
    private var conteudo: some View {
        switch tab {
        case .inicio:
            InicioView(store: store,
                       onAbrirContratos: { idx in store.pedirAbaContratos(idx); tab = .contratos },
                       onAbrirPortabilidade: { tab = .portabilidade },
                       onAbrirBeneficios: { tab = .beneficios })
        case .contratos:
            ContratosView(store: store)
        case .portabilidade:
            PortabilidadeView(store: store, onSolicitado: {
                store.pedirAbaContratos(1); tab = .contratos
            })
        case .beneficios:
            TelemedicinaView(store: store, onSolicitado: {
                store.pedirAbaContratos(1); tab = .contratos
            })
        case .conta:
            ContaView(store: store, onSwitchMatricula: onSwitchMatricula, onLoggedOut: onLoggedOut)
        }
    }
}

private struct BottomBar: View {
    let atual: AtlasTab
    let onTab: (AtlasTab) -> Void

    // SF Symbols equivalentes aos vetores do Android (casa/documento/loja/saúde/pessoa).
    private let itens: [(tab: AtlasTab, label: String, icon: String, destaque: Bool)] = [
        (.inicio, "Início", "house", false),
        (.contratos, "Contratos", "doc.text", false),
        (.portabilidade, "Portabilidade", "storefront", true),
        (.beneficios, "Benefícios", "heart.text.square", false),
        (.conta, "Conta", "person", false),
    ]

    var body: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(itens, id: \.tab) { item in
                if item.destaque {
                    destaqueItem(item)
                } else {
                    navItem(item)
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 6)
        .background(
            Atlas.superficie
                .overlay(Rectangle().fill(Atlas.divider).frame(height: 1), alignment: .top)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private func navItem(_ item: (tab: AtlasTab, label: String, icon: String, destaque: Bool)) -> some View {
        let selected = atual == item.tab
        return Button { onTab(item.tab) } label: {
            VStack(spacing: 4) {
                Image(systemName: item.icon)
                    .font(.system(size: 20, weight: selected ? .semibold : .regular))
                    .frame(height: 24)
                Text(item.label)
                    .font(.system(size: 11, weight: selected ? .bold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(selected ? Atlas.verde : Atlas.inkMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }

    /// Aba central elevada, em destaque verde (igual ao Android).
    private func destaqueItem(_ item: (tab: AtlasTab, label: String, icon: String, destaque: Bool)) -> some View {
        Button { onTab(item.tab) } label: {
            VStack(spacing: 4) {
                ZStack {
                    Circle().fill(Atlas.verde)
                        .frame(width: 54, height: 54)
                        .shadow(color: Atlas.verde.opacity(0.35), radius: 8, y: 3)
                    Image(systemName: item.icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Atlas.superficie)
                }
                .offset(y: -12)
                Text(item.label)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(atual == item.tab ? Atlas.verde : Atlas.inkMuted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .offset(y: -10)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}
