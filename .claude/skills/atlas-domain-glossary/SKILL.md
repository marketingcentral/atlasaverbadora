---
name: atlas-domain-glossary
description: Use whenever the task mentions consigned credit, averbação, margem, simulation, proposal, contract, portability, refinancing, payoff, or any servidor/banco/prefeitura business term. Ensures correct vocabulary and prevents conceptual mistakes between matrícula vs servidor, averbação vs reserva, etc.
---

# Atlas — Domain Glossary

## Personas
- **Servidor (público / municipal)** — Public servant employed by a city hall (prefeitura). Identified by CPF + matrícula. Has discountable salary margin.
- **Prefeitura (city hall)** — Employer of the servidor. Operates a folha de pagamento (payroll) where loan installments are deducted at source. Has a `convênio` with the averbadora and/or bank.
- **Banco parceiro** — Financial institution offering consignado loans. Pays commission to the averbadora.
- **Averbadora** — The platform (Atlas). Sits between servidor, prefeitura and banco. Centralizes margem queries, simulations, proposal routing, and averbação (the act of registering the loan deduction in the prefeitura's payroll).

## Operations
- **Simulação** — A non-binding calculation: given valor + parcelas, query bancos for rates and return offers ordered by CET. Read-only.
- **Proposta** — A formal offer from a banco to a servidor, generated from an accepted simulação. Has a state machine.
- **Reserva** — A pre-contract slot held by the banco for a short window (typically 24-72h). Confirmed → becomes contract; not confirmed → expires.
- **Contrato (novo empréstimo)** — The actual loan agreement, ready to be averbado.
- **Averbação** — The act of registering the contract's installment deduction in the prefeitura's payroll system. Without it, the banco won't release the money.
- **Refinanciamento (refin)** — Extending or restructuring an existing contract — usually adding capital and resetting the term.
- **Portabilidade** — Transferring an existing contract from banco A to banco B (cheaper). Regulated by BACEN.
- **Quitação** — Early payoff of a contract.
- **Liberação** — Money credited to the servidor's bank account after averbação confirms.

## Margem (margin)
Maximum % of salário líquido (net salary) that can be committed to consignado per regulation:
- **Margem consignável (empréstimo):** 35% — for traditional loan installments
- **Margem cartão consignado:** 5% — for consigned credit card minimum payments
- **Margem cartão benefícios:** 5% — for benefits card

Total max = **45%** of salário líquido (regulated). Not all servidores are eligible to all three.

Fields you'll see from bank APIs:
- `valorMargemDisponivel` — what's still free for new operations
- `valorMargemTotal` — total margem allowed for the period
- `valorTotalSolicitacoesCartaoAtivos` — committed to active card requests
- `saldoDisponivelCartao` — remaining card limit
- `tipoMargem` — `EMPRESTIMO`, `CARTAO_CONSIGNADO`, `CARTAO_BENEFICIOS`

## Servidor identity
- **CPF** — natural identity (1 person)
- **Matrícula** — employment identity (1 person can have N matrículas if working at multiple prefeituras or in multiple positions)
- **idMatricula** — bank's internal ID for a (prefeitura, matrícula) tuple
- **Vínculo empregatício** — employment type: `CLT`, `ESTATUTARIO`, `COMISSIONADO`, etc.
- **Situação funcional** — current status: `ATIVO`, `FERIAS`, `AFASTADO`, `LICENCA`, `APOSENTADO`, etc.
- **Estabelecimento** — the prefeitura entity
- **Secretaria** — department within the prefeitura (e.g. Educação, Saúde)
- **Lotação** — specific office/team

## Rates and totals
- **Taxa nominal (taxa a.m. / a.a.)** — interest rate, monthly or annual
- **CET (Custo Efetivo Total)** — true total cost including taxa, IOF, tarifas — what the user actually pays. Required to be displayed by BACEN.
- **IOF (Imposto sobre Operações Financeiras)** — federal tax on credit ops
- **Carência** — grace period before first installment
- **TAC** — Tarifa de Abertura de Crédito (often illegal in consignado)
- **Valor financiado** — total contract value (capital)
- **Valor líquido liberado** — what hits servidor's account after IOF/tarifas
- **Valor da parcela** — monthly installment
- **Saldo devedor** — remaining principal owed
- **Quantidade de parcelas** — typically 12 to 96 (8 years max for civil servants)

## Proposta state machine
```
simulada → criada → em_analise → aprovada | rejeitada
aprovada → contratada → averbada → ativa → quitada | cancelada
```
Source of truth: `specs/domain/state-machines.md` and MCP `atlas-domain` resource `domain://state-machine/proposta`.

## Contract state machine
```
pendente → averbado → em_dia → quitado
em_dia → inadimplente → (regularizado → em_dia) | cancelado
```

## Portabilidade flow
```
solicitada → analise_origem → analise_destino → aprovada → executada → concluida | falhada
```
Bank origem provides saldo devedor + taxa atual. Bank destino offers new condition. Regulated by BACEN res. 4.292/2013.

## Common mistakes to avoid
- **Servidor ≠ matrícula.** One servidor (CPF) can have many matrículas.
- **Averbação ≠ reserva.** Averbação is the payroll registration AFTER contract; reserva is a pre-contract slot.
- **Simulação ≠ proposta.** Simulação is read-only; proposta is binding once accepted.
- **Margem disponível ≠ margem total.** Always show both in UI to avoid confusion.
- **CET is monthly OR annual** — always say which. We default to **monthly (a.m.)** in UI but compute both.
- **Liberação only happens after averbação.** Don't show "valor liberado" until contract reaches `averbada`.

## Acronyms
- BACEN: Banco Central do Brasil
- LGPD: Lei Geral de Proteção de Dados
- CET: Custo Efetivo Total
- IOF: Imposto sobre Operações Financeiras
- TAC: Tarifa de Abertura de Crédito
- TJM: Taxa de Juros Máxima
- ADF: identificador de contrato/operação no banco (often returned as `adf`)
