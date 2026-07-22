import SwiftUI

/// Design tokens do Atlas — espelham `ui/theme/Color.kt` do app Android
/// para que as duas plataformas fiquem visualmente idênticas.
enum Atlas {
    static let ink = Color(hex: 0x16181C)
    static let verde = Color(hex: 0x12936A)
    static let verdeDark = Color(hex: 0x0E7856)
    static let ambar = Color(hex: 0xC98A12)
    static let superficie = Color(hex: 0xFFFFFF)
    static let fundo = Color(hex: 0xF6F5F2)
    static let inkMuted = Color(hex: 0x6B7078)
    static let divider = Color(hex: 0xE7E5E0)
    static let verdeSoft = Color(hex: 0xE4F3EC)
    static let ambarSoft = Color(hex: 0xF7EAD1)
    static let dangerRed = Color(hex: 0xC0392B)
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

/// O app Android usa um único esquema claro para manter a paleta da marca exata
/// em qualquer aparelho. Fazemos o mesmo aqui travando o color scheme.
extension View {
    func atlasTheme() -> some View {
        self
            .preferredColorScheme(.light)
            .tint(Atlas.verde)
    }
}
