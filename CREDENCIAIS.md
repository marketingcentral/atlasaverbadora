# Atlas Averbadora — Credenciais de acesso

> **AVISO**: arquivo **gitignored** (não vai para o repositório). Senhas abaixo são de **demo/sandbox** e estão hardcoded no Worker (`apps/api/src/modules/auth/index.ts`, array `DEV_USERS`). **Antes de qualquer go-live real**, remover esse array e mover para a tabela `users` com hash Argon2.

---

## URLs

| Ambiente | URL |
|---|---|
| Web (login único — detecta perfil pelo identifier) | https://atlas-web-6ef.pages.dev |
| API | https://atlas-api.perfectdesigner.workers.dev |

---

## Contas

### 1. Servidor Municipal (perfil `servidor`)

App: web + mobile. Login por CPF.

| Campo | Conta A | Conta B |
|---|---|---|
| **Identificador** (CPF) | `00011122233` | `00011122234` |
| **Senha** | `teste123` | `teste123` |
| **Nome** | Ana Carolina Silva | João da Silva Neves |
| **servidor_id no JWT** | 1 | 2 |

Pode digitar o CPF formatado (`000.111.222-33`) — o backend normaliza.

Telas acessíveis: marketplace de ofertas, simular, propostas, contratos, conta.

---

### 2. Banco Parceiro (perfil `banco`)

Portal web. Login por email.

| Campo | Valor |
|---|---|
| **Identificador** (email) | `banco@atlas.test` |
| **Senha** | `teste123` |
| **Nome** | Operador Banco SCred |
| **banco_id no JWT** | 1 |

Telas acessíveis: visão geral, margem/contratação (6 operações: averbar/reservar × empréstimo/refin/composta/portabilidade), gerenciador de contratos (7 tabs + 6 ações + PDF), cadastros (tabela de empréstimos + usuários), 3 relatórios.

---

### 3. Averbadora (perfil `averbadora` — super-admin)

Painel web administrativo. Login por email.

| Campo | Valor |
|---|---|
| **Identificador** (email) | `admin@atlas.test` |
| **Senha** | `teste123` |
| **Nome** | Admin Atlas |

Telas acessíveis: dashboard, CRUD bancos, CRUD prefeituras, convênios, servidores, folhas, comunicados, health, logs em tempo real, vitrine de banners.

---

## Como o roteamento por perfil funciona

A tela de login (`/login`) é única. Após autenticar:
- CPF de 11 dígitos → tratado como `servidor` → redireciona para `/servidor/marketplace`
- Email com `banco` no domínio → `banco` → `/banco/visao-geral`
- Email com `admin`/`atlas` → `averbadora` → `/averbadora/dashboard`

O perfil real vem no `role` do JWT retornado pelo POST `/v1/auth/login`.

---

## Infraestrutura (referência rápida — NÃO COMPARTILHAR)

| Item | Valor |
|---|---|
| Postgres host | `65.109.134.78:5434` |
| Postgres database | `atlas_app` |
| Postgres role (app) | `atlas_app` |
| Postgres password (app) | `yTXxQ4bMNdJ0X5A46MZoPYo5` |
| Cloudflare account | `69da4696fddd180b641d9fd39b2c369d` (perfectdesigner@hotmail.com.br) |
| Worker name | `atlas-api` |
| Pages project | `atlas-web` |

---

## Próximos passos de segurança (urgente antes de uso real)

1. **Substituir `DEV_USERS` por tabela `users` real** com Argon2 — bloqueador para produção.
2. **Rotacionar todas as credenciais compartilhadas em chat:**
   - Token Cloudflare master → revogar + criar novo scoped
   - Senha SSH `root@65.109.134.78`
   - Senha do superuser `postgres` dentro do container
   - JWT RS256 keys (gerar par novo + rolling com `kid`)
3. **TLS no Postgres** + restringir porta 5434 ao range IP do Cloudflare Hyperdrive.
4. **Provisionar Hyperdrive** (precisa de token com permissão `Workers Hyperdrive:Edit`).
