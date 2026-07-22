import UIKit

/// Baixa o contrato (CCB) anexado pelo banco, preservando o **formato original**
/// do arquivo (xlsx/docx/pdf). Espelha `ContratoDownloader.kt`: a extensão sai do
/// nome real do anexo — converter tudo para .pdf corrompia planilhas e documentos.
enum ContratoDownloader {
    /// Mesma base do ApiClient.
    private static let baseURL = URL(string: "https://atlas-api.perfectdesigner.workers.dev/")!

    static func baixar(adf: String, anexoNome: String?) {
        Task { @MainActor in
            guard let (dados, resposta) = await buscar(adf: adf) else { return }
            let ext = extensao(de: anexoNome, resposta: resposta)
            let destino = FileManager.default.temporaryDirectory
                .appendingPathComponent("contrato-\(adf).\(ext)")
            guard (try? dados.write(to: destino, options: .atomic)) != nil else { return }
            apresentar(destino)
        }
    }

    /// Baixa COM o token no header `Authorization`.
    ///
    /// Antes isto abria a URL no Safari com `?token=...` e a tela vinha PRETA: a
    /// API responde **401 "Header Authorization ausente"** — ela não lê token de
    /// query. Além de não funcionar, token em URL vaza no histórico do navegador
    /// e em logs. Por isso baixamos dentro do app e só depois entregamos o arquivo
    /// ao visualizador do sistema. (O Android já fazia certo, via
    /// DownloadManager.addRequestHeader.)
    private static func buscar(adf: String) async -> (Data, HTTPURLResponse)? {
        guard let token = KeychainStore.shared.accessToken, !token.isEmpty else { return nil }
        var req = URLRequest(url: baseURL.appendingPathComponent("v1/servidores/me/contratos/\(adf)/ccb.pdf"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        guard let (dados, resp) = try? await URLSession.shared.data(for: req),
              let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return nil }
        return (dados, http)
    }

    /// Extensão real: prefere o nome do anexo; cai no `Content-Disposition`.
    private static func extensao(de nome: String?, resposta: HTTPURLResponse) -> String {
        let conhecidas = ["pdf", "docx", "xlsx", "xls"]
        if let nome = nome?.lowercased() {
            for e in conhecidas where nome.hasSuffix(".\(e)") { return e }
        }
        if let cd = resposta.value(forHTTPHeaderField: "Content-Disposition")?.lowercased() {
            for e in conhecidas where cd.contains(".\(e)") { return e }
        }
        return "pdf"
    }

    /// Entrega ao share sheet do sistema (abrir, salvar em Arquivos, etc).
    private static func apresentar(_ url: URL) {
        guard let cena = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let raiz = cena.windows.first(where: \.isKeyWindow)?.rootViewController else { return }
        let vc = UIActivityViewController(activityItems: [url], applicationActivities: nil)
        // iPad exige âncora para o popover.
        vc.popoverPresentationController?.sourceView = raiz.view
        vc.popoverPresentationController?.sourceRect = CGRect(
            x: raiz.view.bounds.midX, y: raiz.view.bounds.midY, width: 0, height: 0)
        var topo = raiz
        while let apresentado = topo.presentedViewController { topo = apresentado }
        topo.present(vc, animated: true)
    }
}
