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
}
