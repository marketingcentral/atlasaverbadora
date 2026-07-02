package io.atlas.servidor

import android.app.Application
import io.atlas.servidor.core.ServiceLocator

class AtlasApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }
}
