# Atlas Averbadora

Plataforma digital de averbacao de credito consignado publico. Conecta servidores municipais, bancos parceiros e a averbadora central em uma unica plataforma com app mobile (iOS/Android para servidores) e web (3 acessos: servidor, banco, averbadora).

## Stack

- **API** — Cloudflare Workers + Hono + Drizzle ORM + PostgreSQL (Neon) + KV + R2
- **Web** — Vite + React 18 + React Router + TanStack Query + `@atlas/ui` + `@atlas/sdk`
- **Mobile** — Expo SDK 51+ + Expo Router + React Native + `@atlas/ui`
- **Auth** — JWT RS256 + refresh rotativo
- **Observabilidade** — Sentry + logs estruturados

## Estrutura

```
apps/api      # Cloudflare Worker (Hono)
apps/web      # Vite + React (3 perfis)
apps/mobile   # Expo (servidor)

packages/ui            # design system (web + RN)
packages/sdk           # @atlas/sdk client TS
packages/types         # tipos compartilhados (zod)
packages/domain        # entidades, value objects, state machines
packages/config-*      # configs compartilhadas (ts, eslint)

mcp-servers/atlas-bank-sandbox    # mock banco iFractal-like
mcp-servers/atlas-design-system   # tokens + componentes
mcp-servers/atlas-domain          # glossario + state machines + CET

specs/openapi.yaml    # contrato da API Atlas
specs/domain/         # glossario, state machines, regras de negocio
specs/adrs/           # decisoes arquiteturais
specs/security/       # threat model + LGPD/BACEN

.claude/CLAUDE.md     # regras carregadas em toda sessao
.claude/skills/       # skills project-scoped
.mcp.json             # registra os 3 MCPs custom
```

## Comandos

```bash
pnpm install              # instala tudo
pnpm typecheck            # tsc -p em todos workspaces
pnpm build                # build de todos
pnpm dev                  # dev em paralelo (turbo)
pnpm mcp:build            # build dos 3 MCP servers

# por app
pnpm --filter @atlas/api dev          # wrangler dev
pnpm --filter @atlas/web dev          # vite
pnpm --filter @atlas/mobile start     # expo
```

## Documentacao

- [Plano de desenvolvimento](C:\Users\User\.claude\plans\vamos-desenvolver-por-completo-atomic-flask.md)
- [OpenAPI](specs/openapi.yaml)
- [Glossario](specs/domain/glossario.md)
- [Regras de negocio](specs/domain/regras-negocio.md)
- [Threat model](specs/security/threat-model.md)
- [LGPD + BACEN](specs/security/compliance-lgpd-bacen.md)
- [ADRs](specs/adrs/)

## Material de referencia (read-only)

- `demo/` — prototipo HTML/CSS/JS. Fonte canonica do design system.
- `integracao_exemplo/` — PDF e BPMNs da API bancaria iFractal/IF que vamos integrar.
