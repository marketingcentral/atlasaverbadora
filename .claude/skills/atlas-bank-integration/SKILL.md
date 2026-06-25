---
name: atlas-bank-integration
description: Use when integrating with bank APIs, building mocks, or implementing flows like simulation, proposal, reservation, refinancing, portability, payoff. Applies the iFractal-style pattern observed in integracao_exemplo/Rotas Banco 1/ — authorize → matriculas → margens → contract → confirm.
---

# Atlas — Bank Integration Pattern

The reference contract is iFractal/IF (BPMN diagrams in `integracao_exemplo/Rotas Banco 1/Rotas Banco/*.png`). Every bank we integrate follows the **same logical shape**, even if endpoint paths/payloads differ.

## Canonical flow (all operations start the same way)

```
1. Authorize         POST /authorize        { username, password } → token
2. Get matriculas    GET  /v1/cpfColaborador/matriculas?idConvenio=&cpf= → matriculas[]
3. Get margens       GET  /v1/idMatricula/margens?idConvenio=&idMatricula=&competencia= → margens[]
4. Operation-specific call (emprestimo, reserva, refin, portabilidade, quitacao)
5. Confirm (when applicable)  POST /v1/confirmar { adf }
```

## Key concepts (domain terms)
- **idConvenio** — agreement ID between bank and prefeitura
- **idMatricula** — employee registration ID (servidor in a specific prefeitura)
- **cpfColaborador** — CPF of the servidor
- **chaveAcesso** — server-issued access key for matricula-scoped operations
- **competencia** — period as `YYYYMM` (current payroll month)
- **adf** — unique contract identifier returned after creation; used to confirm
- **tipoMargem** — `EMPRESTIMO`, `CARTAO_CONSIGNADO`, `CARTAO_BENEFICIOS`
- **situacaoFuncional** — employee status: ATIVO, FERIAS, AFASTADO, etc.

## Per-operation payloads (typical fields)

### `POST /v1/contratos/emprestimos` (new loan)
Request: `numeroContrato, vencimentoPrimeiraParcela, dataLiberacaoCredito, quantidadeParcelas, valorTotalFinanciado, valorLiquidoLiberado, valorParcela, percentualJurosMensal, percentualCet, diasCarencia, valorIof, observacoes, chaveAcesso`
Response (`201 OK`): `adf, numeroContrato`

### `POST /v1/contratos/reservas/emprestimos` (loan reservation)
Same body as above. Response: `adf, numeroContrato, dataExpiracao`
Then `POST /v1/confirmar` with `{ adf }` to convert reservation → contract.

### `POST /v1/refinanciamento` / `POST /v1/contratos/reservas/refin`
Same shape + `contratoOrigem` (id of contract being refinanced).

### `POST /v1/portabilidade`
Adds `bancoOrigem`, `contratoOrigem`, `saldoDevedor` of original contract.

### `POST /v1/quitacao`
Body: `{ adf | numeroContrato, valorQuitacao, dataQuitacao }`

## Implementation rules

### 1. Adapter pattern — never call bank HTTP directly from business code
```ts
// packages/sdk/bank/bank-adapter.ts (interface)
interface BankAdapter {
  authorize(creds: BankCreds): Promise<BankSession>;
  getMatriculas(s: BankSession, cpf: string, idConvenio: string): Promise<Matricula[]>;
  getMargens(s: BankSession, idMatricula: string, competencia: string): Promise<Margem[]>;
  createEmprestimo(s: BankSession, payload: NovoEmprestimoPayload): Promise<{ adf: string; numeroContrato: string }>;
  // ...
}

// apps/api/src/integrations/bank-ifractal-adapter.ts (real impl)
// apps/api/src/integrations/bank-sandbox-adapter.ts (uses MCP atlas-bank-sandbox)
```

### 2. Auth caching
- Cache `token` per `banco_id` in KV with TTL = `expires_in - 5min`.
- Lock around refresh (single-flight) to avoid stampede.

### 3. Idempotency
- Every POST to bank must include `Idempotency-Key: <uuid-v4>`.
- The key is generated server-side and persisted in `proposta_eventos` table.
- On retry, send SAME key — bank dedupes.

### 4. Retry policy
- Exponential backoff: 250ms, 750ms, 2.5s. Max 3 attempts.
- Retry on: timeout, 5xx, 429.
- Do NOT retry on: 4xx (except 429), network refused after 1st try with diff key.
- After 3 failures → dead-letter (DLQ in KV with TTL 7 days) + Sentry alert.

### 5. Timeout
- 1.2s per single bank call.
- Fan-out (simulation across N bancos): `Promise.allSettled` with 1.5s overall budget.

### 6. State machine
Bank events MUST drive proposta state transitions (see `specs/domain/state-machines.md`):
- `proposta.simulada` (Atlas) → `proposta.criada` (bank ack) → `proposta.aprovada` (bank webhook) → `proposta.contratada` (after confirmar) → `proposta.averbada` (prefeitura webhook).

### 7. Audit log
Every bank call writes a row to `proposta_eventos` (append-only):
- `proposta_id, evento, direcao (out|in), banco_id, payload_hash, status_http, duracao_ms, trace_id, criado_em`

## Mock for development
Use the `atlas-bank-sandbox` MCP — it implements ALL the canonical endpoints with deterministic mock data (50 servidores fake, 3 prefeituras, 5 bancos with different rate/term policies). Same interface as real adapter, so you can swap at config time.

## When adding a NEW bank
1. Get their OpenAPI/Postman + sandbox creds.
2. Diff their endpoints against the canonical shape above.
3. Implement `BankAdapter` for them in `apps/api/src/integrations/bank-<name>-adapter.ts`.
4. Add to `bank_registry` table with: id, name, adapter_id, scopes, oauth_url, base_url, mtls_required.
5. Add contract test in `apps/api/tests/contract/bank-<name>.spec.ts` (replays sandbox responses against adapter).
6. NO business code outside the adapter should know which bank it's talking to.
