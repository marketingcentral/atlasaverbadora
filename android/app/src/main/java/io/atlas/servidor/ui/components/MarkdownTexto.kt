package io.atlas.servidor.ui.components

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle

/**
 * Converte o markdown simples dos Termos de aceite (editados pela averbadora) em texto
 * formatado: `**assim**` vira **negrito** de verdade.
 *
 * Antes o corpo do termo era jogado cru num Text() e os asteriscos apareciam literais
 * na tela ("Colocar Texto de **Política de Privacidade**").
 *
 * Só trata negrito — é o único marcador usado nos termos hoje. Asteriscos soltos
 * (sem par de fechamento) ficam como estão, pra nunca comer texto do termo.
 */
fun markdownParaTexto(md: String): AnnotatedString = buildAnnotatedString {
    val re = Regex("""\*\*(.+?)\*\*""", RegexOption.DOT_MATCHES_ALL)
    var i = 0
    for (m in re.findAll(md)) {
        append(md.substring(i, m.range.first))
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(m.groupValues[1]) }
        i = m.range.last + 1
    }
    if (i < md.length) append(md.substring(i))
}
