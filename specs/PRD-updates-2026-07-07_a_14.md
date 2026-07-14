# Atlas Averbadora — Atualizações dos últimos 7 dias

**Período:** 2026-07-07 a 2026-07-14 (7 dias) · **Volume:** 185 commits em 5 dias ativos
**Autores:** marketingcentralmkt (produto/eng) + Diego Perez (colaborador)
**Complementa:** [`specs/PRD.md`](./PRD.md) (estado atual). Este documento descreve **o que mudou** neste período.

## Índice
1. Sumário executivo
2. Auth, primeiro-acesso e 2FA
3. Servidor (app + web)
4. Banco parceiro
5. Prefeitura
6. Averbadora
7. E-mails do sistema (automação em tempo real)
8. Margem e trava de proposta
9. Benefícios (nova capacidade)
10. Segurança e LGPD
11. Persistência e infra
12. Regras de negócio reafirmadas
13. Bugs relevantes corrigidos
14. Reverts e decisões revistas
15. Convenções de commit no período

---

## 1. Sumário executivo

Semana intensa em **três frentes paralelas**:

**A. Fluxo servidor completo.** O app do servidor deixou de ser um esqueleto e virou o produto principal: primeiro-acesso 100% funcional (e-mail + telefone + senha + termos), dashboard reorganizado (margens em 3 cards + carrossel de comunicados + atalhos Telemedicina/Portabilidade), **MarketPlace unificado** (ofertas dos bancos + simulador embutido + portabilidade), fluxo completo de simulação → termo → contrato com acompanhamento em tempo real. Cartão consignado e cartão benefício ganharam solicitação dedicada.

**B. Consultor de e-mails automático.** Todo evento de negócio (simulação criada, aprovada, recusada, averbada, primeiro-acesso, recuperar-senha) agora dispara e-mail em tempo real via **template editável** na averbadora, com variáveis preenchidas automaticamente com dado real. 5 sub-menus em `/averbadora/emails/*` — fixos não podem ser excluídos; templates de benefício são criados/apagados junto do benefício.

**C. Reorganização do ciclo ADF.** A averbadora passou a ser quem aplica a ADF em folha; a prefeitura só recebe (read-only). Contratos "Aprovado" pelo banco entram na fila de ADF da averbadora automaticamente e viram "Ativo" quando aplicados. Servidor recebe notificação em cada transição.

Outras entregas de peso: **CRUD rico de Benefícios** por prefeitura (imagens, carrossel, categorias, filtros, cascade de template de e-mail), **soft-delete universal** (tokens, webhooks, perfis, bancos, prefeituras nunca são hard-deletados), **paginação + total de servidores**, e **remoção de 3 mocks críticos** (esqueci-senha, upload CCB, sync de folha) — todos agora funcionam de verdade.

Distribuição por dia:
- **07/07** — 5 commits (fim de sprint anterior)
- **08/07** — 62 commits (primeiro-acesso, subusuários averbadora, MarketPlace)
- **10/07** — 63 commits (dashboard servidor, banco/propostas, ofertas, CCB)
- **13/07** — 45 commits (e-mails automáticos, benefícios, ADF)
- **14/07** — 11 commits (segurança + polish + PRD)

---

## 2. Auth, primeiro-acesso e 2FA

**Primeiro-acesso do servidor** virou fluxo real e blindado:
- Servidor escolhe **seu próprio e-mail** — não usa mais o que veio no cadastro da prefeitura.
- Pede **telefone com DDD** junto do e-mail e senha, com máscara.
- **E-mail único por servidor** (autoridade no Postgres, não mais memória do isolate).
- **Bloqueio de hijack**: se CPF já tem senha (inclusive DEV_USERS), rejeita novo primeiro-acesso — evita conta sequestrada.
- Tela deixou de prometer **envio de SMS** que não existe.
- Retorno da API distingue "Conta Existente" vs "Conta Criada".

**Esqueci senha** ganhou 3 modos que compartilham o mesmo fluxo:
- **Por CPF** (servidor).
- **Por e-mail** (banco / prefeitura / averbadora / servidor pelo e-mail do primeiro-acesso).
- **Universal** — endpoint único que detecta o perfil pelo identifier e localiza o dono sem enumerar (não revela se CPF/e-mail existem).

**2FA** consolidado:
- **TOTP RFC 6238** self-service em qualquer perfil (`averbadora`, `banco`, `prefeitura`, `servidor`).
- Login com 2FA: se `twoFactorEnabled=true` → devolve `mfa_token` (KV 5min), trocado por access+refresh via `/v1/auth/verify-2fa`.
- Removido 2FA no aceite do termo de autorização (era atrito redundante — já estava logado + acabou de digitar código).
- Termo pré-proposta segue com aceite (checkbox) mas sem step-up.

**Subusuários da averbadora** (Carla, Rafael, Sandra, Auditor) podem logar com sub-perfil (`operador|comercial|financeiro|auditoria|supervisor`) e o painel filtra menu + endpoints por `podeAcessar()`.

---

## 3. Servidor (app + web)

### 3.1 Menu e navegação
- **Enxuto:** Simular / Portabilidade / Propostas somem — viram **MarketPlace** unificado e **Contratos**.
- **Saúde** vira **Telemedicina** (aba dedicada, separada de "Descontos e Benefícios").
- Cada item do menu superior ganhou **ícone**.
- MarketPlace fica destacado no menu quando cai em `/marketplace`, `/simular`, `/portabilidade` ou `/propostas`.
- `/servidor/propostas` **removida** — em andamento agora vive em `/servidor/contratos` (aba Ativos).

### 3.2 Dashboard
Reorganizado a partir do "modelo de referência":
- **3 cards de margem** (Empréstimo / Cartão Consig / Cartão Benefício) lado a lado com barra + botão de ação por modalidade.
- **Carrossel de comunicados** entre margem e blocos de atalho (autoplay 3s → ajustado para 5s).
- **2 blocos grandes** (Telemedicina esquerda, Portabilidade direita — ordem definida após feedback).
- Removidos: card "Fonte", alertas de "pré-aprovação", blocos "Próximo desconto em folha", "Em roadmap".
- "Ver mais" nos AtalhoCard alinhado ao rodapé.
- **Telemedicina no card lateral** é decisão do colega Diego — não trocar por Benefícios (regra registrada em memória).

### 3.3 MarketPlace + Portabilidade (hub unificado)
- **Só mostra ofertas publicadas pelos bancos** — não mais tabelas de empréstimo automáticas.
- **Simulador embutido inline** substituindo o antigo botão "Simular".
- Seção **"Rede de saúde parceira"** com benefícios `categoria=saude`.
- Card de benefício mostra **imagem (única ou carrossel)** + botão **Acessar**.
- Aba "Nenhuma oferta ativa" esconde quando lista está vazia.
- Card **uniformizado** (hero 140px → 80px, ícone 36px).
- **Propostas de portabilidade intencionadas pelos bancos** entram no hub como ofertas específicas.

### 3.4 Simulador
- **1 URL por produto** — `?produto=emprestimo | cartao_consignado | cartao_beneficio` (removidas as tabs).
- **Prazo máximo** = **MIN** entre as tabelas ativas dos bancos (conservador — se banco reduz, some do dropdown em ≤3s).
- **Trava de 48h por produto** (não mais global — margens são independentes).
- **Trava derivada do backend**, não só localStorage — sobrevive a clear cache.
- Trava só libera com **decisão EXPLÍCITA do banco** (aprovar/recusar) OU depois de 48h exatas via timestamp ISO.
- Simulador de cartão removeu o slider — igual ao mobile (input direto).

### 3.5 Contratos
- Renomeado "Quitados" → **"Histórico"**; removida aba "Todos".
- Propostas **recusadas** vão pro Histórico.
- **`ProgressoProposta`** com 5 etapas horizontais (labels conforme pedido literal).
- **Ordenação recentes no topo** em ambas as abas.
- **Pill de produto** (Empréstimo / Cartão / Portabilidade) no card, incluindo "em andamento".
- Baixa **CCB real** anexado pelo banco (era PDF fake gerado no client).
- Botão renomeado "Baixar PDF" → **"Baixar Contrato"**.
- 404 do CCB dá reason específico: `contrato_nao_encontrado | contrato_nao_e_seu | ccb_nao_anexado | arquivo_nao_encontrado_no_r2`.

### 3.6 Cartão (consignado + benefício)
- **Bucket próprio de margem** — solicitar cartão não afeta margem de empréstimo (e vice-versa).
- Cartão de crédito consignado ativa **trava de 48h** ao solicitar.
- Após envio, botão pós-envio vai pra `/servidor/contratos`.
- "Cartão Benefício → Ver ofertas" vai pro Marketplace principal (era link quebrado).

### 3.7 Conta
- **Redefinir senha** com senha atual + nova + confirmar.
- **Alterar contato** exige código por e-mail (`/me/codigo` → `/me/contato`).
- **Redefinir senha** ganhou fluxo com código por e-mail também (2 modos: direto ou com código).
- Removido card "Login biométrico" (feature não existe no web).
- Acentos em português corrigidos em todas as strings visíveis.

### 3.8 Mobile Expo (Android)
- APK **v3.3.0** publicado com mensagens de campo específicas ("E-mail em uso", "E-mail errado").
- Estado geral do mobile: login + home (margem real) + conta (só tema/logout). Propostas/Contratos/Ofertas continuam placeholders.

---

## 4. Banco parceiro

### 4.1 Minhas Propostas
- Vira **submenu do sidebar** (Empréstimo / Cartão / Portabilidade) — igual à seção Cadastros.
- Depois volta a **menu suspenso de produto** dentro da tela (2ª iteração).
- **"Ver mais"** na fila da proposta + **celular do servidor** + baixar/anexar CCB.
- **Inverte o fluxo**: anexar CCB **antes** de aprovar (backend rejeita `aprovar` sem `ccbKey` → 422).
- **Layout de cards** no modelo Marketplace.
- Averbação **removida do portal do banco** — banco só aprova/recusa + baixa contrato modelo. Averbação em folha é da averbadora.
- **Motivo de recusa é opcional**.
- Removido "Solicitar mais info" (fluxo que nunca foi usado).
- Detalhe usa **API do backend** em vez do seed vazio (bug fix).

### 4.2 Ofertas (marketing pro servidor)
- **Tipos de produto**: `credito_novo`, `portabilidade`, `refinanciamento`, `cartao_consignado`, `cartao_beneficio`.
- **Refinanciamento** = renegocia contrato existente **com o próprio banco**.
- **Seletor de ícones** completo por categoria + URL de imagem.
- **Aba Encerradas (soft)** — nunca hard-delete.
- Ícone aparece no **card do servidor** (marketplace).
- **Promoção relâmpago** com contador regressivo.
- **Ofertas filtradas por perfil** — servidores compatíveis (convênio, vínculo, situação, prefeitura, salário, margem cartão) recebem no sino.

### 4.3 Cadastros / Tabelas de empréstimo
- **Prazo máx** com opções fixas: **12/24/36/48/60/72/96/120**.
- Mudança reflete no servidor **em tempo real** (poll 3s + queryKey batendo com invalidate).

### 4.4 Ficha de margem/contratação
- **Alinhada ao modelo de referência** — 3 buckets + projeção 4 meses + `OperacaoForm`.

### 4.5 Visão geral
- Labels e mural iguais ao modelo de referência.

### 4.6 Layout
- **Overlay de loading** de 4s → 3s ao trocar de convênio (reativo — fecha quando queries terminam, com piso e teto).

### 4.7 Fila de propostas
- Só mostra servidores do **convênio ATIVO** (bug fix — antes vazava entre convênios).

---

## 5. Prefeitura

### 5.1 ADF — grande mudança de responsabilidade
- **Averbadora aplica em folha, prefeitura só recebe.**
- Prefeitura vê `/prefeitura/adf` **read-only** (botões Confirmar/Reportar falha foram removidos da UI — endpoints backend permanecem para retrocompat).
- Contrato "Aprovado" pelo banco entra automaticamente na fila de ADF da averbadora (não some mais).

### 5.2 Coluna Descontos (ADF) em Folhas
- Mostra **quantidade de ADFs aplicadas** na competência.
- (Passou por revert e reapply — funcionalidade final consolidada).

### 5.3 Convênios
- **Exclusividades do cartão consignado** por prefeitura (texto livre `exclusividadesCartaoConsig`).
- **Flag `permiteServidorEditarContato`** por prefeitura — cada uma decide se servidor pode editar email/telefone no `/servidor/conta`.
- **Exigências de averbação** (CCB obrigatório + 2FA na averbação) — 2 toggles herdados pelo banco via `/banco/convenios` (badges "CCB obrigatória" / "2FA na averbação").

### 5.4 Correções
- `folhaSincUrl` só aceita **http(s)** — não caminho local disfarçado.
- Zeradas pendências de seed no painel (folha aberta + anuência).
- Import CSV: **re-import NÃO apaga** mais o que servidor definiu no primeiro-acesso (email/senha/telefone preservados).

---

## 6. Averbadora

### 6.1 Novo item de menu: E-mails do sistema
Ver seção 7.

### 6.2 ADF global (nova tela)
- **Move ADF do banco → averbadora com visão global** de todos os contratos aprovados.
- Ordena por `atualizadoEm DESC` (recentes no topo).
- **Filtro por matrícula / CPF / nome**.
- Mostra **valor total financiado + categoria** (Empréstimo/Cartão/Portabilidade).
- Confirmação → dispara e-mail template `simulacao/averbada` para cada servidor (fallback hardcoded se template inativo).
- Reportar falha → dispara template `simulacao/recusada` com motivo.

### 6.3 Servidores
- **Total de servidores + paginação** (25/50/100/200 por página).
- Contador "N servidores (filtrado)" ao lado do título.
- Botões primeiro / anterior / próxima / última.

### 6.4 Comunicados
- **CRUD com público-alvo** banco/servidor.
- Submenu Comunicados > Banco / Servidor (esconde seletor de público dentro do submenu).
- **Drag-and-drop** pra reordenar (substitui botões up/down).
- Reordenar e remover comunicados no admin.
- Comunicados **só editam pelo botão Editar** (não pelo clique na linha).
- Tabela cabe sem scroll horizontal.
- **Persistidos no Postgres** — sobrevivem a redeploy (write-through).

### 6.5 Benefícios
Ver seção 9.

### 6.6 Gating por sub-perfil
- **Fatia 3** do gating implementada — matriz de permissões visual em `/averbadora/permissoes`.
- Mensagem clara quando perfil só permite supervisor.

### 6.7 Sub-perfis criados
- Carla, Rafael, Sandra, Auditor (4 subusuários com `averbadora_perfil` específico).

### 6.8 Endpoint de manutenção
- `POST /v1/admin/manutencao/purge-contratos-matricula` — apaga contratos por matrícula em PG + memória (uso restrito, testes).

### 6.9 Form de editar/criar benefício
- **Largura total** — removido `maxWidth: 900` (tela tinha muita área morta à direita).

---

## 7. E-mails do sistema (automação em tempo real)

Uma das **maiores entregas do período**. Sistema completo em 3 camadas:

### 7.1 Consultor de e-mail (CRUD)
- Nova área `/averbadora/emails/*` com **5 sub-menus**:
  - `primeiro-acesso` — 4 perfis × 1 template
  - `recuperar-senha` — 4 perfis × 1 template
  - `redefinir-senha` — 1 template universal
  - `simulacao` — 4 tipos × 4 status × 2 públicos = 32 templates (servidor + banco por combinação)
  - `beneficios` — 1 template por benefício (criado/apagado em cascade)
- **CRUD de modelos** + envio de teste real via SMTP configurado.
- **Templates fixos NÃO podem ser excluídos** (regra do cliente: "OS EMAILS NAO PODEM SER EXCLUIDOS").
- Templates de benefício: hook em `POST /admin/beneficios` cria; `DELETE /admin/beneficios/:id` deleta em cascade.

### 7.2 Editor com preview de variáveis reais
- Cada template tem **variáveis contextualizadas** (`{{nome}}`, `{{codigo}}`, `{{adf}}`, `{{valor}}`, `{{parcelas}}`, `{{valorParcela}}`, `{{contract_name}}`, `{{banco}}`, `{{prefeitura}}`, `{{motivo}}`).
- **Preview automático** com dados realistas (função `exemploVarsRealistas`).
- Envio de teste vai **DIRETO pro destino** informado no botão de teste (não passa por `notifyEmail` global).

### 7.3 Dispatch automático em tempo real
Todo evento de negócio agora tenta o template ativo **antes** de cair no fallback hardcoded:

| Evento | Filtro do template | Onde dispara |
|---|---|---|
| Primeiro acesso — código | `evento=primeiro_acesso, publico=servidor` | `POST /auth/primeiro-acesso/codigo` |
| Recuperar senha — código (CPF) | `evento=recuperar_senha, publico=servidor` | `POST /auth/esqueci-senha/solicitar` |
| Recuperar senha — universal | `evento=recuperar_senha, publico=<perfil>` | `POST /auth/esqueci-senha/universal-solicitar` |
| Simulação criada (servidor) | `evento=simulacao, publico=servidor, tipo=<t>, status=enviada` | `POST /me/propostas` + `/me/cartoes` |
| Simulação criada (banco) | `evento=simulacao, publico=banco, tipo=<t>, status=enviada` | idem, alvo é o banco |
| Proposta aprovada | `evento=simulacao, publico=servidor, tipo=<t>, status=aprovada` | `POST /portal/banco/contratos/:adf/aprovar` |
| Proposta recusada | `... status=recusada` | `POST .../cancelar` |
| Contrato averbado | `... status=averbada` | `POST /admin/adf/confirmar` |

Implementado em `apps/api/src/modules/admin/mailer.ts` (`dispatchTemplateEmail`) e `email-templates.ts` (`findTemplate`). Helper `notifyViaTemplate(c, email, filtro, vars, fallback)` no `servidores/index.ts`. Refactor de `notifyMovimentacao` no `portal-banco/index.ts` com mappers `acaoToSimStatus` e `contratoToSimTipo`.

### 7.4 Bug fix crítico
- Teste de e-mail antes ia pro `notifyEmail` global (override de teste dos perfis admin). Agora vai **DIRETO pro destino** informado.
- Variáveis não vinham preenchidas — agora endpoint `/preview-vars` retorna defaults reais e o frontend pré-carrega.

### 7.5 `notifyEmail` global
- Redefinido como **override SÓ de perfis admin** (banco / prefeitura / averbadora) — não afeta fluxos de servidor (primeiro-acesso, esqueci-senha, editar contato, código de senha).

---

## 8. Margem e trava de proposta

Regra crítica **reafirmada com correções e reverts**:

### 8.1 Buckets independentes
- `EMPRESTIMO` (35% do salário)
- `CARTAO_CONSIGNADO` (5%)
- `CARTAO_BENEFICIOS` (5%)

Solicitar cartão **não afeta** margem de empréstimo (e vice-versa).

### 8.2 Margem bloqueia JÁ NA PROPOSTA em análise
Ping-pong da regra durante a semana:
1. `fix(margem): so compromete margem quando o banco aceita a proposta` — regra antiga.
2. `fix(margem): proposta em analise ja bloqueia margem (pre-reserva efetiva)` — reafirmação.
3. `fix(margem): reverte 71849de — margem bloqueia JA NA PROPOSTA (regra do cliente reafirmada)`.
4. `fix(margem): cartao consig/benef tem bucket proprio` — buckets separados.

**Regra final consolidada em memória:**
> Proposta em análise (situação contém "aguard") já compromete margem — para impedir 2 propostas sobrepondo a mesma margem. Libera em Expirado, Cancelado, Recusado, Quitado.

### 8.3 Trava de 48h
- **Por produto**, não global.
- Timer usa **timestamp ISO** (48h exatas).
- **Derivada do backend**, não só localStorage.
- Libera com **decisão EXPLÍCITA do banco** OU depois de 48h.

### 8.4 Validação server-side
- Se `parcela > margem disponível + R$ 0,01` → HTTP 422 `margem_insuficiente` com mensagem clara.
- Cartão sem margem (`≤ 0`) → 422 "sem margem de cartao consignado/beneficio disponivel".

---

## 9. Benefícios (nova capacidade)

Feature completamente nova, entregue em várias camadas ao longo da semana.

### 9.1 CRUD por prefeitura
- Averbadora cria/edita/pausa/reativa benefícios em `/averbadora/beneficios`.
- Campos ricos: CNPJ, endereço, contato, desconto (percentual/valor/preço especial/gratuidade), como usar (cartão/matrícula/CPF/código/QR), filtro (convenios/vinculos/idade/salário), vigência (dias e horas), responsável, imagens, link.
- **Todos os campos opcionais** (modo teste) — só nome + origem obrigatórios.

### 9.2 3 modos de abrangência
- **Só principal** — prefeitura logada.
- **Todas parceiras** — flag `todasPrefeiturasParceiras`.
- **Escolher específicas** — array `prefeituraIdsExtras`.

### 9.3 Origem
- `banco | averbadora | prefeitura | convenio` — validação cruzada (origem=banco exige `bancoId`).

### 9.4 Categorias
- Saúde / Alimentação / Educação / Lazer / **Telemedicina** (aba separada).
- Filtro `categoria=telemedicina` → só aparece em `/servidor/saude`.

### 9.5 Imagens
- **Única** ou **carrossel**.
- Renderização no card do servidor.
- Seletor de ícone completo (abas por categoria + URL de imagem).

### 9.6 Tabs Ativas / Encerradas
- Iguais ao `/banco/ofertas` (soft-delete).

### 9.7 Rastreio de cliques
- `POST /me/beneficios/:id/clique` — dedup 60min por servidor+benefício.
- Nova tela `/averbadora/interessados` — cliques dos últimos 500 + resumo por benefício.

### 9.8 Cascade de e-mail template
- Criar benefício → cria template `evento=beneficio` vinculado por `beneficioId`.
- Deletar benefício → deleta template (única exceção legítima ao soft-delete).

### 9.9 Preview "onde vai aparecer"
- Card no form mostra: telas do servidor onde aparece, prefeituras alvo, banco parceiro (se origem=banco).

### 9.10 Tela dedicada
- Criar/editar sai do modal e vira **tela dedicada** com todos os detalhes contextuais.
- **Largura total** da tela (sem container).

---

## 10. Segurança e LGPD

### 10.1 Averbadora **não pode editar senha do servidor**
`security(averbadora): remove edicao de senha do servidor pela averbadora`
- Removido da Zod schema (`AdminServidorUpdate`).
- Removido do SDK type.
- Removido do UI TextField.
- Aviso na tela: "A senha do servidor não é editável por aqui — apenas o próprio servidor pode alterar, em Conta → Redefinir senha, com verificação por e-mail."

### 10.2 Soft-delete universal
Nunca hard-delete:
- **Bancos** → `status=inativo`
- **Prefeituras** → `status=inativo`
- **Convênios** → `ativo=false`
- **Servidores** → `status=arquivado`
- **Perfis prefeitura** → `ativo=false`
- **Perfis averbadora** → `ativo=false`
- **Tokens API** → botão "**Desativar / Reativar**" (troca de "Revogar" com lixeira)
- **Webhooks** → `active=false`
- **Benefícios** → `pausado=true`
- **Ofertas banco** → aba Encerradas
- **CCB substituído** → arquivado em `ccbHistorico[]`
- **Comunicados** → única exceção: hard-delete permitido (produto explícito).

Cascade: banco `status=inativo` pausa tokens + webhooks automaticamente (via `syncBancoAccess`).

### 10.3 Unicidade de e-mail no Postgres
- `fix(auth): unicidade de e-mail autoritativa via Postgres (nao depende de memoria)` — antes o isolate podia ter estado divergente.

### 10.4 CCB só do próprio CPF
- Backend valida que matrícula do contrato pertence ao CPF do JWT — 404 com reason específico se não pertence.

### 10.5 Reset de contas de teste
- Endpoint `POST /v1/admin/manutencao/reset-servidores-teste` zera 9 CPFs de teste (mantém `01844730808/smlgordo@gmail.com`).

---

## 11. Persistência e infra

### 11.1 Comunicados persistidos no Postgres
- `feat(api): persiste comunicados no Postgres — sobrevivem a redeploy` — antes viviam só em memória do isolate.

### 11.2 Contratos removidos do PG somem da memória
- `fix(portal-banco/store): refreshContratos remove entradas que sumiram do PG` — antes ficava fantasma.

### 11.3 Matrículas arquivadas somem do switcher
- CSV template deixa de sugerir M-9001 (matrícula de teste).

### 11.4 Loading overlay reativo
- **Piso 800ms + grace 1.5s + teto 5s.**
- Fecha **quando as queries terminam** (via `useIsFetching`), não em timer fixo.
- Uso: switcher de convênio do banco, troca de matrícula do servidor.

### 11.5 Remoção de 3 mocks críticos
- `feat(auth,ccb,folha): remove tres mocks — esqueci-senha, upload CCB, sync folha`
- Esqueci-senha agora envia e-mail real via SMTP (não mais retorna código em texto).
- Upload de CCB grava no R2 real (não mais no localStorage).
- Sync de folha faz fetch HTTP real (não mais fixture).

### 11.6 `folhaSincUrl` valida http(s)
- Não aceita caminho local disfarçado.

### 11.7 `.DS_Store` no gitignore
- Evita ruído do macOS no controle de versão.

### 11.8 `.claude/` deletado do repo
- Colega Diego apagou `.claude/` (skills, MCPs, hooks) e adicionou ao gitignore.
- Local segue com o diretório; remoto não tem mais.

---

## 12. Regras de negócio reafirmadas

Consolidadas em memória de longo prazo para futuras sessões:

1. **Nunca resetar, persistir tudo** — propostas/logs nunca apagam; único TRUNCATE (`/admin/db/reseed`) travado por confirmação `APAGAR-TUDO-E-RESEMEAR`.
2. **Não mexer em dados do usuário** — ao mexer em código, NÃO alterar banco/KV/R2 nem propostas/ofertas via API; testar só com dado existente.
3. **Benefícios: features que só desativam** — imagens/carrossel/link/telemedicina em benefícios: se pedirem pra retirar, só desativar (feature flag), não deletar.
4. **Dashboard servidor: não mexer** — Telemedicina no card lateral é decisão do colega; parar de tentar trocar por Benefícios.
5. **Cancelar proposta presa** — proposta em análise pro servidor que não aparece no banco: usar `/averbadora/pre-reservas` (tela já existe).
6. **Margem bloqueia na proposta** — regra final, reafirmada após 3 reverts.
7. **Loop proposta servidor↔banco** — proposta passa pelo backend persistido (contratos no PG), não mais localStorage isolado.
8. **Protocolo redeploy/conciliação** — no "refaça o push": manter trabalho novo do colega, restaurar backbone de comunicação; mandar opções se ambíguo.

---

## 13. Bugs relevantes corrigidos

### Servidor
- Portabilidade do dashboard vai direto pra `/portabilidade` (não pro MarketPlace intermediário).
- `/servidor/beneficios` respeita matrícula ativa + empty state amigável.
- `/servidor/marketplace` esconde "Nenhuma oferta ativa" quando vazio.
- Cards de benefício uniformizam altura (hero fixo).
- Simulador de cartão: bug do slider.
- `Cartao Beneficio "Ver ofertas"` vai pro Marketplace principal (era link quebrado).
- Trava de 48h só olha propostas do mesmo produto (bug: cancelar empréstimo liberava trava do cartão).
- Contratos: `mapSituacao` mais defensivo (canceladas/aprovadas mapeadas corretamente).
- Contratos: recentes no topo em "Em andamento" também.
- Contratos: pill de produto também no card "em andamento".
- Não pisca a tela pra quem tem 1 matrícula só (`/selecionar-matricula`).
- Aviso "Próximo passo" removido abaixo das propostas aprovadas (formalização é fora do app).
- `/servidor/saude` só mostra `categoria=telemedicina`.
- `/servidor/termo` — "Ver minhas propostas" vai para `/servidor/contratos` (rota removida).

### Banco
- "Anexar contrato" gera CCB modelo client-side (era 401 no `comprovante.pdf`).
- Detalhe usa API real do backend em vez do seed vazio.
- Propostas/detalhe: `mover hooks para antes do early return` (erro React #310).
- Decisão do banco vai pro backend — servidor vê aprovar/recusar em tempo real.

### Averbadora
- Teste de e-mail envia direto pro destino + preenche variáveis auto com dados reais.
- Gating: mensagem clara quando perfil só permite supervisor.

### Prefeitura
- Painel: zera pendências seed (folha aberta + anuência de teste).

### Auth
- Primeiro-acesso: importa `setServidorContato` (commit anterior faltou).
- Primeiro-acesso: bloqueia hijack considerando `DEV_USERS`.

### API
- Matrículas arquivadas somem do switcher.

### Web (geral)
- Tabela de comunicados admin cabe sem scroll horizontal.
- Dashboard/AtalhoCard height 100% pra alinhar "Ver mais" no rodapé.
- Dashboard + carrossel respeitam tema claro/escuro.

---

## 14. Reverts e decisões revistas

3 reverts significativos no período — todos documentados e justificados:

1. **Coluna Descontos (ADF) na tela de Folhas**
   - `Revert "feat(prefeitura/folhas): coluna Descontos (ADF) mostra ADFs aplicadas na competencia"`
   - `Revert "Reapply "feat(prefeitura/folhas): coluna Descontos (ADF) ..."""`
   - `Reapply "feat(prefeitura/folhas): coluna Descontos (ADF) ..."`
   - **Decisão final:** mantido (última iteração).

2. **Margem bloqueia na proposta**
   - Fix `fix(margem): so compromete margem quando o banco aceita a proposta` foi revertido.
   - **Decisão final:** margem bloqueia JÁ NA PROPOSTA (`fix(margem): reverte 71849de — margem bloqueia JA NA PROPOSTA (regra do cliente reafirmada)`).

3. **Dashboard servidor — bloco lateral**
   - Tentativa de trocar "Telemedicina" por "Benefícios" foi revertida.
   - **Decisão final:** `fix(servidor/dashboard): restaura Telemedicina no lugar de Beneficios (pedido do usuario)` — parar de tentar mudar.

---

## 15. Convenções de commit no período

Distribuição por prefixo/escopo (top 10):

| Prefixo | Commits | Área principal |
|---|---|---|
| `feat(servidor/dashboard)` | 16 | Dashboard do servidor (várias iterações) |
| `feat(servidor)` | 10 | App do servidor (geral) |
| `fix(servidor/contratos)` | 8 | Correções em contratos |
| `feat(banco/propostas)` | 8 | Fluxo de propostas do banco |
| `fix(servidor/simulacao)` | 4 | Simulação (trava, buckets, prazo) |
| `fix(margem)` | 4 | Regras de margem |
| `feat(servidor/marketplace)` | 4 | MarketPlace unificado |
| `feat(servidor/contratos)` | 4 | Contratos (progresso, histórico) |
| `feat(servidor/conta)` | 4 | Conta (senha, contato) |
| `feat(beneficios)` | 4 | CRUD de benefícios |
| `feat(banco/ofertas)` | 4 | Ofertas do banco |

Autores:
- **marketingcentralmkt** — a grande maioria dos commits (produto/eng).
- **Diego Perez** — 3 commits (gitignore + delete `.claude/`).

Padrão: **Conventional Commits com escopo de pacote** (`feat(api):`, `fix(web):`, `chore(ui):`, `docs(specs):`) — regra reforçada em `.claude/CLAUDE.md` (agora só local).

---

## Referências

- [`specs/PRD.md`](./PRD.md) — estado atual completo do sistema
- `git log --since='2026-07-07'` — commit history bruto
- `.claude/plans/buzzing-wondering-pearl.md` — plano de 12 ajustes (base do backlog priorizado)
- Memória (`~/.claude/projects/.../memory/`) — regras de longo prazo consolidadas no período
