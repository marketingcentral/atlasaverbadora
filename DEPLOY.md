# Atlas Averbadora — Guia de Deploy (Cloudflare + Postgres self-hosted)

Este documento cobre o provisionamento end-to-end:
- Postgres self-hosted (VPS Hetzner via Portainer)
- Cloudflare: Workers (API), Pages (Web), KV, R2, Hyperdrive, custom domains
- Secrets em produção (nunca em arquivos versionados)

> **Aviso de segurança:** credenciais SSH e tokens Cloudflare compartilhados em chat devem ser rotacionados após uso. Este guia assume que o operador roda os comandos a partir de uma máquina dele, não que credenciais reais entram em arquivos do repo.

---

## 1. Pré-requisitos

```bash
# Node.js >= 20, pnpm >= 9
node -v
pnpm -v

# Cloudflare CLI (Wrangler)
pnpm dlx wrangler --version          # ou instale globalmente: npm i -g wrangler

# psql para migrations (Postgres client)
psql --version
```

Autenticação no Cloudflare (uma vez por máquina):

```bash
wrangler login                       # abre browser para OAuth
# OU (em CI, ou para evitar browser):
export CLOUDFLARE_API_TOKEN="<token-com-permissoes-Workers+Pages+KV+R2+Hyperdrive>"
```

---

## 2. Postgres self-hosted (Portainer @ 5.161.88.70:5434)

### 2.1 Acessar o servidor

```bash
ssh root@5.161.88.70                 # senha conforme combinado (rotacione após o setup)
```

### 2.2 Criar database e usuário dedicado

Dentro do container do Postgres (ou via psql conectado pelo Portainer):

```sql
-- Conecte como superuser
CREATE USER atlas_app WITH PASSWORD '<SENHA_FORTE_NOVA>';
CREATE DATABASE atlas_app OWNER atlas_app;
GRANT ALL PRIVILEGES ON DATABASE atlas_app TO atlas_app;

-- Habilita extensões úteis
\c atlas_app
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2.3 Firewall / SSL

- **Recomendado:** restringir a porta 5434 aos IPs do Cloudflare Hyperdrive (consulte a [lista atual](https://www.cloudflare.com/ips/)).
- Habilitar `sslmode=require` no Postgres (gere certificado auto-assinado ou Let's Encrypt no host).
- Atualizar `pg_hba.conf` para forçar `hostssl` no usuário `atlas_app`.

### 2.4 Aplicar migrations

Da sua máquina local, com tunel SSH:

```bash
ssh -L 5434:127.0.0.1:5434 root@5.161.88.70 -N &
TUNEL_PID=$!

# Gera SQL a partir do schema Drizzle
pnpm --filter @atlas/api db:generate

# Aplica
export DATABASE_URL="postgresql://atlas_app:<senha>@localhost:5434/atlas_app?sslmode=disable"
pnpm --filter @atlas/api db:migrate

kill $TUNEL_PID
```

---

## 3. Cloudflare — recursos compartilhados (provisionar uma vez)

```bash
# KV namespaces
wrangler kv:namespace create CACHE
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create RATELIMIT
wrangler kv:namespace create CACHE --preview          # variante --preview repete pra cada um
# Anote os IDs retornados.

# R2 bucket (para PDFs de comprovantes, banners da vitrine, logs frios)
wrangler r2 bucket create atlas-files

# Hyperdrive (pool de conexões para o Postgres)
wrangler hyperdrive create atlas-hyperdrive \
  --connection-string="postgresql://atlas_app:<senha>@5.161.88.70:5434/atlas_app?sslmode=require"
# Anote o id retornado.
```

Cole os IDs em `apps/api/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV_CACHE"
id = "<id-cache>"
preview_id = "<preview-id-cache>"

[[kv_namespaces]]
binding = "KV_SESSIONS"
id = "<id-sessions>"
preview_id = "<preview-id-sessions>"

[[kv_namespaces]]
binding = "KV_RATELIMIT"
id = "<id-ratelimit>"
preview_id = "<preview-id-ratelimit>"

[[r2_buckets]]
binding = "R2_FILES"
bucket_name = "atlas-files"

[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<id-hyperdrive>"
```

---

## 4. Secrets de produção (Workers)

Nunca commitar. Use `wrangler secret put`:

```bash
cd apps/api

# Chaves JWT RS256 — gere localmente
openssl genpkey -algorithm RSA -out priv.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in priv.pem -out pub.pem

# Envie como secrets:
cat priv.pem | wrangler secret put JWT_PRIVATE_KEY
cat pub.pem | wrangler secret put JWT_PUBLIC_KEY

# Opcionais
wrangler secret put SENTRY_DSN

# Liste para conferir
wrangler secret list
```

> `DATABASE_URL` **não precisa** ser secret quando você usa Hyperdrive — o binding `HYPERDRIVE` já carrega a connection string.

---

## 5. Dev local (`.dev.vars`)

Copie `apps/api/.dev.vars.example` → `apps/api/.dev.vars` e preencha:

```bash
# .dev.vars (gitignored)
DATABASE_URL="postgresql://atlas_app:<senha>@localhost:5434/atlas_app?sslmode=disable"
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
BANK_ADAPTER="sandbox"
```

Suba o tunel SSH e rode:

```bash
ssh -L 5434:127.0.0.1:5434 root@5.161.88.70 -N &
pnpm --filter @atlas/api dev          # wrangler dev → http://localhost:8787
pnpm --filter @atlas/web dev          # vite → http://localhost:5173
pnpm --filter @atlas/mobile start     # expo
```

---

## 6. Deploy

### 6.1 API (Workers)

```bash
pnpm -r typecheck                     # garante consistência cross-package
pnpm --filter @atlas/api deploy       # wrangler deploy
```

Após o deploy:

```bash
curl https://atlas-api.<sua-conta>.workers.dev/healthz
# → {"status":"ok"}
```

### 6.2 Web (Cloudflare Pages)

```bash
pnpm --filter @atlas/web build
wrangler pages deploy apps/web/dist --project-name=atlas-web
```

Variável de ambiente em produção (Pages Settings):

```
VITE_API_BASE_URL=https://api.atlas.io
```

### 6.3 Mobile (EAS / Expo)

```bash
pnpm --filter @atlas/mobile build
# Para builds nativos use Expo EAS:
# eas build --platform ios --profile production
```

---

## 7. Custom domains

No painel Cloudflare:

| Subdomínio | Aponta para |
|---|---|
| `api.atlas.io` | Worker `atlas-api` |
| `app.atlas.io` | Pages `atlas-web` (servidor) |
| `banco.atlas.io` | Pages `atlas-web` (banco) — mesmo deploy, hostname distinto |
| `admin.atlas.io` | Pages `atlas-web` (averbadora) — mesmo deploy, hostname distinto |

> Como o React Router separa rotas por role, basta configurar 1 projeto Pages e apontar os 3 hostnames para ele. Em uma iteração seguinte podemos segmentar bundles por hostname (Vite SSR ou `_routes.json`).

---

## 8. Pós-deploy — smoke test end-to-end

```bash
# 1. API responde
curl https://api.atlas.io/healthz

# 2. Login servidor (CPF + senha de seed)
curl -X POST https://api.atlas.io/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"00011122233","password":"teste"}'

# 3. Carregar margem (use o access_token do passo 2)
curl https://api.atlas.io/v1/servidores/me/margem-consignavel \
  -H "Authorization: Bearer <token>"

# 4. Login banco e visão geral
TOKEN=$(curl -sX POST https://api.atlas.io/v1/auth/login -H "Content-Type: application/json" \
  -d '{"identifier":"banco@atlas.test","password":"teste"}' | jq -r .access_token)
curl https://api.atlas.io/v1/portal/banco/visao-geral -H "Authorization: Bearer $TOKEN"

# 5. Login averbadora e dashboard
TOKEN=$(curl -sX POST https://api.atlas.io/v1/auth/login -H "Content-Type: application/json" \
  -d '{"identifier":"admin@atlas.test","password":"teste"}' | jq -r .access_token)
curl https://api.atlas.io/v1/admin/dashboard -H "Authorization: Bearer $TOKEN"
```

---

## 9. Observabilidade pós-go-live

- **Sentry** — configure DSN como secret e habilite SDK Cloudflare Workers no `apps/api/src/index.ts`
- **Logs** — `wrangler tail atlas-api` em troubleshooting; Logpush para R2 em produção
- **Hyperdrive metrics** — painel Cloudflare → Hyperdrive → atlas-hyperdrive
- **Status page** — Statuspage.io ou solução interna para clientes externos

---

## 10. Rotação de credenciais (post-mortem da setup inicial)

Por segurança, após confirmar que o sistema sobe:

```bash
# Postgres
ssh root@5.161.88.70
psql -U postgres
ALTER USER atlas_app WITH PASSWORD '<nova-senha>';
\q
# Atualize o Hyperdrive:
wrangler hyperdrive update atlas-hyperdrive \
  --connection-string="postgresql://atlas_app:<nova-senha>@5.161.88.70:5434/atlas_app?sslmode=require"

# Cloudflare token — gere um novo scoped (Workers + Pages + KV + R2 + Hyperdrive)
# no painel CF e descarte o master que foi compartilhado em chat.
```

---

## 11. Próximas iterações pós-deploy

- Migrar fixtures in-memory (portal-banco/store.ts, admin/index.ts) para queries Drizzle reais
- WebSocket/SSE real para logs em vez de polling 5s
- @react-pdf/renderer no comprovante (substituir miniPdf hand-rolled)
- Backups automatizados Postgres → R2 (`pg_dump` diário em cron Worker)
- Renovação JWT key (`kid` rotation trimestral)
- CI: GitHub Actions com `pnpm typecheck`, `pnpm build`, deploy preview em PR
- E2E Playwright pelos 3 perfis no preview deploy
