package io.atlas.servidor.core

import android.content.Context
import java.util.UUID

/**
 * A margem só fica bloqueada enquanto a proposta está EM ANÁLISE (situação "aguardando").
 * Assim que o banco aprova (Ativo/Averbado/Vigente) ou a proposta encerra
 * (recusada/expirada/cancelada), a reserva deixa de ser pendente e a margem é liberada —
 * sem precisar esperar as 48h. As 48h são só o teto enquanto continua em análise.
 */
fun isReservaPendente(situacao: String?): Boolean =
    situacao?.contains("aguard", ignoreCase = true) == true

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

    // ---- Notificações: estado lida/não-lida por ID (espelha o notifications.ts do web) ----
    fun readNotifIds(): Set<String> = prefs.getStringSet("notif_read", emptySet()) ?: emptySet()

    fun markNotifsRead(ids: Collection<String>) {
        val set = readNotifIds().toMutableSet()
        set.addAll(ids)
        prefs.edit().putStringSet("notif_read", set).apply()
    }

    /** Notificações "limpas" (dispensadas) — somem da lista até um novo evento gerar novo ID. */
    fun dismissedNotifIds(): Set<String> = prefs.getStringSet("notif_dismissed", emptySet()) ?: emptySet()

    fun dismissNotifs(ids: Collection<String>) {
        val set = dismissedNotifIds().toMutableSet()
        set.addAll(ids)
        prefs.edit().putStringSet("notif_dismissed", set).apply()
    }

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
