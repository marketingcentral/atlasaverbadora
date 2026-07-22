import SwiftUI

// Componentes base — espelham `ui/components/Components.kt` do Android.

/// Cartão branco com borda suave, usado em todas as telas.
struct AtlasCard<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .background(Atlas.superficie)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Atlas.divider, lineWidth: 1)
            )
    }
}

struct AtlasPrimaryButton: View {
    let text: String
    var loading: Bool = false
    var enabled: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if loading {
                    ProgressView().tint(Atlas.superficie)
                }
                Text(loading ? "Aguarde…" : text)
                    .font(.system(size: 16, weight: .bold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(enabled && !loading ? Atlas.verde : Atlas.divider)
            .foregroundStyle(enabled && !loading ? Atlas.superficie : Atlas.inkMuted)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(!enabled || loading)
    }
}

struct AtlasSecondaryButton: View {
    let text: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Atlas.superficie)
                .foregroundStyle(Atlas.ink)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Atlas.divider, lineWidth: 1)
                )
        }
    }
}

enum ChipTone { case verde, ambar, neutro, danger }

struct StatusChip: View {
    let text: String
    var tone: ChipTone = .neutro

    private var colors: (bg: Color, fg: Color) {
        switch tone {
        case .verde: return (Atlas.verdeSoft, Atlas.verdeDark)
        case .ambar: return (Atlas.ambarSoft, Atlas.ambar)
        case .danger: return (Atlas.dangerRed.opacity(0.12), Atlas.dangerRed)
        case .neutro: return (Atlas.fundo, Atlas.inkMuted)
        }
    }

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(colors.bg)
            .foregroundStyle(colors.fg)
            .clipShape(Capsule())
    }
}

/// Rótulo de seção em caixa alta (SectionLabel do Android).
struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .bold))
            .kerning(0.8)
            .foregroundStyle(Atlas.inkMuted)
    }
}

/// Linha rótulo/valor lado a lado.
struct InfoRow: View {
    let label: String
    let value: String
    var valueColor: Color = Atlas.ink
    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(Atlas.inkMuted)
            Spacer(minLength: 12)
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(valueColor)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 4)
    }
}

/// Rótulo em cima, valor embaixo em largura total — não desalinha com textos
/// longos (usado em Dados funcionais e Contato, como no Android).
struct StackedRow: View {
    let label: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Atlas.inkMuted)
            Text(value)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Atlas.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
    }
}

struct RowDivider: View {
    var body: some View { Rectangle().fill(Atlas.divider).frame(height: 1) }
}

struct LoadingBox: View {
    var body: some View {
        VStack { ProgressView().tint(Atlas.verde) }
            .frame(maxWidth: .infinity, minHeight: 160)
    }
}

struct ErrorBox: View {
    let message: String
    var onRetry: (() -> Void)?
    var body: some View {
        VStack(spacing: 12) {
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Atlas.inkMuted)
                .multilineTextAlignment(.center)
            if let onRetry {
                Button("Tentar novamente", action: onRetry)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Atlas.verde)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 160)
        .padding(20)
    }
}

struct EmptyHint: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundStyle(Atlas.inkMuted)
            .frame(maxWidth: .infinity, minHeight: 160)
    }
}

/// Cabeçalho com botão voltar (BackHeader do Android).
struct BackHeader: View {
    let title: String
    let onBack: () -> Void
    var body: some View {
        HStack(spacing: 12) {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Atlas.ink)
            }
            Text(title)
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(Atlas.ink)
            Spacer()
        }
    }
}

/// Logo do Atlas — marca em texto com o "360" em verde, como no app Android.
struct AtlasLogo: View {
    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Text("ATLAS")
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(Atlas.ink)
                Text("360")
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(Atlas.verde)
            }
            Text("AVERBADORA")
                .font(.system(size: 11, weight: .bold))
                .kerning(3)
                .foregroundStyle(Atlas.inkMuted)
        }
    }
}

/// Converte o markdown simples dos termos (`**negrito**`) em texto formatado —
/// espelha `MarkdownTexto.kt`. Sem isso os asteriscos apareciam literais.
func markdownParaTexto(_ md: String) -> AttributedString {
    var out = AttributedString()
    var resto = Substring(md)
    while let abre = resto.range(of: "**"),
          let fecha = resto[abre.upperBound...].range(of: "**") {
        out.append(AttributedString(String(resto[resto.startIndex..<abre.lowerBound])))
        var forte = AttributedString(String(resto[abre.upperBound..<fecha.lowerBound]))
        forte.inlinePresentationIntent = .stronglyEmphasized
        out.append(forte)
        resto = resto[fecha.upperBound...]
    }
    out.append(AttributedString(String(resto)))
    return out
}
