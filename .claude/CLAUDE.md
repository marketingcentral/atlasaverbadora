# Atlas Averbadora — instrucoes do projeto

Plataforma digital de averbacao de credito consignado publico. Conecta 3 personas:
- **Servidor Municipal** (mobile iOS/Android + dashboard web read-only)
- **Banco Parceiro** (portal web)
- **Averbadora** (painel admin web)

## Nomeacao
- Produto/codigo: **Atlas Averbadora** — packages `@atlas/*`, dominios `atlas.io`
- A pasta `demo/` usa marca antiga "Averba" como **base de conhecimento visual apenas**. Nao use "Averba" em codigo novo.
- A pasta `integracao_exemplo/` documenta a API real iFractal/IF — usar como contrato para o MCP `atlas-bank-sandbox`.

## Stack obrigatoria (decidida — nao alterar sem ADR)
- **Backend:** Cloudflare Workers + Hono + Drizzle ORM + PostgreSQL (Neon) + KV + R2
- **Web:** Vite + React 18 + React Router 6 + TanStack Query + `@atlas/ui` + `@atlas/sdk`
- **Mobile:** Expo SDK 51+ + Expo Router + React Native + `@atlas/ui` (RN) + `@atlas/sdk`
- **Auth:** JWT RS256 (15min) + refresh rotativo (30d) em KV; OAuth2 client-credentials + mTLS para bancos
- **Obs:** Sentry + logs JSON estruturados com `trace_id`
- **Push:** Firebase FCM via Expo Push

## Repo
Monorepo pnpm + Turborepo:
- `apps/api`, `apps/web`, `apps/mobile`
- `packages/ui`, `packages/sdk`, `packages/types`, `packages/domain`, `packages/config-*`
- `mcp-servers/atlas-bank-sandbox`, `mcp-servers/atlas-design-system`, `mcp-servers/atlas-domain`
- `specs/openapi.yaml`, `specs/domain/`, `specs/adrs/`, `specs/security/`

## Regras de codigo
1. **TypeScript estrito** em todo lugar: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
2. **Validacao em boundary com Zod** — request bodies, query params, env vars, configs externas. Nunca confie em dados nao validados.
3. **Identifiers em ingles**, **UI em PT-BR**. Comentarios em ingles.
4. **Idempotencia** em toda mutacao que toca sistema externo (banco, prefeitura). Use `Idempotency-Key` header e KV para dedup.
5. **Audit log append-only** para qualquer transicao de estado de Proposta/Contrato/Portabilidade.
6. **Nenhum segredo em git** — use `.dev.vars` (Workers), Expo SecureStore (mobile), Worker Secrets (prod). Adicione padroes no `.gitignore` antes de criar arquivos sensiveis.
7. **PII mascarada em logs** — CPF, RG, nome completo, salario nunca em log de aplicacao. Use helper `maskPII()`.
8. **Conventional commits** com escopo de pacote: `feat(api): ...`, `fix(web): ...`, `chore(ui): ...`, `docs(specs): ...`

## Como trabalhar
- Antes de tocar UI, **consulte o MCP `atlas-design-system`** ou a skill `atlas-design-system`.
- Antes de tocar integracao bancaria, **consulte o MCP `atlas-bank-sandbox`** e os BPMNs em `integracao_exemplo/Rotas Banco 1/`.
- Antes de definir/mover estados de entidades, **consulte `specs/domain/state-machines.md`** ou o MCP `atlas-domain`.
- Mudancas multi-pacote: rodar `pnpm -r typecheck` antes do commit.
- Sempre que adicionar endpoint: atualizar `specs/openapi.yaml` no mesmo PR.

## Skills disponiveis (project-scoped)
- `atlas-conventions` — convencoes de codigo e estrutura
- `atlas-security` — OWASP, LGPD, HMAC, mTLS, mascaramento
- `atlas-design-system` — uso correto de tokens e componentes
- `atlas-bank-integration` — padroes para integrar bancos (iFractal-like)
- `atlas-domain-glossary` — termos de negocio (margem, averbacao, CET, etc.)
- `atlas-testing` — padroes de teste (unit/contract/e2e)

## MCPs disponiveis (project-scoped, via .mcp.json)
- `atlas-bank-sandbox` — mock da API bancaria
- `atlas-design-system` — fonte de verdade do design
- `atlas-domain` — glossario, state machines, regras de negocio (CET, margens)
