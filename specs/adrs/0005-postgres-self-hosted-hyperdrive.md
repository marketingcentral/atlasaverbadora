# ADR-0005: Postgres self-hosted via Cloudflare Hyperdrive

- **Status:** Aceito
- **Data:** 2026-06-22
- **Decisores:** time fundador Atlas (Diego + cliente Atlas)
- **Supera parcialmente:** [ADR-0001](0001-stack-edge-cloudflare.md) (a parte que falava em Neon)

## Contexto

O usuario ja possui um Postgres 17-alpine rodando em VPS Hetzner gerenciado via Portainer (stack `averba`), exposto na porta 5434. A escolha original do Neon (HTTP serverless) foi feita pela compatibilidade com Workers. Agora temos duas opcoes:

1. Continuar com Neon (rapido de subir, custo zero ate certo ponto, sem ops)
2. Reaproveitar o Postgres ja em producao (controle total, sem vendor lock, sem custo adicional, dados ficam em PT-BR/Hetzner)

O usuario optou pela opcao 2 por motivos de controle e custo.

## Decisao

Adotar **Postgres self-hosted no Portainer + Cloudflare Hyperdrive** como camada de pool e cache de conexoes para Workers.

**Arquitetura:**

```
Workers (apps/api)
   │
   ▼ binding HYPERDRIVE
Cloudflare Hyperdrive  (pool + SSL + cache de prepared statements)
   │
   ▼ TCP/SSL
Postgres 17-alpine (Portainer @ 5.161.88.70:5434)
```

**Driver no codigo:** `drizzle-orm/postgres-js` + `postgres@^3.4.4`. O binding Hyperdrive expoe um host/port locais via `env.HYPERDRIVE.connectionString` que o driver consome transparentemente.

**Dev local sem Hyperdrive:** o codigo aceita fallback para `DATABASE_URL` (variavel em `.dev.vars`) e conecta direto via TCP. Funciona em `wrangler dev --local`.

## Alternativas consideradas

1. **Continuar com Neon HTTP** — mais simples mas paga (acima do free tier), dados em US-East, sem reuso da VPS ja paga.
2. **PostgREST como gateway** — adiciona componente extra e perde tipos fortes do Drizzle.
3. **Workers + tcp socket direto (`cloudflare:sockets`)** — funciona mas sem pool nativo nem cache; ruim sob carga.

## Consequencias

**Positivas:**
- Controle total dos dados (LGPD + soberania)
- Custo marginal zero (VPS ja existente)
- Hyperdrive reduz latencia (cache de prepared statements + pool persistente)
- Backups e replicacao sob nosso controle

**Negativas / mitigacoes:**
- VPS = SPOF -> backup diario (pg_dump -> R2) + plano de recuperacao documentado
- Porta 5434 exposta publicamente -> SSL obrigatorio (`sslmode=require`) + firewall restrito aos IPs do Hyperdrive da CF, ou senha forte + auditoria de conexoes
- Hyperdrive ainda em GA, mas suporte e estavel
- Latencia adicional em cold start do Hyperdrive (~30ms primeira requisicao)

## Implementacao

| Componente | Mudanca |
|---|---|
| `apps/api/package.json` | `-` `@neondatabase/serverless` ; `+` `postgres@^3.4.4` |
| `apps/api/src/db/client.ts` | trocar `drizzle/neon-http` por `drizzle/postgres-js` |
| `apps/api/src/env.ts` | adicionar `HYPERDRIVE?: Hyperdrive` ao tipo Env |
| `apps/api/wrangler.toml` | `[[hyperdrive]]` binding |
| `apps/api/.dev.vars.example` | exemplo de `DATABASE_URL` |

## Operacao

```bash
# Criar Hyperdrive (uma vez)
wrangler hyperdrive create atlas-hyperdrive \
  --connection-string="postgresql://atlas_app:***@5.161.88.70:5434/atlas_app?sslmode=require"
# Anotar id retornado e colar em wrangler.toml

# Migrations (drizzle-kit via tunel SSH)
ssh -L 5434:127.0.0.1:5434 root@5.161.88.70 -N &
DATABASE_URL="postgresql://atlas_app:***@localhost:5434/atlas_app" pnpm --filter @atlas/api db:migrate
```

## Quando reavaliar

- VPS atingir limite (CPU / IO / espaco)
- Necessidade de read-replicas geograficas -> avaliar Neon ou Aurora multi-region
- Crescimento > 100GB DB ou > 1k conexoes simultaneas
