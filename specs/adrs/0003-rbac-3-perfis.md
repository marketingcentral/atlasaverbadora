# ADR-0003: RBAC com 3 perfis no web e mobile servidor-only

- **Status:** Aceito
- **Data:** 2026-06-22

## Contexto

Tres personas operam o sistema com necessidades muito diferentes. O mobile deve focar exclusivamente no servidor (publico final, alta escala). O web e a interface profissional para os 3 perfis.

## Decisao

### Mobile (iOS + Android) — apenas perfil `servidor`
- App publico nas lojas (TestFlight + Play Console)
- Login com CPF + senha + biometria opcional
- Telas: Home (margem) · Simular · Propostas · Contratos · Ofertas · Conta
- Tema dark/light/system

### Web — login unico, 3 perfis
- 1 dominio (`app.atlas.io`) com 3 areas: `/servidor/*`, `/banco/*`, `/averbadora/*`
- Identificador no login determina o perfil:
  - CPF puro → tentativa como `servidor`
  - Email com `@atlas.io` → `averbadora`
  - Email com `@banco-*.com` → `banco` (validado contra `bancos.dominios_email`)
- Apos login: redirect para `/{role}/dashboard`
- RBAC enforced no middleware da API (claim `role` no JWT)
- Defense in depth: route guards no router + resource-level checks no handler

### Areas web por perfil
| Perfil | Acessa |
|---|---|
| servidor | Apenas espelho do mobile (utilidade: ver no desktop) |
| banco | Portal: produtos, propostas recebidas, webhooks, SLAs, sandbox |
| averbadora | Tudo: dashboard, bancos, prefeituras, servidores, health, logs, vitrine |

## Alternativas

1. **3 dominios separados** (`app.`, `banco.`, `admin.`) — mais isolado mas duplica build/deploy/sessao. Considerado fase 2.
2. **2 apps mobile** (servidor + banco) — sobre-engenharia; banco usa web suficiente.

## Consequencias

- Build unico web (mesmo bundle), code-split por rota
- Sessao unica e logout invalida todas as areas
- Banco e averbadora podem ser temporariamente promovidos a outro papel via `acting_as` (futuro)
- Mobile mantem-se enxuto e focado
