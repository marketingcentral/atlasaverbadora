---
name: atlas-conventions
description: Use when creating or editing files anywhere in the Atlas Averbadora monorepo (apps/*, packages/*, mcp-servers/*) — applies naming, folder structure, exports, imports and commit conventions used in this project.
---

# Atlas — Conventions

## Naming
- **Packages:** `@atlas/<name>` (kebab-case). Ex: `@atlas/ui`, `@atlas/sdk`, `@atlas/domain`.
- **Files:** `kebab-case.ts`. React components in `PascalCase.tsx`. Test files: `*.test.ts` or `*.spec.ts`.
- **Identifiers:** English (`getMargem` not `obterMargem`). UI strings stay in **PT-BR** (`"Margem disponivel"`).
- **DB tables:** `snake_case` plural (`servidores`, `propostas`, `proposta_eventos`).
- **API routes:** `/v1/<resource>/...` always versioned.
- **Env vars:** `SCREAMING_SNAKE_CASE`.

## Folder structure per package
```
packages/<name>/
├── src/
│   ├── index.ts                # public exports only
│   └── <feature>/              # internal modules
├── tests/                      # tests mirror src/
├── package.json
├── tsconfig.json
└── README.md                   # what it does + how to use
```

## Folder structure per app
```
apps/<name>/
├── src/                        # or app/ for Expo Router, routes/ for Vite
├── package.json
├── tsconfig.json
├── <framework-config>          # wrangler.toml, vite.config.ts, app.json, etc.
└── README.md                   # how to dev, build, deploy
```

## Imports
- Always use **package names** for cross-package imports: `import { Button } from "@atlas/ui"`.
- Use **relative imports** within a package: `import { helper } from "./helper"`.
- No deep imports across packages — packages only expose what's in `src/index.ts`.
- TypeScript path aliases live in `tsconfig.base.json` and are inherited.

## Exports
- Every package has a single `src/index.ts` that re-exports its public API.
- Types go through `export type { ... }` to keep emit clean.
- Default exports forbidden in app code; allowed only for framework requirements (e.g., Next/Expo page files).

## Error handling
- Throw typed errors (`AtlasError`, `BankIntegrationError`, etc.) — never raw `Error`.
- API responses for errors: `{ "error": { "code": "snake_case_code", "message": "user-friendly PT-BR", "details": {} } }`.
- Never swallow errors silently; log with `trace_id` and rethrow or convert to user-facing.

## Commits (conventional)
Format: `<type>(<scope>): <subject>`

- **types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `build`, `ci`
- **scopes:** `api`, `web`, `mobile`, `ui`, `sdk`, `domain`, `types`, `specs`, `mcp-bank`, `mcp-ds`, `mcp-domain`, `repo`

Examples:
- `feat(api): add /v1/auth/login with CPF+password for servidor`
- `fix(ui): MargemCard percent calc when salary is 0`
- `docs(specs): add ADR-0005 webhook retry policy`

## Pre-commit checklist
- `pnpm -r typecheck` green
- `pnpm -r lint` green
- New API endpoint? `specs/openapi.yaml` updated
- New env var? `.dev.vars.example` updated and documented in README
- Touched UI? Tokens come from `@atlas/ui`, no hard-coded colors

## What NOT to do
- Don't add backwards-compat shims for removed code — delete it
- Don't add comments explaining WHAT the code does — names should do that
- Don't create README.md unless explicitly requested or a new package
- Don't introduce new external deps without justification in PR description
