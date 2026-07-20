package io.atlas.servidor.core

import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Vigia de inatividade — segurança do servidor logado.
 *
 * Depois de [TIMEOUT_MS] (10 min) sem NENHUMA interação do usuário, marca a sessão como
 * expirada. A UI (AtlasNavHost) observa [expired], faz logout e volta pro login com o
 * aviso "Sua sessão expirou".
 *
 * O timer só corre enquanto [arm]ado (usuário numa área autenticada). Cada toque na tela
 * chama [touch] (via MainActivity.onUserInteraction) e adia o prazo. O timer também dispara
 * com o app em segundo plano — se o servidor voltar depois de 10 min parado, cai no login.
 */
object SessionWatcher {
    private const val TIMEOUT_MS = 10L * 60L * 1000L // 10 minutos

    private val handler = Handler(Looper.getMainLooper())
    private val expireRunnable = Runnable { if (armed) expired = true }
    private var armed = false

    /** Sessão expirou por inatividade? A UI observa e reage (logout + login). */
    var expired by mutableStateOf(false)
        private set

    /** Liga o vigia — chamar quando o usuário entra numa área logada. */
    fun arm() {
        armed = true
        expired = false
        reschedule()
    }

    /** Desliga o vigia — logout manual/expiração já tratados; não faz sentido continuar. */
    fun disarm() {
        armed = false
        handler.removeCallbacks(expireRunnable)
    }

    /** Registra interação do usuário — adia o timeout. No-op se não estiver armado. */
    fun touch() {
        if (armed) reschedule()
    }

    /** Consumido pela tela de login depois de exibir o aviso de expiração. */
    fun consumirExpiracao() {
        expired = false
    }

    private fun reschedule() {
        handler.removeCallbacks(expireRunnable)
        handler.postDelayed(expireRunnable, TIMEOUT_MS)
    }
}
