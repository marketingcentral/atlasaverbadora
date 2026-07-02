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
import io.atlas.servidor.ui.navigation.AtlasNavHost
import io.atlas.servidor.ui.navigation.Routes
import io.atlas.servidor.ui.theme.AtlasTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val start = if (ServiceLocator.tokenStore.isLoggedIn) Routes.MAIN else Routes.LOGIN
        setContent {
            AtlasRoot(startDestination = start)
        }
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
