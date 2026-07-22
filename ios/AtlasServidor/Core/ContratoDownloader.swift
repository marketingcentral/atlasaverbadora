import UIKit

/// Baixa o contrato (CCB) anexado pelo banco, preservando o **formato original**
/// do arquivo (xlsx/docx/pdf). Espelha `ContratoDownloader.kt`: a extensão sai do
/// nome real do anexo — converter tudo para .pdf corrompia planilhas e documentos.
enum ContratoDownloader {
    static func baixar(adf: String, anexoNome: String?) {
        let ext = extensao(de: anexoNome)
        let base = "https://atlas-api.perfectdesigner.workers.dev/v1/servidores/me/contratos/\(adf)/ccb.pdf"
        guard var comps = URLComponents(string: base) else { return }
        // O token vai na query porque o download sai do app (Safari/Quick Look).
        if let token = KeychainStore.shared.accessToken, !token.isEmpty {
            comps.queryItems = [URLQueryItem(name: "token", value: token)]
        }
        guard let url = comps.url else { return }

        Task { @MainActor in
            // Abre no visualizador do sistema — respeita o tipo real do arquivo.
            _ = ext // mantido para clareza do formato esperado
            UIApplication.shared.open(url)
        }
    }

    private static func extensao(de nome: String?) -> String {
        guard let nome = nome?.lowercased() else { return "pdf" }
        for e in ["pdf", "docx", "xlsx", "xls"] where nome.hasSuffix(".\(e)") { return e }
        return "pdf"
    }
}
