package io.atlas.servidor.ui.navigation

object Routes {
    const val LOGIN = "login"
    const val PRIMEIRO_ACESSO = "primeiro_acesso"
    const val ESQUECI_SENHA = "esqueci_senha"
    const val SELECIONAR_MATRICULA = "selecionar_matricula"
    const val MAIN = "main"
    const val SIMULAR = "simular"
    const val EM_ANALISE = "em_analise"
    const val MARGEM_TRAVADA = "margem_travada"
    const val PORTABILIDADE = "portabilidade"

    // Bottom-tab destinations (inner graph)
    const val TAB_INICIO = "tab_inicio"
    const val TAB_CONTRATOS = "tab_contratos"
    const val TAB_PORTABILIDADE = "tab_portabilidade"
    const val TAB_TELEMEDICINA = "tab_telemedicina"
    const val TAB_CONTA = "tab_conta"

    /** Simulador dentro do shell — recebe o produto (EMPRESTIMO / CARTAO_CONSIGNADO). */
    const val SIMULAR_PRODUTO = "simular/{produto}"
    const val ARG_PRODUTO = "produto"
    fun simular(produto: String): String = "simular/$produto"
}

/** Produtos consignados. A lógica de crédito é a mesma; muda só a margem usada. */
object Produtos {
    const val EMPRESTIMO = "EMPRESTIMO"
    const val CARTAO_CONSIGNADO = "CARTAO_CONSIGNADO"
    const val CARTAO_BENEFICIOS = "CARTAO_BENEFICIOS"
}
