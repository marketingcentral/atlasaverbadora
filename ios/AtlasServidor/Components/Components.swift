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

/// Monograma "A" da marca com o swoosh — mesmos paths do `atlas_mark.xml` do
/// Android (viewport 120x104), redesenhados como `Path` para escalar sem asset.
struct AtlasMark: Shape {
    func path(in rect: CGRect) -> Path {
        // Escala o viewport original (120x104) para o frame recebido.
        let sx = rect.width / 120, sy = rect.height / 104
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * sx, y: rect.minY + y * sy)
        }
        var path = Path()
        // "A" com o entalhe inferior: M60,8 L99,98 L79,98 L60,54 L41,98 L21,98 Z
        path.move(to: p(60, 8))
        path.addLine(to: p(99, 98)); path.addLine(to: p(79, 98))
        path.addLine(to: p(60, 54)); path.addLine(to: p(41, 98))
        path.addLine(to: p(21, 98)); path.closeSubpath()
        // Swoosh: M27,84 C58,64 82,46 113,13 C108,24 92,47 67,65 C52,76 40,81 27,84 Z
        path.move(to: p(27, 84))
        path.addCurve(to: p(113, 13), control1: p(58, 64), control2: p(82, 46))
        path.addCurve(to: p(67, 65), control1: p(108, 24), control2: p(92, 47))
        path.addCurve(to: p(27, 84), control1: p(52, 76), control2: p(40, 81))
        path.closeSubpath()
        return path
    }
}

/// Logo do Atlas — réplica do `AtlasLogo.kt`: monograma com "360" no canto,
/// "ATLAS" espaçado e "AVERBADORA" entre duas linhas.
struct AtlasLogo: View {
    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .topTrailing) {
                AtlasMark()
                    .fill(Atlas.ink)
                    .frame(width: 96, height: 82)
                Text("360")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Atlas.ink)
                    .padding(.top, 4)
                    .offset(x: 14) // acompanha a inclinação do swoosh, como no Android
            }
            Text("ATLAS")
                .font(.system(size: 30, weight: .heavy))
                .kerning(10)
                .foregroundStyle(Atlas.ink)
            HStack(spacing: 0) {
                Rectangle().fill(Atlas.divider).frame(width: 20, height: 1.5)
                Text("AVERBADORA")
                    .font(.system(size: 12, weight: .medium))
                    .kerning(5)
                    .foregroundStyle(Atlas.ink)
                    .padding(.horizontal, 8)
                Rectangle().fill(Atlas.divider).frame(width: 20, height: 1.5)
            }
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
