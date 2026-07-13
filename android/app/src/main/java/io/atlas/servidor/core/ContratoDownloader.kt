package io.atlas.servidor.core

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import io.atlas.servidor.BuildConfig

/**
 * Baixa o CCB REAL que o banco anexou na aprovação — o mesmo arquivo da versão web
 * (GET /v1/servidores/me/contratos/:adf/ccb.pdf, servido do R2). Usa o DownloadManager
 * do Android: baixa pra pasta Downloads com notificação, como um download comum.
 *
 * O token de acesso vai no header (mesmo esquema da web, que usa o token atual). Se o
 * banco ainda não anexou, o servidor devolve 404 e o download aparece como falho.
 */
object ContratoDownloader {

    fun baixar(context: Context, adf: String) {
        val token = ServiceLocator.tokenStore.accessToken
        if (token.isNullOrBlank()) {
            Toast.makeText(context, "Sessão expirada. Entre novamente.", Toast.LENGTH_LONG).show()
            return
        }
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        val url = "$base/v1/servidores/me/contratos/$adf/ccb.pdf"
        try {
            val req = DownloadManager.Request(Uri.parse(url))
                .addRequestHeader("Authorization", "Bearer $token")
                .setTitle("Contrato $adf")
                .setDescription("Baixando contrato assinado…")
                .setMimeType("application/pdf")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "contrato-$adf.pdf")
            val dm = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(req)
            Toast.makeText(context, "Baixando contrato… veja na barra de notificações.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(context, "Não foi possível iniciar o download. Tente novamente.", Toast.LENGTH_LONG).show()
        }
    }
}
