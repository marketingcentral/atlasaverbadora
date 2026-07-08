package io.atlas.servidor.ui.util

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation

/**
 * Formats a raw digit string (max 11) as a Brazilian CPF: `000.000.000-00`.
 * The underlying state must stay digits-only; this only affects display + cursor.
 */
class CpfVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val digits = text.text.filter { it.isDigit() }.take(11)
        val sb = StringBuilder()
        for (i in digits.indices) {
            sb.append(digits[i])
            when (i) {
                2, 5 -> sb.append('.')
                8 -> sb.append('-')
            }
        }
        val formatted = sb.toString()

        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                // dots after positions 3 and 6, dash after 9
                var extra = 0
                if (offset > 3) extra++
                if (offset > 6) extra++
                if (offset > 9) extra++
                return (offset + extra).coerceAtMost(formatted.length)
            }

            override fun transformedToOriginal(offset: Int): Int {
                val nonDigits = formatted.take(offset).count { !it.isDigit() }
                return (offset - nonDigits).coerceIn(0, digits.length)
            }
        }
        return TransformedText(AnnotatedString(formatted), offsetMapping)
    }
}

/**
 * Formats a raw digit string (max 11) as a Brazilian phone: `(11) 99999-9999` (11 digits,
 * mobile) or `(11) 9999-9999` (10 digits, landline). State stays digits-only.
 */
class PhoneVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val digits = text.text.filter { it.isDigit() }.take(11)
        val dashAfterIdx = if (digits.length >= 11) 6 else 5 // traço após o 7º (cel) ou 6º (fixo) dígito
        val sb = StringBuilder()
        for (i in digits.indices) {
            if (i == 0) sb.append('(')
            sb.append(digits[i])
            if (i == 1) sb.append(") ")
            if (i == dashAfterIdx && i < digits.length - 1) sb.append('-')
        }
        val formatted = sb.toString()

        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                if (offset <= 0) return 0
                var count = 0
                for (i in formatted.indices) {
                    if (formatted[i].isDigit()) {
                        count++
                        if (count == offset) return i + 1
                    }
                }
                return formatted.length
            }

            override fun transformedToOriginal(offset: Int): Int {
                val clamped = offset.coerceIn(0, formatted.length)
                return formatted.take(clamped).count { it.isDigit() }.coerceIn(0, digits.length)
            }
        }
        return TransformedText(AnnotatedString(formatted), offsetMapping)
    }
}

/** CPF digits formatted for static display: `375.342.398-00`. */
fun formatCpf(digits: String): String {
    val d = digits.filter { it.isDigit() }.take(11)
    val sb = StringBuilder()
    for (i in d.indices) {
        sb.append(d[i])
        when (i) {
            2, 5 -> sb.append('.')
            8 -> sb.append('-')
        }
    }
    return sb.toString()
}
