package io.atlas.servidor.data.remote

import io.atlas.servidor.data.local.TokenStore
import io.atlas.servidor.data.remote.dto.AuthResponse
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/** Attaches the bearer access token to every authenticated request. */
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = tokenStore.accessToken
        val request = if (!token.isNullOrBlank() && original.header("Authorization") == null) {
            original.newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            original
        }
        return chain.proceed(request)
    }
}

/**
 * On a 401, transparently rotates the refresh token and retries the original request
 * once. If refresh fails, the session is cleared and the 401 propagates so the UI can
 * bounce to login.
 */
class TokenAuthenticator(
    private val tokenStore: TokenStore,
    private val refresh: (String) -> AuthResponse?,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null // already retried once

        synchronized(this) {
            val tokenAtFailure = response.request.header("Authorization")?.removePrefix("Bearer ")
            val current = tokenStore.accessToken

            // Another thread may have refreshed while we were queued — reuse the fresh token.
            if (!current.isNullOrBlank() && current != tokenAtFailure) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $current").build()
            }

            val rt = tokenStore.refreshToken ?: return null
            val refreshed = try { refresh(rt) } catch (e: Exception) { null }
            if (refreshed == null) {
                tokenStore.clear()
                return null
            }
            tokenStore.updateTokens(refreshed.accessToken, refreshed.refreshToken)
            return response.request.newBuilder()
                .header("Authorization", "Bearer ${refreshed.accessToken}").build()
        }
    }

    private fun responseCount(response: Response): Int {
        var r: Response? = response.priorResponse
        var count = 1
        while (r != null) { count++; r = r.priorResponse }
        return count
    }
}
