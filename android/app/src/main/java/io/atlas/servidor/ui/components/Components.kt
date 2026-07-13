package io.atlas.servidor.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.atlas.servidor.ui.theme.Ambar
import io.atlas.servidor.ui.theme.AmbarSoft
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde
import io.atlas.servidor.ui.theme.VerdeSoft

/** Envolve um onClick para ignorar toques repetidos por [windowMs] — evita que cliques
 *  rápidos (o usuário batendo várias vezes no botão) disparem a ação mais de uma vez e
 *  criem propostas/simulações duplicadas ou travem a UI. */
@Composable
fun rememberDebouncedClick(windowMs: Long = 800L, onClick: () -> Unit): () -> Unit {
    val last = androidx.compose.runtime.remember { androidx.compose.runtime.mutableLongStateOf(0L) }
    val current = androidx.compose.runtime.rememberUpdatedState(onClick)
    return {
        val now = System.currentTimeMillis()
        if (now - last.longValue >= windowMs) {
            last.longValue = now
            current.value()
        }
    }
}

@Composable
fun AtlasPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val onClickDebounced = rememberDebouncedClick(onClick = onClick)
    Button(
        onClick = onClickDebounced,
        enabled = enabled && !loading,
        modifier = modifier.fillMaxWidth().height(54.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Verde, contentColor = Superficie),
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(22.dp),
                color = Superficie,
                strokeWidth = 2.dp,
            )
        } else {
            Text(text, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun AtlasSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val onClickDebounced = rememberDebouncedClick(onClick = onClick)
    OutlinedButton(
        onClick = onClickDebounced,
        enabled = enabled,
        modifier = modifier.fillMaxWidth().height(54.dp),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.5.dp, Divider),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Ink),
    ) {
        Text(text, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun AtlasCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        color = Superficie,
        border = BorderStroke(1.dp, Divider),
    ) {
        Column(modifier = Modifier.padding(18.dp)) { content() }
    }
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        modifier = modifier,
        color = InkMuted,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.8.sp,
    )
}

enum class ChipTone { Verde, Ambar, Neutro }

@Composable
fun StatusChip(text: String, tone: ChipTone = ChipTone.Verde, modifier: Modifier = Modifier) {
    val (bg, fg) = when (tone) {
        ChipTone.Verde -> VerdeSoft to Verde
        ChipTone.Ambar -> AmbarSoft to Ambar
        ChipTone.Neutro -> Color(0xFFEDEDED) to InkMuted
    }
    Surface(shape = RoundedCornerShape(999.dp), color = bg, modifier = modifier) {
        Text(
            text = text,
            color = fg,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
        )
    }
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Verde)
    }
}

@Composable
fun ErrorBox(message: String, onRetry: (() -> Unit)?, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = message,
                color = InkMuted,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyLarge,
            )
            if (onRetry != null) {
                Spacer(Modifier.height(16.dp))
                AtlasSecondaryButton(text = "Tentar novamente", onClick = onRetry, modifier = Modifier.heightIn(min = 48.dp))
            }
        }
    }
}

@Composable
fun StaleBanner(note: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = AmbarSoft,
        shape = RoundedCornerShape(12.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start,
        ) {
            Text("•", color = Ambar, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.size(8.dp))
            Text(note, color = Ink, fontSize = 13.sp)
        }
    }
}

/** Simple key/value row used across cards. */
@Composable
fun InfoRow(label: String, value: String, valueColor: Color = Ink, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = InkMuted, fontSize = 14.sp)
        Text(value, color = valueColor, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun ContentPadding(): PaddingValues = PaddingValues(horizontal = 20.dp, vertical = 16.dp)
