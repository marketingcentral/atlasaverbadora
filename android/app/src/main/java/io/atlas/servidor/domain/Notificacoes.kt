package io.atlas.servidor.domain

import io.atlas.servidor.data.remote.dto.PropostaDto

/** Uma notificação exibida no sino do app. Derivada do estado real das propostas
 *  (mesma lógica do web) — o `id` é estável por evento, então marcar como lida persiste
 *  e uma nova transição (ex.: análise → aprovada) gera uma notificação nova. */
data class AppNotif(
    val id: String,
    val titulo: String,
    val mensagem: String,
    val quando: String,
)

object Notificacoes {
    /** Deriva as notificações das propostas + a notificação de folha processada. */
    fun fromPropostas(propostas: List<PropostaDto>): List<AppNotif> {
        val derivadas = propostas.mapNotNull { p ->
            val banco = p.banco ?: "banco"
            val s = (p.situacao ?: "").lowercase()
            when {
                s.contains("aguard") -> AppNotif(
                    "proposta:${p.id}:analise",
                    "Proposta ${p.id} em análise",
                    "O $banco está avaliando sua solicitação. Você será avisado quando houver resposta.",
                    p.data ?: "",
                )
                s.contains("ativo") || s.contains("averb") || s.contains("vigente") -> {
                    if (p.folhaStatus?.lowercase() == "aplicada") {
                        AppNotif(
                            "proposta:${p.id}:completa",
                            "Empréstimo ${p.id} autorizado",
                            "Desconto confirmado em folha pela prefeitura. Tudo certo!",
                            p.data ?: "",
                        )
                    } else {
                        AppNotif(
                            "proposta:${p.id}:aprovada",
                            "Proposta ${p.id} aprovada",
                            "O $banco aprovou seu empréstimo. Aguardando a confirmação do desconto em folha.",
                            p.data ?: "",
                        )
                    }
                }
                s.contains("recus") -> AppNotif(
                    "proposta:${p.id}:recusada",
                    "Proposta ${p.id} recusada",
                    p.folhaMotivo ?: "O $banco recusou sua solicitação.",
                    p.data ?: "",
                )
                s.contains("cancel") -> AppNotif(
                    "proposta:${p.id}:cancelada",
                    "Proposta ${p.id} cancelada",
                    "Sua solicitação foi cancelada e a margem voltou a ficar disponível.",
                    p.data ?: "",
                )
                s.contains("expir") -> AppNotif(
                    "proposta:${p.id}:expirada",
                    "Proposta ${p.id} expirada",
                    "A reserva expirou sem resposta do banco.",
                    p.data ?: "",
                )
                else -> null
            }
        }
        // Mais recente no topo (a última proposta vem primeiro); a folha (mais antiga) por último.
        return derivadas.reversed() + AppNotif(
            "folha:junho-2026",
            "Folha de Junho/2026 processada",
            "Sua margem foi recalculada com base na nova folha da prefeitura.",
            "ontem",
        )
    }
}
