# ADR-0004: Padrao de integracao bancaria (Adapter + Idempotency + Retry)

- **Status:** Aceito
- **Data:** 2026-06-22

## Contexto

Bancos brasileiros oferecem APIs com vocabulario, autenticacao e SLAs diferentes (iFractal, BMG, Pan, etc.). Precisamos absorver essa diversidade sem espalhar `if banco.tipo == X` pelo codigo.

## Decisao

### 1. Adapter Pattern
Toda comunicacao com banco passa por uma interface canonica:

```ts
interface BankAdapter {
  authorize(creds): Promise<BankSession>;
  getMatriculas(s, cpf, idConvenio): Promise<Matricula[]>;
  getMargens(s, idMatricula, competencia): Promise<Margem[]>;
  simulate(s, payload): Promise<Oferta>;
  createEmprestimo(s, payload): Promise<{ adf, numeroContrato }>;
  createReserva(s, payload): Promise<{ adf, expiracao }>;
  confirmar(s, adf): Promise<void>;
  refinanciar(s, payload): Promise<{ adf }>;
  portar(s, payload): Promise<{ adf }>;
  quitar(s, payload): Promise<void>;
}
```

Implementacoes:
- `BankIFractalAdapter` (modelo da pasta `integracao_exemplo/`)
- `BankSandboxAdapter` (consome o MCP `atlas-bank-sandbox` em dev)
- Outras conforme adicao de bancos

Codigo de negocio (servicos) recebe `BankAdapter` por injecao — nunca chama HTTP diretamente.

### 2. Idempotency-Key obrigatoria
Todo POST a banco inclui `Idempotency-Key: <uuid-v4>`. Chave persistida em `proposta_eventos.idempotency_key` antes do envio. Retry usa MESMA chave.

### 3. Retry exponencial + DLQ
- Tentativas: 3 (250ms, 750ms, 2500ms backoff)
- Retry on: timeout, 5xx, 429 (com Retry-After)
- No-retry: 4xx (exceto 429), erros de assinatura
- Apos esgotar: gravar em `dead_letter` (KV TTL 7d) + Sentry alert

### 4. Timeout
- 1.2s por chamada
- Simulacao (fanout): `Promise.allSettled` com budget 1.5s

### 5. Cache de token
- Por `banco_id` em KV: `bank_token:<banco_id>`
- TTL: `expires_in - 5min`
- Refresh single-flight com lock em KV

## Consequencias

- Onboard de novo banco: 1 adapter + tests de contrato
- Swap banco real <-> sandbox: trocar binding `BANK_ADAPTER` em wrangler.toml
- Audit completo: toda chamada deixa rastro em `proposta_eventos`
- DLQ permite remediar manualmente sem reprocessar tudo
