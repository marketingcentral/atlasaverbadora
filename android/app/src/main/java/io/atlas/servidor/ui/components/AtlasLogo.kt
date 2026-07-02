package io.atlas.servidor.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.R
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Ink

/** Marca Atlas 360 Averbadora — símbolo (vetor) + wordmark. */
@Composable
fun AtlasLogo(modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box {
            Image(
                painter = painterResource(R.drawable.atlas_mark),
                contentDescription = "Atlas",
                modifier = Modifier.size(width = 96.dp, height = 82.dp),
            )
            Text(
                "360",
                color = Ink,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.align(Alignment.TopEnd).padding(top = 4.dp),
            )
        }
        Spacer(Modifier.height(6.dp))
        Text("ATLAS", color = Ink, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 10.sp)
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.width(20.dp).height(1.5.dp).background(Divider))
            Text(
                "AVERBADORA",
                color = Ink,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                letterSpacing = 5.sp,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
            Box(Modifier.width(20.dp).height(1.5.dp).background(Divider))
        }
    }
}
