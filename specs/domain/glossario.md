# Atlas — Glossario de Dominio

Termos canonicos do dominio de credito consignado publico. Use esta grafia em codigo, UI e documentos.

## Personas

| Termo | Definicao |
|---|---|
| **Servidor (publico/municipal)** | Funcionario publico empregado por uma prefeitura. Identidade: CPF + matricula. Tem margem descontavel em folha. |
| **Prefeitura** | Empregador do servidor. Opera folha de pagamento onde parcelas sao descontadas. |
| **Banco parceiro** | Instituicao financeira que oferta consignado. Paga comissao a averbadora. |
| **Averbadora** | A plataforma (Atlas). Conecta servidor, prefeitura e banco. Centraliza margem, simulacoes, propostas e averbacao. |

## Identidade do servidor

| Termo | Definicao |
|---|---|
| **CPF** | Identidade natural (uma pessoa) |
| **Matricula** | Identidade empregaticia. Uma pessoa pode ter varias matriculas. |
| **idMatricula** | Id interno do banco para o tuplo (prefeitura, matricula) |
| **Vinculo empregaticio** | `CLT`, `ESTATUTARIO`, `COMISSIONADO`, etc. |
| **Situacao funcional** | `ATIVO`, `FERIAS`, `AFASTADO`, `LICENCA`, `APOSENTADO` |
| **Estabelecimento** | Prefeitura em si |
| **Secretaria** | Departamento (Educacao, Saude, etc.) |
| **Lotacao** | Escritorio/equipe especifica |

## Operacoes

| Termo | Definicao |
|---|---|
| **Simulacao** | Calculo nao-vinculante. Read-only. |
| **Proposta** | Oferta formal de um banco. Tem maquina de estados. |
| **Reserva** | Slot pre-contrato segurado pelo banco (24-72h). Confirmar → contrato; nao confirmar → expira. |
| **Contrato (novo emprestimo)** | Acordo de emprestimo formal. |
| **Averbacao** | Registro do desconto da parcela na folha da prefeitura. |
| **Refinanciamento (refin)** | Estender ou reestruturar contrato existente. |
| **Portabilidade** | Transferir contrato de banco A para banco B. Regulada pelo BACEN. |
| **Quitacao** | Pagamento antecipado total. |
| **Liberacao** | Credito do dinheiro na conta do servidor (apos averbacao). |

## Margem

| Categoria | Limite legal | Para que serve |
|---|---|---|
| Margem consignavel (emprestimo) | 35% do liquido | Parcelas de emprestimo tradicional |
| Margem cartao consignado | 5% do liquido | Pagamento minimo do cartao |
| Margem cartao beneficios | 5% do liquido | Beneficios |
| **Total** | **45%** | Soma maxima regulada |

Campos das APIs bancarias (iFractal-like):
- `valorMargemDisponivel` — livre para novas operacoes
- `valorMargemTotal` — limite total no periodo
- `valorTotalSolicitacoesCartaoAtivos` — comprometido em cartoes ativos
- `saldoDisponivelCartao` — limite remanescente
- `tipoMargem` — `EMPRESTIMO`, `CARTAO_CONSIGNADO`, `CARTAO_BENEFICIOS`

## Financeiro

| Termo | Definicao |
|---|---|
| **Taxa nominal (a.m./a.a.)** | Juros mensais ou anuais |
| **CET** | Custo Efetivo Total: inclui taxa + IOF + tarifas. Exigido por BACEN. |
| **IOF** | Imposto sobre Operacoes Financeiras |
| **TAC** | Tarifa de Abertura de Credito (proibida em consignado) |
| **Carencia** | Periodo de graca antes da primeira parcela |
| **Valor financiado** | Capital do contrato |
| **Valor liquido liberado** | O que cai na conta apos IOF/tarifas |
| **Valor da parcela** | Mensalidade |
| **Saldo devedor** | Principal remanescente |
| **Quantidade de parcelas** | 12 a 96 (8 anos max servidor publico) |
| **adf** | Identificador unico de operacao/contrato no banco |

## Identificadores tecnicos

| Termo | Definicao |
|---|---|
| **idConvenio** | Id do convenio entre banco e prefeitura |
| **chaveAcesso** | Chave de sessao emitida pelo banco para operacoes ligadas a matricula |
| **competencia** | Periodo `YYYYMM` (mes da folha) |

## Formato canonico de matricula

Prefeituras usam formatos diferentes na vida real: Palhoca usa digitos (`852029100`), o
exemplo do OpenAPI e `M-009821`, uma prefeitura futura pode usar `PAL-2024-001`. Nao
impomos UM formato porque quebrariamos integracoes reais. Mas normalizamos no boundary
pra evitar `m-9001` vs `M-9001` vs `M 9001` virarem 3 registros diferentes.

**Regra:** regex `^[A-Z0-9][A-Z0-9-]{0,29}$` — alfanumerico + hifen, 1..30 chars,
comeca com alfanumerico. Sempre `trim() + toUpperCase() + remove espacos internos`
no import (CSV) e no PATCH (edicao). Rejeita espaco, ponto, acento, caractere especial.

Implementacao: `apps/api/src/_shared/matricula.ts` (`normalizeMatricula`, `MATRICULA_REGEX`,
`MatriculaSchema` para Zod). Uso: import CSV admin (`/v1/admin/servidores/importar`),
import CSV prefeitura (`/v1/prefeitura/servidores/importar`), PATCH da prefeitura
(`/v1/prefeitura/servidores/:matricula`).

## Erros comuns a evitar

- **Servidor ≠ matricula.** Um CPF pode ter N matriculas.
- **Averbacao ≠ reserva.** Averbacao e o registro em folha apos contrato; reserva e slot pre-contrato.
- **Simulacao ≠ proposta.** Simulacao e read-only; proposta e vinculante apos aceite.
- **Margem disponivel ≠ margem total.** Mostre ambos na UI.
- **CET sempre indicar a.m. ou a.a.** Padronizamos **a.m. (mensal)** na UI.
- **Liberacao so apos averbacao.** Nao mostre "valor liberado" enquanto contrato nao for `averbada`.

## Siglas

- BACEN — Banco Central do Brasil
- LGPD — Lei Geral de Protecao de Dados
- CET — Custo Efetivo Total
- IOF — Imposto sobre Operacoes Financeiras
- TAC — Tarifa de Abertura de Credito
- TJM — Taxa de Juros Maxima
- ADF — Autorizacao de Desconto do Colaborador (identificador unico do contrato)
- RMC — Reserva de Margem para Cartao consignado
- RCC — Reserva de Cartao Consignado de beneficios
- CNPJ/CPF — documentos federais

## Termos do portal banco (vindos da Consignet + reuniao com cliente)

| Termo | Definicao |
|---|---|
| **Convenio ativo** | Contexto operacional do banco. Todo operador opera "dentro de" um convenio (banco x prefeitura). Switcher obrigatorio quando o banco atende multiplas prefeituras. Exibido em destaque na sidebar (ex: "CASTRO / DELTA GLOBAL"). |
| **Tabela de emprestimo** | Conjunto de regras (taxa min/max, prazo max em meses — ate 120, vigencia) que o banco cadastra POR convenio. Define o que o operador pode oferecer naquele convenio. |
| **Data de corte** | Dia do mes em que a folha da prefeitura fecha (ex: dia 15). Operacoes apos essa data caem no mes seguinte. Exibida em destaque no dashboard. |
| **Data de repasse** | Dia em que o banco recebe o desconto efetuado pela prefeitura. |
| **Folha 1o desconto** | Mes/ano da primeira parcela a ser descontada (ex: Abril/2026). |
| **Folha ultimo desconto** | Mes/ano da ultima parcela (ex: Marco/2036). |
| **Codigo de verba** | Codigo contabil da prefeitura para o lancamento da consignacao (ex: "1547 - DELTA GLOBAL I"). |
| **Comunicado** | Aviso da prefeitura/averbadora ao banco. Exibido como carrossel no dashboard banco. Pode ter periodo de vigencia. |
| **Reserva Composta** | Operacao de reserva mista (parte emprestimo, parte refin/portabilidade na mesma operacao). |
| **Auto-averbacao** | Servidor aceita oferta pre-aprovada via app/portal sem intervencao do operador banco; averbacao e confirmada posteriormente. |
| **Pendencia em contrato** | Acao que o operador precisa tomar (ex: documento faltando, confirmacao pendente). Aparece como KPI no dashboard. |
| **Carteira de contratos** | Total de contratos ativos do banco no convenio. KPI principal do dashboard. |
| **Migrado** | Status de contrato que foi portado para outro banco. |
| **Finalizado** | Status terminal (quitado, cancelado ou portado). |
| **Bloqueio** | Marca de impedimento em contrato (judicial, administrativo, etc.). |
| **Representante / Filial** | Distribuicao de propriedade de contrato dentro do banco. |
| **ECONSIGNADO** | Marcador de operacao 100% eletronica (sem papel). |
| **EMPRESTIMO** (tipo) | Tipo de contrato padrao consignado. |

## Operacoes em contratos (acoes do operador)

| Acao | Descricao | Estado destino |
|---|---|---|
| Imprimir Comprovante | Gera PDF com dados do contrato | (sem mudanca) |
| Quitar | Quitacao antecipada do saldo devedor | `quitado` |
| Suspender | Pausa temporariamente os descontos | `suspenso` |
| Cancelar | Encerra antes do primeiro desconto | `cancelado` |
| Alongar | Adiciona parcelas (renegociacao) | `em_dia` (com novo prazo) |
| Alterar | Edita dados pontuais (motivo justificavel) | (sem mudanca de estado) |

## Tabs do detalhe de contrato

1. **Contrato** — dados essenciais (ADF, situacao, tipo, convenio, datas, parcelas, taxas, codigo verba)
2. **Parcelas** — cronograma com status por parcela (Paga, A vencer, Em aberto)
3. **Financiamento** — valores brutos, IOF, tarifas, liquido, CET
4. **Historico** — eventos do contrato (criacao, averbacao, descontos, alteracoes)
5. **ADF Vinculada** — contratos relacionados (origem em refin/portabilidade)
6. **Quitacao** — calculo de quitacao com data de referencia
7. **Complementares** — anexos, observacoes, dados livres
