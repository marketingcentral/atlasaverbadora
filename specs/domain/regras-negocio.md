# Atlas — Regras de Negocio

Regras explicitas e formulas. Implementacao em `packages/domain` e MCP `atlas-domain`.

## CET (Custo Efetivo Total)

CET e a taxa interna de retorno (IRR) que iguala o valor presente das parcelas ao valor liquido liberado.

**Equacao** (a resolver para `i`):
```
VL = sum(k=1 to n) [ P / (1 + i)^k ]
```
Onde:
- `VL` = valor liquido liberado (apos IOF + tarifas)
- `P` = valor da parcela
- `n` = quantidade de parcelas
- `i` = CET mensal (incognita)

**Algoritmo:** Newton-Raphson com palpite inicial `i0 = taxa_nominal * 1.1`. Tolerancia `1e-7`. Maximo 100 iteracoes.

**Implementacao:** `packages/domain/src/cet.ts` -> `calcCET({ valor, parcelas, taxaMensal, iof, tarifas })` retorna `{ mensal, anual }`.

**Validacao:** `calcCET({ valor: 8500, parcelas: 36, taxaMensal: 0.0159, iof: 0.0096 })` ≈ `{ mensal: 0.0179, anual: 0.2376 }`.

## Margem consignavel

### Limites legais (servidor publico federal/estadual/municipal)
- Emprestimo: 35% do salario liquido
- Cartao consignado: 5% do salario liquido
- Cartao beneficios: 5% do salario liquido
- Total combinado: 45% do salario liquido

### Calculo
```
margemDisponivel = (salarioLiquido * limitePercentual) - somaParcelasAtivasDoTipo
```

Se `margemDisponivel < 0`, exibir 0 e marcar `bloqueado: true`.

### Prazos e valores por operacao
| Operacao | Prazo min | Prazo max | Valor min | Idade limite |
|---|---|---|---|---|
| Novo emprestimo | 12 meses | 96 meses | R$ 500 | 79 anos no fim |
| Refinanciamento | 12 meses | 96 meses | — | 79 anos no fim |
| Portabilidade | restante origem | 96 meses | — | 79 anos no fim |
| Cartao consignado | revolvente | — | — | — |

### Idade do servidor
- Idade max no termino do contrato: **79 anos**. Calcular: `dataNascimento + (parcelas + 1) meses <= 80 anos`.

## Taxas

- Taxa nominal e expressa **mensal (a.m.)** por padrao.
- Conversao: `taxaAnual = (1 + taxaMensal)^12 - 1`.
- Exibicao na UI: 2 casas decimais com `%` (ex: `1,79% a.m.`).
- BACEN define Taxa Maxima Mensal (TJM) por categoria de servidor publico. Sistema deve rejeitar simulacao com taxa > TJM vigente. Tabela mantida em `bacen_tjm` (atualizada manualmente).

## IOF (Imposto sobre Operacoes Financeiras)

Para operacoes de credito pessoa fisica:
- Aliquota fixa: 0,38%
- Aliquota diaria: 0,0082% (ate 365 dias)

Calculo simplificado:
```
iof = valor * 0.0038 + valor * 0.000082 * min(prazoDias, 365)
```

## Tarifas

Em consignado publico:
- TAC (Tarifa de Abertura de Credito) — **proibida** pela CMN para consignado publico
- Tarifa de avaliacao — proibida
- Seguro prestamista — opcional, deve constar separado na simulacao

## Rejeicoes automaticas (servidor)

Bloquear simulacao quando:
- Situacao funcional ∉ `{ATIVO, LICENCA_REMUNERADA}`
- `permiteSolicitarEmprestimo == false` na matricula
- Idade > 79 anos no fim do prazo
- Margem disponivel < parcela calculada
- Salario liquido < R$ 1.200 (pratica de mercado)
- Vinculo `COMISSIONADO` sem estabilidade

## Eligibilidade banco x servidor

```
bancoElegivel(banco, servidor) =
  banco.prefeiturasAceitas.contains(servidor.prefeituraId)
  AND banco.vinculosAceitos.contains(servidor.vinculo)
  AND servidor.salarioLiquido >= banco.salarioMinimo
  AND servidor.idade in [banco.idadeMin, banco.idadeMax]
  AND servidor.situacaoFuncional in banco.situacoesAceitas
```

## Ranking de ofertas (simulacao)

Ordenar por **CET crescente**. Em empate (delta CET < 0,01% a.m.):
1. Menor prazo de liberacao
2. Banco com maior score (uptime + aprovacao historica)
3. Banco com menor TAC efetiva

## Idempotencia

- Toda chamada POST a banco com `Idempotency-Key: uuid-v4`
- Chave persistida em KV TTL 24h + linha em `proposta_eventos`
- Retry usa MESMA chave

## Retencao de dados (LGPD)

| Dado | Retencao quente | Frio (R2/cold) |
|---|---|---|
| Sessoes/JWT | 30 dias | — |
| Logs operacionais | 30 dias | 12 meses (R2) |
| Audit log de propostas | 5 anos (BACEN) | indefinido |
| PII de servidor inativo > 5 anos | apagado | retencao anonimizada para stats |

## SLA tecnico

- API p50 < 180ms, p95 < 500ms, p99 < 1500ms
- Disponibilidade 99,9% mensal
- Fanout simulacao: budget total 1500ms, timeout por banco 1200ms
- Webhook outbound: ate 3 retries com backoff exponencial
