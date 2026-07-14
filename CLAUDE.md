# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The binding project rules (stack, naming, code conventions, skills/MCPs) live in [.claude/CLAUDE.md](.claude/CLAUDE.md) and are loaded into every session. This file complements them with build/dev commands and the cross-package architecture needed to act productively.

## Commands

Workspaces are pnpm + Turborepo (requires `node >=20`, `pnpm >=9`). Always invoke per-package with `pnpm --filter <name>`; root scripts (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`) fan out via Turbo to every workspace. Note: `pnpm lint` is currently a no-op — no package defines a `lint` script yet, so don't rely on it as a gate (use `pnpm -r typecheck` instead).

```bash
pnpm install                                 # install all workspaces
pnpm -r typecheck                            # required before any multi-package commit
pnpm format                                  # prettier across the repo

# Per-app dev
pnpm --filter @atlas/api dev                 # wrangler dev → http://localhost:8787
pnpm --filter @atlas/web dev                 # vite → http://localhost:5173
pnpm --filter @atlas/mobile start            # expo

# API — DB + deploy
pnpm --filter @atlas/api db:generate         # drizzle-kit generate from src/db/schema.ts
pnpm --filter @atlas/api db:migrate          # apply migrations (needs DATABASE_URL)
pnpm --filter @atlas/api deploy              # wrangler deploy (Workers)

# Web — production build + deploy
pnpm --filter @atlas/ui --filter @atlas/sdk --filter @atlas/types build   # build internal pkgs first
pnpm --filter @atlas/web build               # tsc --noEmit && vite build
wrangler pages deploy apps/web/dist --project-name=atlas-web --branch=main --commit-dirty=true

# Tests
pnpm --filter @atlas/api test                # vitest run (API)
pnpm --filter @atlas/domain test             # vitest run (domain)
pnpm --filter @atlas/api test -- <pattern>   # single test (pass-through to vitest)

# MCP servers (custom, registered in .mcp.json)
pnpm mcp:build                               # build all three before they can be invoked

# Local Postgres tunnel (Hetzner VPS — see DEPLOY.md §2)
ssh -L 5434:127.0.0.1:5434 root@65.109.134.78 -N &
```

`apps/api` requires `apps/api/.dev.vars` (gitignored) for local dev — `DATABASE_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `BANK_ADAPTER=sandbox`. See [DEPLOY.md](DEPLOY.md) §5.

## High-level architecture

### Monorepo dependency direction

```
apps/{api,web,mobile}
   └─► packages/sdk  ──► packages/types ──► (zod)
   └─► packages/ui   ──► packages/types
   └─► packages/domain (api only) ──► packages/types
```

- `@atlas/types` is the leaf — zod schemas + shared DTOs. Everything else imports from it.
- `@atlas/sdk` is the typed HTTP client for `@atlas/api`. Web and mobile **never** call `fetch` directly — go through the SDK so request/response shapes stay aligned with `specs/openapi.yaml`.
- `@atlas/ui` exports three entrypoints — `@atlas/ui/web` (DOM components), `@atlas/ui/native` (React Native), `@atlas/ui/tokens` (and `@atlas/ui/tokens.css`). UI code picks the entrypoint matching its platform.
- `@atlas/domain` holds entities, value objects, and state machines used **only by the API**. Web/mobile do not depend on it.

### API (apps/api) — module-per-domain Hono Worker

Bootstrap is [apps/api/src/index.ts](apps/api/src/index.ts): one `Hono` app, global middleware (cors → logger → onError → rate-limit on `/v1/*`), then each module mounted with `app.route("/", xxxRoutes)`. Modules live in `apps/api/src/modules/`:

- `auth/` — JWT RS256 issue/refresh (`jwt.ts`). DEV_USERS array is the temporary user store — replace before go-live.
- `servidores/` — `/v1/servidores/*` endpoints used by the mobile + servidor web profile.
- `portal-banco/` — `/v1/portal/banco/*` for the bank portal; has in-memory `store.ts` + `fixtures.ts` to be replaced by Drizzle queries.
- `admin/` — `/v1/admin/*` for the averbadora super-admin; also exports `csvTemplateRoutes` mounted **before** rate-limit so templates are public.
- `prefeitura/`, `external/` (public/partner endpoints), `health/`.

Cross-cutting:
- [apps/api/src/env.ts](apps/api/src/env.ts) declares the `Env` binding (KV, R2, Hyperdrive, secrets) and validates with zod.
- [apps/api/src/db/](apps/api/src/db/) — Drizzle schema + `client.ts` that prefers the `HYPERDRIVE` binding and falls back to `DATABASE_URL` for local dev.
- [apps/api/src/middleware/](apps/api/src/middleware/) — `auth`, `api-token`, `rate-limit` (KV-backed), `logger` (trace_id), `error`, `cors`.
- [apps/api/src/_shared/](apps/api/src/_shared/) — `errors.ts` (typed error envelopes that the SDK consumes), `trace.ts`, `csv.ts`.

When adding an endpoint: update [specs/openapi.yaml](specs/openapi.yaml) in the same PR (project rule).

### Bank integration — Adapter pattern (ADR-0004)

All bank calls go through [apps/api/src/integrations/bank-adapter.ts](apps/api/src/integrations/bank-adapter.ts). Implementations are swapped via the `BANK_ADAPTER` env var (`sandbox` ↔ `ifractal`). Business code receives a `BankAdapter` by injection — **never call HTTP directly**. Every POST carries an `Idempotency-Key`, with retry 3× (250/750/2500 ms backoff) and DLQ in KV. iFractal flow: `authorize → getMatriculas → getMargens → simulate → create{Emprestimo,Reserva} → confirmar`. Use `mcp-servers/atlas-bank-sandbox` as the contract mock in dev. See [specs/adrs/0004-bank-integration-pattern.md](specs/adrs/0004-bank-integration-pattern.md).

### Web (apps/web) — single bundle, role-routed

One Vite SPA serves three personas. [apps/web/src/router.tsx](apps/web/src/router.tsx) declares route trees per role under `/servidor`, `/banco`, `/averbadora`, `/prefeitura`. Each tree is wrapped by `<RequireAuth role="...">` which reads the stored role from `lib/sdk.ts`. A single role mismatch redirects to that user's home — there is no separate build per profile (custom domains in production map to the same deploy; see [DEPLOY.md](DEPLOY.md) §7).

Per-profile layout files own the chrome (header/sidebar) — `routes/{servidor,banco,averbadora,prefeitura}/layout.tsx` — and the navigation array `NAV` at the top of each layout is the single source of truth for menu items. Page files (`routes/<profile>/<page>.tsx`) export a named React component (e.g. `ServidorMarketplace`). Adding a page = create file + register in `router.tsx` + add to `NAV`. Full guide: [GUIA_EDICAO_WEB.md](GUIA_EDICAO_WEB.md).

API access from the web app goes exclusively through `@atlas/sdk` via the `AtlasClient` instance in `apps/web/src/lib/sdk.ts`. Reads use `useQuery` (TanStack Query) — never raw `fetch`.

### Mobile (apps/mobile) — Expo Router

Servidor-only client. File-based routing under `apps/mobile/app/`. Uses the same `@atlas/sdk` and shared zod types as web. Secrets live in `expo-secure-store`. `expo-local-authentication` covers biometric login.

### MCP servers

Three custom MCP servers in `mcp-servers/` are registered in [.mcp.json](.mcp.json) and run from their `dist/` builds — **must `pnpm mcp:build` first** to be invokable:

- `atlas-bank-sandbox` — mock of the iFractal bank API; consumed by `BankSandboxAdapter`.
- `atlas-design-system` — tokens + component catalog (source of truth for UI work).
- `atlas-domain` — glossary, state machines, business rules (CET, margens). Consult before changing entity state transitions.

### Spec-first artifacts

- [specs/openapi.yaml](specs/openapi.yaml) — API contract. Update with every endpoint change.
- [specs/domain/state-machines.md](specs/domain/state-machines.md) — authoritative state diagrams for Proposta, Contrato, Portabilidade.
- [specs/domain/glossario.md](specs/domain/glossario.md), [specs/domain/regras-negocio.md](specs/domain/regras-negocio.md).
- [specs/adrs/](specs/adrs/) — architectural decisions (stack, monorepo, RBAC, bank integration, Hyperdrive, UX baselines, competitive positioning).
- [specs/security/](specs/security/) — threat model, LGPD/BACEN compliance.

## Reference material (read-only)

- `demo/` — legacy HTML/CSS prototype (old "Averba" brand). **Visual reference only** — do not import or copy the brand name into new code.
- `integracao_exemplo/` — PDF + BPMNs of the real iFractal bank API; the contract the sandbox MCP must mirror.
- `breafing_base_concorrentes/` — competitor briefings.

## Authentication notes

Login is single-screen — the identifier shape (CPF vs email + domain) drives the redirect: 11-digit CPF → `/servidor`, `banco@*` → `/banco`, `admin@*`/`atlas@*` → `/averbadora`. The real `role` is in the JWT returned by `POST /v1/auth/login`. Dev credentials and the temporary `DEV_USERS` array are documented in `CREDENCIAIS.md` (gitignored).
