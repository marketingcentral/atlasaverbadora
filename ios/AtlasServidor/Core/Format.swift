import Foundation

/// Formatação PT-BR — espelha `domain/Format.kt` do app Android.
enum Format {
    private static let ptBR = Locale(identifier: "pt_BR")

    private static let currency: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = ptBR
        return f
    }()

    private static let currencyShort: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = ptBR
        f.maximumFractionDigits = 0
        return f
    }()

    /// 8000.0 -> "R$ 8.000,00"
    static func money(_ value: Double) -> String {
        currency.string(from: NSNumber(value: value)) ?? "R$ 0,00"
    }

    /// 8000.0 -> "R$ 8.000" (sem centavos)
    static func moneyShort(_ value: Double) -> String {
        currencyShort.string(from: NSNumber(value: value)) ?? "R$ 0"
    }

    /// 0.0179 -> "1,79% a.m."  (a API manda a taxa em fração)
    static func rateAm(_ taxaAm: Double) -> String {
        let f = NumberFormatter()
        f.locale = ptBR
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        let s = f.string(from: NSNumber(value: taxaAm * 100)) ?? "0,00"
        return "\(s)% a.m."
    }

    /// 1.79 -> "1,79%"  (valor JÁ em percentual, como vem em PropostaDto.taxaAm)
    static func percentValue(_ pct: Double) -> String {
        let f = NumberFormatter()
        f.locale = ptBR
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return "\(f.string(from: NSNumber(value: pct)) ?? "0,00")%"
    }

    /// 0.30 -> "30%"
    static func percent(_ fraction: Double) -> String {
        let f = NumberFormatter()
        f.locale = ptBR
        f.maximumFractionDigits = 0
        return "\(f.string(from: NSNumber(value: fraction * 100)) ?? "0")%"
    }

    /// Máscara de CPF progressiva: 000.000.000-00
    static func cpf(_ raw: String) -> String {
        let d = String(raw.filter(\.isNumber).prefix(11))
        var out = ""
        for (i, ch) in d.enumerated() {
            if i == 3 || i == 6 { out.append(".") }
            if i == 9 { out.append("-") }
            out.append(ch)
        }
        return out
    }

    /// Máscara de telefone BR: (XX) XXXXX-XXXX (11) ou (XX) XXXX-XXXX (10)
    static func phone(_ raw: String) -> String {
        let d = String(raw.filter(\.isNumber).prefix(11))
        guard !d.isEmpty else { return "" }
        let a = Array(d)
        if d.count <= 2 { return "(\(d)" }
        let ddd = String(a[0..<2])
        let rest = String(a[2...])
        let dash = d.count >= 11 ? 5 : 4
        if rest.count <= dash { return "(\(ddd)) \(rest)" }
        let r = Array(rest)
        return "(\(ddd)) \(String(r[0..<dash]))-\(String(r[dash...]))"
    }

    /// "2026-07-22" / ISO -> "22/07/2026". Devolve a entrada se não reconhecer.
    static func dateBR(_ iso: String?) -> String {
        guard let iso, !iso.isEmpty else { return "—" }
        let base = String(iso.prefix(10))
        let parts = base.split(separator: "-")
        guard parts.count == 3 else { return iso }
        return "\(parts[2])/\(parts[1])/\(parts[0])"
    }
}
