package io.atlas.servidor.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import io.atlas.servidor.data.remote.dto.AuthResponse

/**
 * Secure, persistent session storage. Tokens are held in EncryptedSharedPreferences
 * (AES256, backed by the Android Keystore). Falls back to plain prefs only if the
 * crypto provider fails to initialise, so login never hard-crashes the app.
 */
class TokenStore(context: Context) {

    private val prefs: SharedPreferences = runCatching {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "atlas_session_secure",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }.getOrElse {
        context.getSharedPreferences("atlas_session_fallback", Context.MODE_PRIVATE)
    }

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS, null)
        private set(v) = prefs.edit().putString(KEY_ACCESS, v).apply()

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        private set(v) = prefs.edit().putString(KEY_REFRESH, v).apply()

    val userName: String? get() = prefs.getString(KEY_NAME, null)
    val role: String? get() = prefs.getString(KEY_ROLE, null)
    val userId: Long get() = prefs.getLong(KEY_UID, -1L)

    val isLoggedIn: Boolean get() = !accessToken.isNullOrBlank()

    fun saveSession(auth: AuthResponse) {
        prefs.edit()
            .putString(KEY_ACCESS, auth.accessToken)
            .putString(KEY_REFRESH, auth.refreshToken)
            .putString(KEY_NAME, auth.user.nome)
            .putString(KEY_ROLE, auth.role)
            .putLong(KEY_UID, auth.user.id)
            .apply()
    }

    /** Rotate only the token pair (used by the refresh authenticator). */
    fun updateTokens(access: String, refresh: String) {
        prefs.edit().putString(KEY_ACCESS, access).putString(KEY_REFRESH, refresh).apply()
    }

    fun clear() = prefs.edit().clear().apply()

    private companion object {
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
        const val KEY_NAME = "user_name"
        const val KEY_ROLE = "user_role"
        const val KEY_UID = "user_id"
    }
}
