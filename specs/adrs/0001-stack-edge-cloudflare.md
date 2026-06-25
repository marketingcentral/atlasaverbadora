# ADR-0001: Stack edge na Cloudflare

- **Status:** Aceito
- **Data:** 2026-06-22
- **Decisores:** time fundador Atlas

## Contexto

Precisamos de uma plataforma para servir API + web + integracoes bancarias com baixa latencia no Brasil inteiro (5570 prefeituras potenciais, interior incluso), custo previsivel em fase inicial e capacidade de crescer sem refazer infra.

## Decisao

Adotar Cloudflare como plataforma principal:
- **Workers** (Hono framework) para a API
- **Pages** para hospedar a web (Vite build estatico)
- **KV** para cache de margem, ofertas, rate-limit e dedupe de webhooks
- **R2** para PDFs (contratos), banners da vitrine e logs frios
- **Cloudflare Cron Triggers** para reconciliacao noturna e expiracao de propostas
- **mTLS** no perimetro para integracao com bancos sensiveis
- **Logpush** para Sentry e analytics

Postgres permanece em **Neon** (HTTP driver compativel com Workers, branching para dev/preview).

## Alternativas consideradas

1. **AWS (Lambda + RDS + S3 + CloudFront)** — maturidade maior, mas latencia regional, custo crescente e operacao mais pesada (VPC, IAM, etc.)
2. **Node + Render/Fly.io** — ergonomico, mas single-region por padrao e custo de cold start em horarios de pico.
3. **Vercel Edge Functions** — boa DX mas lock-in maior em Next.js; nao precisamos de SSR para web admin.

## Consequencias

**Positivas:**
- Latencia tipica < 180ms p50 mesmo no interior
- Custo zero ate primeiros milhoes de requisicoes
- Deploy global atomico via wrangler
- KV/R2 elimina necessidade de Redis e S3 separados

**Negativas / mitigacoes:**
- Workers tem limites (CPU 50ms paid, 128MB memoria) — mitigamos com Hono leve e nao fazer trabalho pesado no edge (background via Queues)
- Lock-in Cloudflare — mitigamos usando Hono (portavel para Node/Bun) e Drizzle (qualquer Postgres)
- Sem websockets fullsync facil — usamos Durable Objects ou polling assistido para o "logs ao vivo" do admin

## Quando reavaliar

- Custo Cloudflare > USD 5k/mes
- Necessidade real de workloads CPU-heavy no backend
- Algum banco exigir IP fixo nao suportado pela Cloudflare
