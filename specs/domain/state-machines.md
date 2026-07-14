# Atlas — Maquinas de Estado

Fonte unica para transicoes de entidades. Codigo deve implementar via `packages/domain` e expor via MCP `atlas-domain` (`domain://state-machine/{entity}`).

## Proposta

```mermaid
stateDiagram-v2
    [*] --> simulada: simular()
    simulada --> criada: aceitar_simulacao()
    criada --> em_analise: enviada_banco()
    em_analise --> aprovada: banco.callback("aprovada")
    em_analise --> rejeitada: banco.callback("rejeitada")
    aprovada --> contratada: confirmar(adf)
    aprovada --> cancelada: cancelar()
    contratada --> averbada: prefeitura.callback("averbada")
    contratada --> cancelada: cancelar_pre_averbacao()
    averbada --> ativa: primeira_parcela_descontada()
    ativa --> quitada: pagar_saldo() | parcelas_pagas == parcelas_total
    rejeitada --> [*]
    cancelada --> [*]
    quitada --> [*]
```

Eventos que disparam transicoes:
| Evento | De | Para |
|---|---|---|
| `simular` | * | `simulada` |
| `aceitar_simulacao` | `simulada` | `criada` |
| `enviar_banco` | `criada` | `em_analise` |
| `banco_aprova` | `em_analise` | `aprovada` |
| `banco_rejeita` | `em_analise` | `rejeitada` |
| `confirmar` | `aprovada` | `contratada` |
| `prefeitura_averba` | `contratada` | `averbada` |
| `primeira_parcela` | `averbada` | `ativa` |
| `quitar` | `ativa` | `quitada` |
| `cancelar` | `aprovada`, `contratada` (pre-averbacao) | `cancelada` |

## Contrato

```mermaid
stateDiagram-v2
    [*] --> pendente: criado()
    pendente --> averbado: averbacao_confirmada()
    averbado --> em_dia: primeira_parcela_paga()
    em_dia --> inadimplente: parcela_nao_paga(7d)
    inadimplente --> em_dia: regularizado()
    em_dia --> quitado: todas_parcelas_pagas() | quitacao_antecipada()
    em_dia --> cancelado: cancelar()
    inadimplente --> cancelado: cancelar()
    quitado --> [*]
    cancelado --> [*]
```

## Portabilidade

```mermaid
stateDiagram-v2
    [*] --> solicitada: iniciar()
    solicitada --> analise_origem: enviar_banco_origem()
    analise_origem --> analise_destino: saldo_recebido()
    analise_destino --> aprovada: banco_destino.aprovou()
    analise_destino --> falhada: banco_destino.rejeitou() | timeout()
    aprovada --> executada: liquidacao_origem()
    executada --> concluida: averbacao_destino()
    falhada --> [*]
    concluida --> [*]
```

Regulamentacao: BACEN Resolucao 4.292/2013. Banco origem tem **5 dias uteis** para enviar saldo devedor; banco destino tem **5 dias uteis** para decisao apos receber saldo.

## Reserva de emprestimo (banco)

```mermaid
stateDiagram-v2
    [*] --> ativa: reservada()
    ativa --> confirmada: confirmar(adf)
    ativa --> expirada: timeout(24-72h)
    confirmada --> [*]
    expirada --> [*]
```

## Validacao de transicao

A funcao canonica:

```ts
domain_next_state(entity: 'proposta'|'contrato'|'portabilidade'|'reserva', current: string, event: string): string | { error: 'invalid_transition' }
```

Implementacao em `packages/domain/src/state-machines/` e exposta pelo MCP `atlas-domain` tool `domain_next_state`.

## Auditoria

Toda transicao gera linha append-only em `<entity>_eventos`:
```
id, <entity>_id, evento, de_estado, para_estado, ator (user_id|system|banco|prefeitura), payload_hash, trace_id, criado_em
```
Nunca atualizamos ou removemos eventos.
