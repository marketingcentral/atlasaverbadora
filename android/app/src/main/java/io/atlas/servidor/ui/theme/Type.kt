package io.atlas.servidor.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// The mockup specifies Manrope. We use the system sans family with matching weights
// so the app builds without bundling a font binary; swap FontFamily here to plug Manrope.
private val Sans = FontFamily.SansSerif

val AtlasTypography = Typography(
    displayLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.ExtraBold, fontSize = 32.sp, lineHeight = 38.sp),
    headlineSmall = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 28.sp),
    titleLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
    bodyLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Medium, fontSize = 15.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontFamily = Sans, fontWeight = FontWeight.Bold, fontSize = 12.sp, lineHeight = 16.sp),
)
