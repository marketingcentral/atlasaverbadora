package io.atlas.servidor.domain

import java.text.NumberFormat
import java.util.Locale

private val ptBR = Locale("pt", "BR")

object Format {
    private val currency: NumberFormat = NumberFormat.getCurrencyInstance(ptBR)

    /** 8000.0 -> "R$ 8.000,00" */
    fun money(value: Double): String = currency.format(value)

    /** 8000.0 -> "R$ 8.000" (no cents), for compact card headers */
    fun moneyShort(value: Double): String {
        val nf = NumberFormat.getCurrencyInstance(ptBR)
        nf.maximumFractionDigits = 0
        return nf.format(value)
    }

    /** 0.0179 -> "1,79% a.m." */
    fun rateAm(taxaAm: Double): String {
        val pct = NumberFormat.getNumberInstance(ptBR)
        pct.minimumFractionDigits = 2
        pct.maximumFractionDigits = 2
        return "${pct.format(taxaAm * 100)}% a.m."
    }

    /** 0.30 -> "30%" */
    fun percent(fraction: Double): String {
        val nf = NumberFormat.getNumberInstance(ptBR)
        nf.maximumFractionDigits = 0
        return "${nf.format(fraction * 100)}%"
    }

    /** 0.0957 -> "9,6%" (one decimal) */
    fun percent1(fraction: Double): String {
        val nf = NumberFormat.getNumberInstance(ptBR)
        nf.minimumFractionDigits = 1
        nf.maximumFractionDigits = 1
        return "${nf.format(fraction * 100)}%"
    }

    /** Telefone BR: "48991073451" -> "(48) 99107-3451". Retorna o original se não bater. */
    fun phone(raw: String): String {
        val d = raw.filter { it.isDigit() }
        return when {
            d.length >= 11 -> "(${d.substring(0, 2)}) ${d.substring(2, 7)}-${d.substring(7, 11)}"
            d.length == 10 -> "(${d.substring(0, 2)}) ${d.substring(2, 6)}-${d.substring(6, 10)}"
            else -> raw
        }
    }

    /** Masks an 11-digit CPF -> "047.***.***-04". Accepts already-masked input untouched. */
    fun maskCpf(cpf: String): String {
        val digits = cpf.filter { it.isDigit() }
        if (digits.length != 11) return cpf
        return "${digits.substring(0, 3)}.***.***-${digits.substring(9)}"
    }
}
