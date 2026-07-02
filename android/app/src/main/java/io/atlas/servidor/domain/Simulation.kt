package io.atlas.servidor.domain

import kotlin.math.pow

/**
 * Consigned-loan simulation using the Price (French amortization) table — the same
 * PMT formula the Atlas domain package uses server-side.
 */
object Simulation {

    /** Monthly installment for a loan of [valor] over [parcelas] months at monthly rate [taxaAm]. */
    fun parcela(valor: Double, parcelas: Int, taxaAm: Double): Double {
        if (parcelas <= 0) return 0.0
        if (taxaAm <= 0.0) return valor / parcelas
        val factor = (1 + taxaAm).pow(-parcelas)
        return valor * taxaAm / (1 - factor)
    }

    /** Largest loan whose installment fits within [margemDisponivel]. */
    fun valorMaximo(margemDisponivel: Double, parcelas: Int, taxaAm: Double): Double {
        if (parcelas <= 0 || margemDisponivel <= 0) return 0.0
        if (taxaAm <= 0.0) return margemDisponivel * parcelas
        val factor = (1 + taxaAm).pow(-parcelas)
        return margemDisponivel * (1 - factor) / taxaAm
    }

    data class Result(
        val valor: Double,
        val parcelas: Int,
        val taxaAm: Double,
        val parcelaMensal: Double,
        val totalPago: Double,
        val cabeNaMargem: Boolean,
    )

    fun simular(valor: Double, parcelas: Int, taxaAm: Double, margemDisponivel: Double): Result {
        val p = parcela(valor, parcelas, taxaAm)
        return Result(
            valor = valor,
            parcelas = parcelas,
            taxaAm = taxaAm,
            parcelaMensal = p,
            totalPago = p * parcelas,
            cabeNaMargem = p <= margemDisponivel + 0.005,
        )
    }
}
