# Atlas Averbadora — Estratégia de Testes

4 camadas complementares — não substitui nenhuma; cada uma pega um tipo diferente de regressão.

## Antes de qualquer commit multi-package

```bash
pnpm -r typecheck && pnpm --filter @atlas/domain test
```
~10s. Falhou = não commita. Cobre regras puras (calcCET, IOF, margem, deriveProdutoLabel, comprometeMargem, situacaoContaComoAverbado, nomeExibicaoBanco…) — se algum helper que já quebrou volta a divergir, para aqui.

## Antes de deploy (gate manual)

```bash
BASE_URL=http://localhost:8787 pnpm --filter @atlas/api test:e2e
```
~15s. Roda fluxo real proposta → banco aprova → averbadora ADF → prefeitura folha, valida em cada passo que `taxaAm`, `bancoNome`, `valorFinanciado` batem entre perfis. Precisa da API rodando local (`pnpm --filter @atlas/api dev`).

## Depois de cada deploy (visual, ~2min)

1. Abre https://atlas-web-6ef.pages.dev/averbadora/verify — tela nova.
2. Todos os 6 grupos (A-F) devem estar verdes.
3. Se algum ficar vermelho: expande o card, olha os exemplos concretos (ADF, banco, campo divergente). Cada grupo aponta a causa:
   - **A** — banco fantasma (Scred etc): contrato/oferta/convênio com `bancoId` inválido, ou banco recadastrado com nome da blacklist histórica.
   - **B** — taxa `179%` / `0.02%`: `taxaAm` fora do range esperado (contratos e tabelas: cru `[0,1]`; ofertas: percent `[0,20]`).
   - **C** — estados incoerentes: contrato `Cancelado` com `folhaStatus`, ou ADF órfã sem contrato.
   - **D** — colisão de `idUnico` na mesma prefeitura (indica `proximoSeq` do PG stale).
   - **E** — cross-profile amostral: contrato vivo que resolve pra `Banco {id}` (fallback ativou).
   - **F** — servidor sem vínculo, contrato apontando pra convênio deletado, oferta expirada ainda ativa.
4. Cache 20s no backend; botão "Rodar agora" força fresh.

## Antes de release grande (~20min manual)

Rodar em ambiente de prod (ou preview) com o browser aberto. Cronometrar.

### 5.1 Fluxo servidor (5min)

1. Login em https://atlas-web-6ef.pages.dev com CPF `00011122233` / `teste123`.
2. Dashboard: KPIs consistentes (nada tipo `NaN`, `R$ undefined`).
3. Aba "Simular" → escolher banco/produto → aceitar simulação → assinar termo.
4. Aba "Propostas": card recém-criado aparece com status `Em análise`, taxa `1.79%` (não 179%, não 0.02%).
5. Aba "Marketplace": ofertas ativas com taxa em `[0, 20]%` — nenhuma com valor absurdo tipo `0.02%` ou `1900%`.

### 5.2 Fluxo banco (5min)

1. Logout, login `banco@atlas.test` / `teste123`.
2. `/banco/carteira`: proposta da etapa 5.1 aparece. Cross-check: mesmo valor solicitado, mesma parcela, mesma taxa.
3. `/banco/propostas/<id>` (clicar na linha): página de detalhe mostra "Taxa a.m. 1.79%" (bug histórico: mostrava 179% quando lib fazia `*100` duas vezes).
4. Anexar CCB (PDF qualquer) → Aprovar. Modal confirmar.
5. Voltar à carteira: status virou `Aprovado`.

### 5.3 Fluxo averbadora (3min)

1. Login `admin@atlas.test` / `teste123`.
2. **`/averbadora/verify`**: todos os cards verdes. Se algum vermelho, PARE — anotar o que apareceu no card antes de continuar.
3. `/averbadora/adf`: ADF da etapa 5.2 aparece como `recebida`.
4. Selecionar + Confirmar. Status vira `aplicada`.
5. `/averbadora/folhas`: folha atual tem 1 ADF aplicada com valor bate com a parcela.

### 5.4 Cross-check final (3min)

1. Voltar como servidor (login CPF 00011122233).
2. Aba `Contratos`: contrato averbado aparece com label **"Em dia"** (não "Ativo" cru).
3. Taxa exibida = **1.79%** (não 0.02%). Se aparecer 0.02%, é regressão do C7 (`/servidores/me/matriculas` deveria enviar CRU, UI deve `*100`).
4. Card do banco: nome do banco = "ATLAS TECH" (ou seja qual for o cadastrado). **Nunca "Scred Financeira", "Banco 1", "Banco fake"**.
5. Nome do banco em `/averbadora/contratos` deve ser IDÊNTICO ao do card do servidor pro mesmo ADF. Se produto = telemedicina, os dois devem mostrar "Telemedicina Atlas".

### 5.5 Regressão dos bugs históricos (2min)

Se algum destes reaparecer, é regressão de fix já feito — abrir issue apontando o commit que corrigiu.

| # | Sintoma | Fix (commit / arquivo) |
|---|---|---|
| 1 | Servidor vê banco "Scred Financeira" que não existe em `/averbadora/bancos` | `3ff0b70` — `nomeExibicaoBanco` centralizado |
| 2 | Taxa `179%` no detalhe da proposta no perfil banco | `bdd753b` — `banco/propostas/detalhe.tsx` |
| 3 | Card do contrato averbado do servidor mostra `0.02%` | `bdd753b` — `/servidores/me/propostas` envia CRU |
| 4 | "Margem travada" no dashboard averbadora infla (conta canceladas/aprovadas) | `3ed3ebb` — `contratoToPreReserva` usa `comprometeMargem` |
| 5 | "Ticket médio" mistura cancelados | `3ed3ebb` — dashboard filtra terminais |
| 6 | Próxima ADF colide com `CAP-000001` já usada | `9a9f086` — `issueIdUnico` persiste em PG |
| 7 | Bate-carteira sempre mostra 0 confirmadas | `cb48606` — deriva de `_contratos` |
| 8 | Isolate frio mostra "Bancos ativos 0" / "Receita R$ 0" no dashboard | `b2aab07` — hidrata em `Promise.all` |
| 9 | Botão "Varrer expiradas" só conta, margem não libera | `dc612f7` — nova ação `expirar` em `aplicarAcao` |
| 10 | Telemedicina aparece "ATLAS TECH" em averbadora/servidor | `13c8988` — `nomeExibicaoBanco` em todos os endpoints |
| 11 | Averbadora mostra "Ativo" e banco mostra "Em dia" pro mesmo contrato | `166389d` — `contratoStatusInfo` unificado |

## Onde vive cada camada

| Camada | Arquivos | Runtime | Escopo |
|---|---|---|---|
| 1 — unit | `packages/domain/src/*.test.ts` | vitest (~500ms) | funções puras (cet, iof, margem, contrato helpers) |
| 2 — invariantes | `apps/api/src/modules/admin/verify.ts` + `apps/web/src/routes/averbadora/verify.tsx` | endpoint + tela em prod | 6 grupos cross-profile |
| 3 — smoke E2E | `apps/api/test/e2e-smoke.mjs` | node standalone (~15s) | fluxo completo proposta → folha |
| 4 — manual | este `TESTING.md` | humano com browser (~20min) | UX visual, cross-check entre perfis |

Falhou uma camada = a próxima ainda pode passar; cada uma pega classe diferente de bug.
