# Atlas Averbadora — PRD (Product Requirements Document)

**Versão:** 2026-07-14 · **Status:** Sistema em produção, iteração ativa
**Fonte da verdade:** este documento reflete o **código atual** em `main`. Complementa `.claude/CLAUDE.md` (regras de código/git) e `specs/openapi.yaml` (contrato API).

---

## 1. Visão

Plataforma digital de **averbação de crédito consignado público** que substitui averbadoras tradicionais integrando três lados do mercado:

- **Servidor municipal** — consulta margem, simula, contrata, acompanha e faz portabilidade pelo celular ou web, sem ir à agência.
- **Prefeitura** — mantém base de servidores, configura regras de convênio, recebe e concilia descontos em folha, sem operar planilhas manuais.
- **Banco parceiro** — consulta margem, aprova propostas, envia CCB, opera o ciclo de vida do contrato via portal ou API pública, sem depender de arquivo mensal.

A **Atlas Averbadora** (o produto) intermedeia todo esse fluxo com auditabilidade, LGPD, idempotência bancária e state-machine explícita — cobrando comissão do banco por operação viabilizada.

### 1.1 Objetivos de produto (2026)
1. **Tempo até crédito** — do "simular" à "liberação" em ≤ 72h.
2. **Zero divergência de folha** — reconciliação 3-bases (remessa × prefeitura × banco) no tombamento mensal, com alerta imediato ao operador.
3. **Custo bancário zero** — banco não paga integração; monetização vem da comissão sobre volume averbado.
4. **Multi-prefeitura por servidor** — respeitar acúmulo legal de cargos (mesmo CPF em N prefeituras) sem misturar histórico.
5. **Nada some** — soft-delete em todas as entidades, audit log append-only, versionamento de artefatos (CCB, termos, comunicados).

### 1.2 Não-objetivos
- Não emprestamos capital próprio (não somos IF).
- Não fazemos análise de crédito (banco decide aprovar).
- Não substituímos a folha da prefeitura — recebemos a folha e devolvemos a ADF.

---

## 2. Personas e escopo por perfil

### 2.1 Servidor municipal
- **Canais:** Expo mobile (iOS/Android — hoje ~20% funcional) e web (`app.atlas.io/servidor/*`).
- **Identidade:** CPF é identidade natural; matrícula é identidade empregatícia; um CPF pode ter N matrículas em N prefeituras. O front carrega uma matrícula ativa (`MatriculaSwitcher`) e filtra todas as queries por ela.
- **Fluxos:** primeiro-acesso → dashboard → simular (empréstimo, cartão consignado, cartão benefício, portabilidade) → aceitar termo → acompanhar em `/servidor/contratos` → receber notificações in-app e por e-mail.
- **Auto-serviço:** editar contato (com código por e-mail, se a prefeitura permitir), redefinir senha (com senha atual + código), ativar 2FA TOTP.

### 2.2 Prefeitura
- **Canal:** web (`app.atlas.io/prefeitura/*`).
- **Papéis internos (soft-delete):** RH, financeiro, gestor — cada operador é um "perfil" com 2FA TOTP self-service.
- **Fluxos:** importar CSV de servidores (write-through Postgres, retorna `persistFailures`), abrir/fechar competência de folha mensal (movimentações admissão/demissão/aposentadoria/promoção/alteração), configurar convênios (prazos, taxas, vínculos aceitos, formato de importação), receber ADF mensal em `/prefeitura/adf` (read-only — a averbadora aplica em folha), aceitar termo LGPD versionado.
- **Delimitação dura:** prefeitura **não cria convênio** (isso é da averbadora), **não confirma ADF** (backend existe mas UI foi removida — "só recebe"), **não publica comunicados** (só consome).

### 2.3 Banco parceiro
- **Canais:** portal web (`banco.atlas.io/banco/*`) e API pública HTTP (`api.atlas.io/v1/external/banco/*`).
- **Isolamento:** JWT + Bearer API-token carregam `banco_id`; toda leitura/escrita de contrato/CCB/tabela/usuário é filtrada por `banco_id`.
- **Fluxos:** login (com 2FA opcional), consultar margem por CPF/matrícula (só de servidores que já contactaram este banco), criar reserva/proposta, anexar CCB, aprovar, receber webhook HMAC de eventos, operar contratos vigentes (`suspender / quitar / alongar / alterar / cancelar`), conciliar bate-carteira mensal.
- **Marketing:** criar ofertas segmentadas (`ofertas` — taxa, valor, parcelas, filtros por convênio/vínculo/idade/salário) que viram cards no dashboard do servidor.

### 2.4 Averbadora (Atlas)
- **Canal:** web (`admin.atlas.io/averbadora/*`).
- **Sub-perfis:** `supervisor` (root), `operador`, `comercial`, `financeiro`, `auditoria` — cada tela do painel checa `podeAcessar()`.
- **Responsabilidade única:** é a **fonte da verdade** do sistema. Cadastra bancos, prefeituras, convênios. Executa o tombamento com reconciliação 3-bases. Aplica ADF em folha. Publica comunicados. Edita templates de e-mail que disparam automaticamente nos eventos. Gera API tokens e webhooks. Nunca hard-deleta nada (exceto reseed explícito com frase de confirmação).

---

## 3. Domínio (conceitos e regras)

### 3.1 Glossário canônico
| Termo | Significado |
|---|---|
| **Margem consignável** | 35% do salário líquido — bucket EMPRESTIMO. |
| **Margem cartão consignado** | 5% — bucket CARTAO_CONSIGNADO. |
| **Margem cartão benefício** | 5% — bucket CARTAO_BENEFICIOS. |
| **Simulação** | Cálculo não-vinculante de parcela/CET (client + server). |
| **Proposta / Reserva** | Bloqueio de margem por 48h (novo empréstimo) ou 7 dias úteis (portabilidade/refin). |
| **Averbação** | Registro do desconto na folha da prefeitura — feito pela averbadora, refletido em `folhaStatus`. |
| **ADF** | Autorização de Desconto em Folha — lote mensal enviado à prefeitura. |
| **Portabilidade** | Transferência de contrato do banco A para banco B (regulada BACEN). |
| **CET** | Custo Efetivo Total mensal — obrigatório mostrar em toda oferta. |
| **CCB** | Cédula de Crédito Bancário — PDF assinado, obrigatório antes de aprovar (se convênio exigir). |

### 3.2 State machine — Proposta / Contrato
Situações canônicas em `apps/api/src/modules/portal-banco/store.ts:aplicarAcao`:

```
Reserva criada  ──> "Aguardando Confirmação do Deferimento"  (bloqueia margem, 48h)
                    │
                    ├─ aprovar (banco) ──> "Aprovado"        (CCB obrigatório se convênio.exigeCcb)
                    │                       │
                    │                       └─ averbadora aplica ADF ──> "Ativo"
                    │
                    ├─ cancelar (banco) ──> "Cancelado"       (libera margem)
                    ├─ expira 48h        ──> "Expirado"       (libera margem)
                    └─ (contrato ativo)
                          ├─ suspender ──> "Suspenso"        (margem segue reservada)
                          ├─ quitar    ──> "Quitado"         (libera margem)
                          ├─ alongar   ──> (soma parcelas, mesmo estado)
                          └─ alterar   ──> (patch obs/verba, mesmo estado)
```

`comprometeMargem(situacao)` = `true` para `aguard | aprov | ativo | averb | suspens | formaliz`; `false` para `expirado | cancelado | quitado | recus | reprov | rejeit | negad | estorn`.

> **Regra explícita do cliente:** a margem bloqueia **já na proposta** ("aguardando…") — para impedir 2 propostas sobrepondo a mesma margem. Reversão da regra antiga que só bloqueava na aprovação do banco.

### 3.3 Status paralelo — Folha (`folhaStatus`)
Gravado pela averbadora ao aplicar ADF em folha. Independente da situação do contrato.

```
recebida → aplicada       (averbadora POST /admin/adf/confirmar)
recebida → falha  (motivo) (averbadora POST /admin/adf/falha)
```

Banco lê como "Aguardando folha / Aplicada em folha / Falha na folha".

### 3.4 Estados de folha (prefeitura)
```
aberta ↔ fechada    (transições pela prefeitura)
fechada → consolidada  (só a averbadora)
```

### 3.5 Identidade multi-prefeitura
- Unicidade de servidor = **(prefeituraId, matricula)**, nunca só CPF.
- Import da prefeitura padroniza CPF via `padStart(11, "0")` (Excel perde zero à esquerda).
- Matrícula é única globalmente (mudança de matrícula não pode colidir).

---

## 4. Feature-set por perfil

### 4.1 Servidor (web + mobile)

| Tela | Rota | Estado |
|---|---|---|
| Login universal (CPF ou e-mail) | `/login` | ✅ |
| Primeiro acesso (4 passos) | `/primeiro-acesso` | ✅ |
| Esqueci senha (universal, detecta perfil) | `/esqueci-senha` | ✅ |
| Seletor de matrícula | `/servidor/selecionar-matricula` | ✅ |
| Dashboard (3 cards de margem + comunicados) | `/servidor/dashboard` | ✅ |
| Marketplace + portabilidade (hub) | `/servidor/marketplace/portabilidade` | ✅ |
| Simulador dedicado por produto | `/servidor/simular?produto=...` | ✅ |
| Solicitar cartão | `/servidor/solicitar-cartao` | ✅ |
| Termo pré-proposta | `/servidor/termo?tipo=...` | ✅ |
| Contratos (Ativos + Histórico) | `/servidor/contratos` | ✅ |
| Portabilidade (seletor de contratos elegíveis) | `/servidor/portabilidade` | ✅ |
| Benefícios (parceiros, filtro por categoria) | `/servidor/beneficios` | ✅ |
| Saúde / Telemedicina | `/servidor/saude` | ✅ |
| Minha margem (detalhe 3 buckets) | `/servidor/minha-margem` | ✅ |
| Conta (contato, senha, 2FA, tema) | `/servidor/conta` | ✅ |

**Mobile Expo:** login + home (margem real) + conta (tema/logout). Propostas/Contratos/Ofertas = placeholders — próximo alvo de portabilidade das telas web.

**Regras visíveis:**
- Valor máximo do empréstimo derivado da margem: `maxValor = margem × (1 - (1+i)^-n) / i` (não teto artificial).
- Prazo máximo do dropdown = **menor** `prazoMaxMeses` entre as tabelas ativas do convênio (conservador — se banco reduz, some do dropdown em ≤3s de poll).
- 422 `margem_insuficiente` se `parcela > margem disponível + R$ 0,01`.
- 422 se cartão sem margem (`≤ 0` no bucket).
- CCB só do próprio CPF (bloqueia se matrícula não pertence).

### 4.2 Prefeitura

| Tela | Função |
|---|---|
| Dashboard | KPIs: ativos, descontos do mês, contratos averbados, folhas abertas, pendências (anuência, servidores sem convênio) |
| Servidores | DataTable + busca + importar CSV (write-through com relatório de falhas) + edit modal |
| Folhas | Abrir competência, importar CSV de movimentação (admissão/demissão/aposentadoria/promoção/alteração), fechar |
| Convênios | Configurar exigências (`exigeCcb`, `exigeBanco2FA`, `permiteServidorEditarContato`) e regras (prazo trava, prazo portabilidade DU, max %, vínculos aceitos, formato de importação, vigência) |
| Contratos averbados | Read-only |
| Tombamento | Import mensal com reconciliação 3-bases; linhas `ok/divergente/novo` com `detalheReconciliacao` |
| ADF — Descontos em folha | Read-only (a averbadora aplica em folha). Chips de competência, download CSV/PDF, coluna Parcela mostra `R$ 151,69 × 60x` |
| Relatórios | Vínculo, margem média, contratos por banco, inconsistências |
| Anuência LGPD | Termo versionado (`v1-2026-07`), aceite com IP registrado |
| Perfis | CRUD de operadores (RH/financeiro/gestor) com 2FA TOTP; soft-delete |
| Comunicados | Feed remapeado da averbadora |
| Materiais | 4 PDFs client-side (cartilha, banner, e-mail modelo, checklist LGPD) |
| Conta | 2FA do operador |

**Delimitação dura:** convênio novo é criado pela averbadora, não pela prefeitura. Perfis nunca são apagados — apenas desativados.

### 4.3 Banco parceiro

| Tela | Função |
|---|---|
| Visão geral | KPIs (carteira, novos no mês, pendências), busca-rápida CPF/matrícula, dataCorte navegável |
| Propostas | Fila filtrada por produto (empréstimo, cartão, portabilidade) + tabs (todas/aguardando/aprovadas/recusadas), countdown 48h, poll 5s |
| Propostas / detalhe | Aprovar (exige CCB anexo), recusar (com motivo), gerar comprovante |
| Ofertas | CRUD de ofertas para marketplace do servidor (taxa, valor, parcelas, filtros por convênio/vínculo/idade/salário) — pausar/reativar |
| Cadastros / Tabelas de empréstimo | Convênio, taxa min/max a.m., prazo máx (12/24/36/48/60/72/96/120) — soft-delete |
| Cadastros / Usuários | Perfis (admin/operador/consulta/relatórios) com IPs permitidos; CPF revelado só via `reveal-cpf` (audit LGPD) |
| Margem / Contratação (busca) | Busca por CPF ou matrícula (só de servidores que já contactaram) |
| Margem / Ficha | 3 buckets + projeção 4 meses + `OperacaoForm` (nova reserva/averbação com valor/parcelas/taxa/carência) |
| Carteira | Meus contratos vigentes, `folhaStatus` visível |
| Bate-carteira | Conciliação mensal banco × folha, export CSV |
| Convênios | Read-only — cards com badges "CCB obrigatória" / "2FA na averbação" herdadas da prefeitura |
| Relatórios | Consignações, gerador (colunas customizáveis + CSV), faturamento por competência |
| Conta | 2FA TOTP |

**API pública** (`/v1/external/banco/*` — Bearer `atl_*`, audience `banco`): `me`, `convenios`, `margem`, `contratos`, `contratos/:adf`, `contratos/averbar`, `contratos/:adf/acao`, `webhooks`.

**Regras críticas:**
- Isolamento por `bancoId` em todos os endpoints (comentário no código: "antes qualquer banco lia contrato de outro adivinhando o ADF").
- CCB obrigatório antes de `aprovar` (422 hard).
- CCB nunca hard-delete — substituição arquiva em `ccbHistorico`.
- Convênio sentinela `__sem_convenio__` para banco sem convênio próprio.
- Webhook: HMAC-SHA256(`secret`, body), retry 3x para timeout/5xx, 4xx não retenta.

### 4.4 Averbadora (Atlas)

| Tela | Função |
|---|---|
| Dashboard | KPIs consolidados (propostas hoje, conversão, top bancos/prefeituras, margem travada) |
| Bancos | CRUD, teste de conexão, reset-password, adapter sandbox/ifractal, mTLS flag |
| Prefeituras | CRUD, sincronização (CSV/MANUAL implementados; REST/SOAP pendentes), reset-password |
| Convênios | CRUD + config avançada por convênio |
| Servidores | Lista global + import CSV com IA-normalização opcional. Total + paginação (25/50/100/200) |
| Folhas | Consolidar competência |
| Pré-reservas | Derivadas de contratos, sweep de expiradas |
| Tombamento | Import mensal + reconciliação 3-bases + persistência jsonb do lote |
| ID único | Config por prefeitura (prefixo A-Za-z 2..5, formato `SEQ / SEQ_HASH / YYYYMM_SEQ`) |
| Bate-carteira | Conciliação global |
| ADF (global) | Visão global + confirmar/reportar falha → dispara e-mail template `simulacao/averbada` |
| Auditoria | Trilha filtrável por categoria/CPF/matrícula/propostaId/período |
| Perfis | CRUD de sub-usuários com 2FA TOTP |
| Comunicados | Publicar cards que aparecem em banco/servidor; drag-and-drop de reorder |
| **E-mails do sistema** | 5 submenus (primeiro_acesso, recuperar_senha, redefinir_senha, simulacao, beneficios) — editor com preview de variáveis realistas + envio de teste SMTP real |
| Health | Uptime/p95 |
| Logs | Log operacional PT-BR (buffer memória + `app_logs` compartilhada) |
| Vitrine | Banners de bancos (impressões, cliques, receita) |
| Benefícios | CRUD rico (saúde/alimentação/educação/lazer/telemedicina) + cascade template de e-mail |
| Telemedicina | Categoria específica |
| API / Docs / Tokens / Webhooks | OpenAPI, `atl_*` tokens (soft "desativar", nunca revogar hard), webhooks |
| Configurações | Chave OpenAI + config SMTP |
| Permissões | Matriz visual de sub-perfis vs telas |
| Conta | 2FA TOTP |

---

## 5. Arquitetura

### 5.1 Stack real
| Camada | Tech |
|---|---|
| API | Cloudflare Workers + Hono, compat `nodejs_compat`, `compatibility_date=2025-06-01` |
| Postgres | Self-hosted VPS Hetzner (Portainer) — **não é Neon** (README está desatualizado; `wrangler.toml`/`DEPLOY.md` são a verdade) |
| Pool | Cloudflare Hyperdrive (binding `HYPERDRIVE`) |
| ORM | Drizzle (`drizzle-orm/postgres-js`) |
| KV | 3 namespaces: `KV_CACHE`, `KV_SESSIONS`, `KV_RATELIMIT` |
| Objeto | R2 bucket `atlas-files` |
| Web | Vite + React 18 + React Router 6 + TanStack Query |
| Mobile | Expo SDK 51+ + Expo Router |
| Design system | `@atlas/ui/web` + `@atlas/ui/rn` |
| SDK cliente | `@atlas/sdk` (TS estrito) |
| Auth | JWT RS256 (15 min) + refresh rotativo (30d) em KV |
| E-mail | SMTP via `cloudflare:sockets` (STARTTLS/TLS, AUTH LOGIN, dot-stuffing) |
| IA | OpenAI `gpt-4o-mini` para normalizar CSV importado |
| Deploy API | Workers custom domain `api.atlas.io` |
| Deploy Web | Cloudflare Pages projeto `atlas-web` (conta **perfectdesigner**) |

### 5.2 Monorepo
```
apps/          api · web · mobile
packages/      domain · sdk · types · ui · config-eslint · config-tsconfig
mcp-servers/   atlas-bank-sandbox · atlas-design-system · atlas-domain
specs/         openapi.yaml · domain/ · adrs/ · security/ · PRD.md (este)
```

### 5.3 Módulos backend (`apps/api/src/modules/*`)
- `auth/` — login unificado, refresh, primeiro-acesso, esqueci-senha (CPF/e-mail/universal), 2FA (email + TOTP)
- `me/` — self-service de qualquer role
- `health/` — `/healthz`, `/readyz` (checa KV + `SELECT 1`)
- `servidores/` — app do servidor (margem, propostas, cartões, contratos, benefícios, conta)
- `portal-banco/` — portal do banco (fluxo completo, isolamento por bancoId)
- `prefeitura/` — portal da prefeitura (folhas, movimentação, ADF read, tombamento, anuência)
- `admin/` — averbadora (todo o painel + sub-módulos ai, api-tokens, auditoria, bate-carteira, email-templates, id-unico, mailer, perfis, pre-reservas, smtp, tombamento, webhooks)
- `external/` — API pública v1 (Bearer `atl_*`) para banco, servidor e averbadora
- `confirmacao/` — step-up compartilhado

### 5.4 Persistência
**Postgres** (Drizzle + `ensureSchema` cria colunas jsonb em runtime):
- `users`, `prefeituras`, `servidores`, `bancos`, `propostas`, `proposta_eventos` (com `idempotency_key`), `consentimentos`, `convenios`, `convenio_tabelas_emprestimo`, `comunicados`, `folhas`, `banco_usuarios`, `contratos`, `contrato_eventos`.
- Coleções jsonb genéricas (via `loadCollection/upsertCollectionRow`): `portal_banco_tabelas`, `portal_banco_contratos`, `tombamento_lotes`, `app_logs`, vitrine, perfis, servidor_status, benefícios, email-templates, api-tokens overlays.
- **Padrão write-through:** hidrata do PG uma vez por isolate → mantém em memória → escreve no PG a cada mutação (best-effort, não quebra request).

**KV_CACHE:** chave OpenAI, config SMTP, API tokens (`apitok:i:*` / `apitok:h:*`), webhooks, códigos únicos.
**KV_SESSIONS:** `rt:*` (refresh 30d), `mfa:*` (5min), `confirm:*` (10min), `pa:*` (primeiro acesso 10min), `rs:*` (reset senha 10min).
**KV_RATELIMIT:** rate-limit global 600 req/60s.
**R2:** CCBs (com `ccbHistorico` LGPD), logos, banners, PDFs.

### 5.5 Segurança
- **JWT RS256** com `JWT_PRIVATE_KEY` (secret Wrangler) + `JWT_PUBLIC_KEY` para verificação.
- **Isolamento por bancoId/prefeituraId** em toda leitura/escrita — validado por request, não confia no client.
- **Zod na boundary** — request bodies, query, env vars, configs externas.
- **PII em logs mascarada** — helper `maskPII()`; CPF/RG/nome/salário nunca em log de aplicação.
- **HMAC de webhook** — `X-Atlas-Signature: sha256=<hex>`, corpo `{id,event,environment,webhook_id,created_at,data}`, retry 3x.
- **Idempotency-Key** — header aceito no CORS + coluna existente; **enforcement pendente** nas rotas externas.
- **API tokens** — Bearer `atl_*` com SHA-256 em KV, audience `banco|servidor|averbadora`, scopes namespaced. Cascade: banco pausado → tokens/webhooks pausam automaticamente.
- **Soft-delete universal** — bancos/prefeituras/convênios/servidores/perfis/tokens/webhooks/benefícios nunca são hard-deletados (exceto reseed com frase `APAGAR-TUDO-E-RESEMEAR`).

### 5.6 Observabilidade
- **Logs:** buffer memória por isolate (cap 400) + persistência compartilhada em `app_logs` via `waitUntil`. Traduzido para PT-BR na leitura em `/averbadora/logs`.
- **Auditoria estruturada** em `auditoria.ts` com categorias (`margem`, `tombamento`, `id_unico`, `convenio_config`, `acesso`, `beneficios`).
- **Trace ID:** `_shared/trace.ts` propaga `trace_id` em logs.
- **Sentry:** `SENTRY_DSN` previsto, `Sentry.init` ainda não wired.

---

## 6. Fluxos ponta-a-ponta

### 6.1 Servidor solicita empréstimo → averbação → liberação
```
Servidor (dashboard)
  → simula em /servidor/simular (client + POST /me/propostas/simular)
  → aceita termo em /servidor/termo (POST /me/propostas)
  → reserva criada: "Aguardando Confirmação do Deferimento" (48h)
  → e-mail simulacao/enviada → servidor + banco (template editável)
  → aparece em /servidor/contratos aba Ativos (poll 10s)
Banco (portal)
  → /banco/propostas → detalhe → anexa CCB (POST /portal/banco/ccb/upload)
  → aprovar (POST /portal/banco/contratos/:adf/aprovar → "Aprovado")
  → e-mail simulacao/aprovada → servidor + banco
Averbadora
  → /averbadora/adf → confirmar (POST /admin/adf/confirmar)
  → contrato vira "Ativo" + folhaStatus="aplicada"
  → e-mail simulacao/averbada → servidor
Prefeitura
  → recebe ADF em /prefeitura/adf (read-only, poll 10s)
  → coluna Parcela mostra "R$ 151,69 × 60x"
Banco
  → carteira mostra folhaStatus="Aplicada em folha"
  → libera valor ao servidor (fora do sistema)
```

### 6.2 Servidor faz portabilidade
```
Dashboard → atalho Portabilidade → /servidor/portabilidade
  → seleciona contratos elegíveis + banco destino
  → /servidor/termo?tipo=portabilidade
  → POST /me/propostas (contrato tipo REFIN)
  → "Aguardando Confirmação do Deferimento" (trava 7 dias úteis)
  → Banco origem forneceu saldo devedor (via API pública ou entrada manual)
  → Banco destino aprova + averbadora aplica ADF
  → e-mail simulacao/enviada|aprovada|averbada (simulacaoTipo=portabilidade)
```

### 6.3 Prefeitura importa base + tombamento
```
/prefeitura/servidores → Importar CSV
  → POST /prefeitura/servidores/importar (write-through PG)
  → retorna {inserted, updated, persistFailures[]}
/prefeitura/tombamento → escolhe competência → sobe CSV mensal
  → reconciliação 3-bases (remessa × servidores × contratos do banco)
  → linhas: ok / divergente / novo
  → lote persistido em tombamento_lotes (jsonb)
  → averbadora vê em /averbadora/tombamento → resolve divergências
```

### 6.4 Averbadora aplica ADF do mês
```
/averbadora/adf → seleciona competência → confirma lote
  → POST /admin/adf/confirmar (aplicadas: N)
  → cada contrato "Aprovado" → "Ativo" com folhaStatus="aplicada"
  → dispatch de e-mail template simulacao/averbada por servidor
  → prefeitura vê badge APLICADA no /prefeitura/adf
Falhas: /averbadora/adf → reportar falha (motivo)
  → POST /admin/adf/falha
  → folhaStatus="falha" + folhaMotivo
  → banco vê "Falha na folha" na carteira
```

### 6.5 E-mails automáticos em tempo real
Todos os eventos disparam via `dispatchTemplateEmail` (tenta template editável no consultor da averbadora → fallback hardcoded).

| Evento | Template (evento/publico/tipo/status) | Disparado por |
|---|---|---|
| Primeiro acesso — código | `primeiro_acesso/servidor` | POST `/auth/primeiro-acesso/codigo` |
| Esqueci senha — código | `recuperar_senha/<perfil>` | POST `/auth/esqueci-senha/*` |
| Simulação criada (servidor) | `simulacao/servidor/<tipo>/enviada` | POST `/me/propostas` + `/me/cartoes` |
| Simulação criada (banco) | `simulacao/banco/<tipo>/enviada` | idem, alvo é o banco |
| Proposta aprovada | `simulacao/servidor/<tipo>/aprovada` | POST `/portal/banco/contratos/:adf/aprovar` |
| Proposta recusada | `simulacao/servidor/<tipo>/recusada` | POST `.../cancelar` |
| Contrato averbado | `simulacao/servidor/<tipo>/averbada` | POST `/admin/adf/confirmar` |
| Novo benefício | `beneficio` (cascade) | POST `/admin/beneficios` |

---

## 7. Roadmap e itens em aberto

### 7.1 Backlog priorizado (do plano "12 ajustes")
Referência: `.claude/plans/buzzing-wondering-pearl.md`.

1. **WP0 — Persistência de servidores/tombamento no PG (write-through)** — pré-requisito das próximas.
2. **WP1** — Simulação com valor livre desde que parcela caiba na margem. ✅ (fórmula Price invertida na UI)
3. **WP2** — Multi-prefeitura por CPF (dedup por `cpf+prefeituraId`). ✅
4. **WP3** — Banco não cria convênio (remover modal do banco). ✅
5. **WP4** — Banco não vê base da prefeitura (só busca CPF/matrícula específica). ✅
6. **WP5** — Remover "Gerenciador de Contratos" do banco. ✅
7. **WP6** — 2FA email-only (simplificar `TwoFactorModal`).
8. **WP7** — CCB e 2FA da averbação condicionais à prefeitura (2 toggles + herança via config).
9. **WP8** — Nunca excluir, sempre desativar (9 pontos: banco, prefeitura, convênio, usuário averbadora/banco, tabela empréstimo, perfil prefeitura, token, webhook).
10. **WP9** — Tombamento com notificação de divergência para a averbadora.

### 7.2 Riscos e dívida técnica identificada no código
- **Password hash SHA-256 sem salt** → migrar para Argon2/bcrypt.
- **DEV_USERS ativos em produção** → gate por env.
- **Idempotency-Key não é consumido** nas rotas externas (coluna existe, enforcement pendente).
- **Adapters REST/SOAP de prefeitura** não implementados (só CSV/MANUAL).
- **Código de step-up hardcoded `000000`** em `admin/confirmacao/solicitar` (marcado como DEMONSTRACAO).
- **mTLS** só flag, sem enforcement TLS mútuo.
- **Certificado SSL do Postgres self-signed** (rotacionar para Let's Encrypt).
- **JWT keys** geradas com openssl local, sem rotação automática nem KMS.
- **README** menciona Neon; a verdade operacional é Postgres self-hosted em Hetzner via Portainer + Hyperdrive.

### 7.3 Regras de coordenação de deploy (produção)
- **Cloudflare Pages `atlas-web` NÃO tem git auto-deploy** — cada `wrangler pages deploy` sobrescreve o alias.
- Sequência obrigatória: `git fetch origin main` → build SDK → build web → deploy → conferir bundle `curl atlas-web-6ef.pages.dev | grep index-*.js`.
- Token de deploy do Pages: conta **perfectdesigner** (Cloudflare account `69da4696…`) — no `env` do repo.
- Rebuild do HEAD sempre — deploy de HEAD atrasado sobrescreve trabalho do colega (já aconteceu 2x em 2026-07-03).

### 7.4 Regras de git (todo commit)
- `git fetch origin main` **imediatamente antes de cada push**.
- Push só se `HEAD..origin/main == 0` (ahead-only). Se `> 0`: parar e perguntar antes de rebase.
- Nunca `--force`, `--force-with-lease`, `git reset --hard`, `git rebase` sem autorização.
- Conventional Commits com escopo de pacote: `feat(api):`, `fix(web):`, `chore(ui):`, `docs(specs):`.

---

## 8. Métricas de sucesso (a instrumentar)

| Métrica | Alvo | Fonte |
|---|---|---|
| Tempo simulação → averbação | ≤ 72h p50 | `app_logs` + eventos |
| Taxa de conversão simulação → proposta | ≥ 30% | dashboard averbadora |
| Taxa de aprovação banco | ≥ 60% | idem |
| Divergências / lote de tombamento | ≤ 2% linhas | `tombamento_lotes.divergencias` |
| Uptime API (p99) | ≥ 99.9% | `/readyz` + monitor externo |
| Latência p95 API | ≤ 400ms | `_shared/trace.ts` |
| Entrega e-mail transacional | ≥ 98% | SMTP logs |
| Segundos entre evento → e-mail | ≤ 5s | dispatch é `waitUntil` |

---

## 9. Referências

- `.claude/CLAUDE.md` — regras de código, git, deploy, tokens
- `specs/openapi.yaml` — contrato de API (fonte da verdade)
- `specs/domain/state-machines.md` — máquinas de estado formais
- `specs/adrs/` — decisões arquiteturais (stack, monorepo, RBAC, integração bancária, Postgres, banco UX, concorrentes)
- `specs/security/` — modelo LGPD/OWASP
- `integracao_exemplo/Rotas Banco 1/` — BPMNs da API iFractal real
- `mcp-servers/atlas-domain` — glossário e regras de negócio consultáveis
- `mcp-servers/atlas-bank-sandbox` — mock da API bancária
- `mcp-servers/atlas-design-system` — tokens e componentes

---

**Mudanças recentes relevantes:**
- 2026-07-14 — Dispatch automático de e-mails via templates editáveis em todos os eventos (primeiro-acesso, recuperar-senha, simulação criada, aprovada, recusada, averbada).
- 2026-07-14 — Total de servidores + paginação (25/50/100/200) em `/averbadora/servidores`.
- 2026-07-14 — Coluna "Parcela" da ADF prefeitura mostra `R$ 151,69 × 60x`.
- 2026-07-14 — Form de editar/criar benefício ocupa largura total (sem `maxWidth`).
- 2026-07-03 — Token API vira "Desativar/Reativar" (sem hard-delete).
- Regra reafirmada — margem bloqueia **já na proposta em análise**, não só após aprovação do banco.
