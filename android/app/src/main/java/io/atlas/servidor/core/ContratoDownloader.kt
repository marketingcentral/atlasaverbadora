package io.atlas.servidor.core

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import io.atlas.servidor.BuildConfig

/**
 * Baixa o contrato REAL anexado (o mesmo arquivo da versão web), servido do R2 por
 * GET /v1/servidores/me/contratos/:adf/ccb.pdf.
 *
 * O arquivo é salvo NO FORMATO ORIGINAL — xlsx continua .xlsx, docx continua .docx.
 * Antes o download era forçado pra "contrato-<adf>.pdf" com mimeType application/pdf:
 * o DownloadManager renomeava o arquivo e o Excel/Word não conseguia abrir. A extensão
 * agora sai do nome real do anexo (`anexoNome`, que a API devolve junto do contrato).
 */
object ContratoDownloader {

    /** MIME a partir da extensão real — o DownloadManager usa pra abrir com o app certo. */
    private fun mimeDe(ext: String): String = when (ext) {
        "pdf" -> "application/pdf"
        "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        "xls" -> "application/vnd.ms-excel"
        else -> "application/octet-stream"
    }

    /**
     * @param anexoNome nome real do arquivo anexado (ex.: "relatorio.xlsx"). Sem ele,
     *   cai em .pdf — caso legado de contrato cujo anexo não foi identificado.
     */
    fun baixar(context: Context, adf: String, anexoNome: String? = null) {
        val token = ServiceLocator.tokenStore.accessToken
        if (token.isNullOrBlank()) {
            Toast.makeText(context, "Sessão expirada. Entre novamente.", Toast.LENGTH_LONG).show()
            return
        }
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        val url = "$base/v1/servidores/me/contratos/$adf/ccb.pdf"
        val ext = Regex("""\.(pdf|docx|xlsx|xls)$""", RegexOption.IGNORE_CASE)
            .find(anexoNome ?: "")?.groupValues?.get(1)?.lowercase() ?: "pdf"
        try {
            val req = DownloadManager.Request(Uri.parse(url))
                .addRequestHeader("Authorization", "Bearer $token")
                .setTitle("Contrato $adf")
                .setDescription("Baixando contrato assinado…")
                .setMimeType(mimeDe(ext))
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "contrato-$adf.$ext")
            val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(req)
            Toast.makeText(context, "Baixando contrato… veja na barra de notificações.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(context, "Não foi possível iniciar o download. Tente novamente.", Toast.LENGTH_LONG).show()
        }
    }
}
