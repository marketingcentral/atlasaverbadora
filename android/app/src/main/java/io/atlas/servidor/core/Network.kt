package io.atlas.servidor.core

import com.google.gson.Gson
import io.atlas.servidor.data.remote.dto.ApiErrorBody
import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException

/** Domain-level exception carrying a message safe to show the user (PT-BR). */
class ApiException(
    val userMessage: String,
    val httpCode: Int? = null,
) : Exception(userMessage)

/**
 * Runs a network call, translating every failure into an [ApiException] with a
 * friendly Portuguese message. Prefers the server's error envelope when present.
 */
suspend fun <T> safeApi(gson: Gson, block: suspend () -> T): T {
    try {
        return block()
    } catch (e: ApiException) {
        throw e
    } catch (e: HttpException) {
        throw ApiException(extractMessage(gson, e) ?: httpMessage(e.code()), e.code())
    } catch (e: SocketTimeoutException) {
        throw ApiException("Tempo de conexão esgotado. Tente novamente.")
    } catch (e: IOException) {
        throw ApiException("Sem conexão. Verifique sua internet e tente novamente.")
    } catch (e: Exception) {
        throw ApiException("Ocorreu um erro inesperado. Tente novamente.")
    }
}

private fun extractMessage(gson: Gson, e: HttpException): String? {
    return try {
        val raw = e.response()?.errorBody()?.string() ?: return null
        gson.fromJson(raw, ApiErrorBody::class.java)?.error?.message
    } catch (t: Exception) {
        null
    }
}

private fun httpMessage(code: Int): String = when (code) {
    401 -> "Sessão expirada. Entre novamente."
    403 -> "Você não tem acesso a este recurso."
    404 -> "Não encontramos o que você procura."
    422 -> "Não foi possível processar a solicitação."
    429 -> "Muitas tentativas. Aguarde um instante."
    in 500..599 -> "O servidor está indisponível no momento."
    else -> "Falha na comunicação (HTTP $code)."
}
