package io.atlas.servidor.core

import android.content.Context
import java.util.UUID

/** Non-secret device/app preferences (stable device id, last selected matrícula). */
class AppPrefs(context: Context) {
    private val prefs = context.getSharedPreferences("atlas_prefs", Context.MODE_PRIVATE)

    val deviceId: String
        get() {
            val existing = prefs.getString("device_id", null)
            if (existing != null) return existing
            val generated = UUID.randomUUID().toString()
            prefs.edit().putString("device_id", generated).apply()
            return generated
        }

    var selectedMatricula: String?
        get() = prefs.getString("selected_matricula", null)
        set(value) = prefs.edit().putString("selected_matricula", value).apply()

    fun clearSelection() = prefs.edit().remove("selected_matricula").apply()

    // ---- Trava de simulação (48h por idMatricula) — espelha o simulation-lock.ts do web ----

    /** Cria a trava de 48h para a matrícula e retorna o timestamp de expiração (ms). */
    fun setSimLock(idMatricula: String): Long {
        val expiry = System.currentTimeMillis() + LOCK_DURATION_MS
        prefs.edit().putLong(lockKey(idMatricula), expiry).apply()
        return expiry
    }

    fun clearSimLock(idMatricula: String) = prefs.edit().remove(lockKey(idMatricula)).apply()

    /** Expiração da trava se ainda ativa (> agora); null se não há trava ou já expirou. */
    fun simLockExpiry(idMatricula: String): Long? {
        val e = prefs.getLong(lockKey(idMatricula), 0L)
        return if (e > System.currentTimeMillis()) e else null
    }

    private fun lockKey(idMatricula: String) = "sim_lock:$idMatricula"

    private companion object {
        const val LOCK_DURATION_MS = 48L * 60L * 60L * 1000L
    }
}
