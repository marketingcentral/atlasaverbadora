package io.atlas.servidor.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val AtlasLightColors = lightColorScheme(
    primary = Verde,
    onPrimary = Superficie,
    primaryContainer = VerdeSoft,
    onPrimaryContainer = VerdeDark,
    secondary = Ambar,
    onSecondary = Superficie,
    secondaryContainer = AmbarSoft,
    onSecondaryContainer = Ink,
    background = Fundo,
    onBackground = Ink,
    surface = Superficie,
    onSurface = Ink,
    surfaceVariant = Fundo,
    onSurfaceVariant = InkMuted,
    outline = Divider,
    error = DangerRed,
    onError = Superficie,
)

@Composable
fun AtlasTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    // Single light scheme keeps the brand palette exact across devices.
    MaterialTheme(
        colorScheme = AtlasLightColors,
        typography = AtlasTypography,
        content = content,
    )
}
