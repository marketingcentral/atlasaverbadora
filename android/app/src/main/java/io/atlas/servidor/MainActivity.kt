package io.atlas.servidor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.SessionWatcher
import io.atlas.servidor.ui.navigation.AtlasNavHost
import io.atlas.servidor.ui.navigation.Routes
import io.atlas.servidor.ui.theme.AtlasTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val logado = ServiceLocator.tokenStore.isLoggedIn
        val start = if (logado) Routes.MAIN else Routes.LOGIN
        // Se já abre logado, liga o vigia de inatividade (10 min → logout automático).
        if (logado) SessionWatcher.arm()
        setContent {
            AtlasRoot(startDestination = start)
        }
    }

    /** Cada toque/tecla adia o timeout de inatividade da sessão. */
    override fun onUserInteraction() {
        super.onUserInteraction()
        SessionWatcher.touch()
    }
}

@Composable
private fun AtlasRoot(startDestination: String) {
    AtlasTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            AtlasNavHost(startDestination = startDestination)
        }
    }
}
