# ADR-0002: Monorepo com pnpm workspaces + Turborepo

- **Status:** Aceito
- **Data:** 2026-06-22

## Contexto

Temos 3 apps (api, web, mobile) que compartilham tipos, design-system, SDK e regras de dominio. Mantemos isolamento de deploy, mas compartilhamento real de codigo.

## Decisao

- **pnpm workspaces** para resolucao de dependencias com hardlinks (rapido, sem duplicacao em disco).
- **Turborepo** para orquestrar `build`/`dev`/`lint`/`typecheck`/`test` com cache local e (futuramente) remoto.
- **packages/** publicaveis internamente: `@atlas/ui`, `@atlas/sdk`, `@atlas/types`, `@atlas/domain`, `@atlas/config-*`.
- **apps/** consomem packages via `workspace:*`.

## Alternativas

1. **Nx** — mais features mas curva mais alta; preferimos simplicidade.
2. **Polyrepo** (4 repos) — sincronizar tipos exige publicacao em registry e versionamento, custo > beneficio nesta fase.
3. **Lerna** — projeto desacelerado, sem motivos para nao usar Turbo.

## Consequencias

- DX: 1 `pnpm install` na raiz instala tudo
- CI: pipelines compartilham cache
- Refactor cross-package: typecheck pega quebras imediatamente
- Onboarding: dev clona 1 repo

## Convencoes

- Nome do package === pasta. `packages/ui` → `@atlas/ui`.
- `workspace:*` para deps internas (rewrite na publicacao se aplicavel).
- `engines.node >= 20`, `pnpm >= 9`.
