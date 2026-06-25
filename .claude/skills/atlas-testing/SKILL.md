---
name: atlas-testing
description: Use when writing or editing tests in any Atlas package or app. Defines the layered testing strategy — Vitest for unit, OpenAPI snapshot for contract, Playwright for web e2e, Maestro for mobile e2e — and what belongs in each layer.
---

# Atlas — Testing Strategy

Three layers, each with a clear purpose. **Don't mix layers** — a unit test that needs the network is wrong; an e2e test that mocks everything is also wrong.

## 1. Unit (Vitest)

**Where:** alongside source, `*.test.ts` or in `tests/` folder mirroring `src/`.
**What:** pure functions, value objects, state machines, validators, formatters.
**Speed budget:** < 5s for entire suite per package.

```ts
// packages/domain/src/cet.test.ts
import { describe, it, expect } from "vitest";
import { calcCET } from "./cet";

describe("calcCET", () => {
  it("returns 1.79% a.m. for valor=8500 parcelas=36 taxa=1.59 iof=1.5%", () => {
    const cet = calcCET({ valor: 8500, parcelas: 36, taxaMensal: 0.0159, iof: 0.015 });
    expect(cet.mensal).toBeCloseTo(0.0179, 4);
  });
});
```

**Rules:**
- No mocks unless testing an interface boundary.
- No DB, no HTTP, no FS.
- Each `it()` runs in < 50ms.

## 2. Contract (OpenAPI snapshot + Pact-like)

**Where:** `apps/api/tests/contract/`, `packages/sdk/tests/contract/`.
**What:** verify that API responses match the schemas in `specs/openapi.yaml`; verify that bank adapters consume real (or sandbox-recorded) bank responses correctly.

### API contract
```ts
// apps/api/tests/contract/servidores.spec.ts
import { describe, it, expect } from "vitest";
import { validateResponse } from "./openapi-validator"; // helper that loads specs/openapi.yaml
import { app } from "../../src/index";

describe("GET /v1/servidores/me/margem-consignavel", () => {
  it("matches OpenAPI schema for 200 response", async () => {
    const res = await app.request("/v1/servidores/me/margem-consignavel", {
      headers: { Authorization: `Bearer ${testToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(validateResponse("/v1/servidores/{id}/margem-consignavel", "GET", 200, body)).toEqual([]);
  });
});
```

### Bank adapter contract
Replay recorded sandbox responses against the adapter; assert the adapter normalizes them to the canonical `Margem`/`Matricula` types.

## 3. E2E

### Web — Playwright (`apps/web/e2e/`)
Smoke flows per persona:
- **Servidor:** login → dashboard → see margem card with value
- **Banco:** login → portal → propostas list loads
- **Averbadora:** login → dashboard → KPI cards render

```ts
test("servidor sees margem after login", async ({ page }) => {
  await page.goto("/login");
  await page.fill("input[name=identifier]", "00011122233");
  await page.fill("input[name=password]", "teste");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/servidor\/dashboard/);
  await expect(page.getByTestId("margem-disponivel")).toContainText("R$");
});
```

### Mobile — Maestro (`apps/mobile/.maestro/`)
YAML flows:
```yaml
appId: io.atlas.servidor
---
- launchApp
- tapOn: "Entrar com CPF"
- inputText: "00011122233"
- tapOn: "Continuar"
- inputText: "teste"
- tapOn: "Entrar"
- assertVisible: "Margem disponível"
```

## What to test where

| Concern | Layer |
|---|---|
| Pure calculation (CET, margem) | Unit |
| Zod schema validation | Unit |
| State machine transitions | Unit |
| Auth middleware logic | Unit (mock JWT) |
| Full request → DB → response | Contract (against test DB) |
| API response shape | Contract (OpenAPI) |
| Bank adapter normalization | Contract (replay) |
| Login + navigate to dashboard | E2E |
| Form submission with validation | E2E |
| Visual regression | Manual / screenshot snapshot |

## Test data
- **Deterministic seed.** Use the same seed as `atlas-bank-sandbox` MCP (`SEED=42`) so unit/contract/e2e share fixtures.
- **Test users (created on seed):**
  - Servidor: CPF `000.111.222-33` / pwd `teste`
  - Banco: email `banco@atlas.test` / pwd `teste`
  - Averbadora: email `admin@atlas.test` / pwd `teste`
- **Never use real PII** even in fixtures.

## CI gates
- `pnpm -r test` (unit) must pass on every PR.
- Contract tests run on every PR touching `apps/api` or `specs/openapi.yaml`.
- E2E runs on PRs touching `apps/web` or `apps/mobile` (mobile via macOS runner with simulator).
- Coverage thresholds per package in `vitest.config.ts` — start at 70% lines, raise quarterly.

## Forbidden
- `expect(true).toBe(true)` placeholders
- `it.skip` without a JIRA ticket
- Snapshots > 200 lines (extract to fixture file)
- Hitting real bank sandboxes in CI (use `atlas-bank-sandbox` MCP)
- Time-of-day-dependent assertions (mock `Date.now()`)
