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

/** Bucket de margem (para a trava) de uma proposta. Usa o `tipoMargem` do servidor
 *  quando presente — distingue cartão CONSIGNADO de BENEFÍCIO, que compartilham o
 *  tipoContrato ECONSIGNADO. Fallback pelo tipoContrato para propostas antigas. */
fun produtoDaProposta(tipoContrato: String?, tipoMargem: String? = null): String {
    if (!tipoMargem.isNullOrBlank()) return tipoMargem
    return if (tipoContrato?.equals("ECONSIGNADO", ignoreCase = true) == true) "CARTAO_CONSIGNADO" else "EMPRESTIMO"
}

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

    // ---- "Lembre-me" no login ----
    // Guarda só o CPF (identificador), NUNCA a senha — o CPF não é segredo e agiliza o
    // próximo acesso. A senha continua sendo digitada toda vez.
    var lembrarLogin: Boolean
        get() = prefs.getBoolean("lembrar_login", false)
        set(v) = prefs.edit().putBoolean("lembrar_login", v).apply()

    var cpfSalvo: String?
        get() = prefs.getString("cpf_salvo", null)
        set(v) = prefs.edit().putString("cpf_salvo", v).apply()

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

    // ---- Trava de simulação (48h por matrícula E POR PRODUTO) ----
    // A trava vale só para o MESMO produto: ter um empréstimo em análise não impede
    // solicitar um cartão de crédito consignado (cada um tem sua própria trava).

    /** Cria a trava de 48h para a matrícula+produto e retorna o timestamp de expiração (ms). */
    fun setSimLock(idMatricula: String, produto: String): Long {
        val expiry = System.currentTimeMillis() + LOCK_DURATION_MS
        prefs.edit().putLong(lockKey(idMatricula, produto), expiry).apply()
        return expiry
    }

    fun clearSimLock(idMatricula: String, produto: String) =
        prefs.edit().remove(lockKey(idMatricula, produto)).apply()

    /** Expiração da trava se ainda ativa (> agora); null se não há trava ou já expirou. */
    fun simLockExpiry(idMatricula: String, produto: String): Long? {
        val e = prefs.getLong(lockKey(idMatricula, produto), 0L)
        return if (e > System.currentTimeMillis()) e else null
    }

    private fun lockKey(idMatricula: String, produto: String) = "sim_lock:$idMatricula:$produto"

    private companion object {
        const val LOCK_DURATION_MS = 48L * 60L * 60L * 1000L
    }
}
