# Guia rápido — como editar páginas do web

Documento de bolso para quem vai mexer em **header, menu, conteúdo (main), footer, ou criar novas páginas** no app `atlas-web`. Resume a nomenclatura, onde fica o quê e o ciclo edit → deploy.

> Stack: Vite + React 18 + React Router 6 + `@atlas/ui` (design system) + `@atlas/sdk` (cliente da API).

---

## 1. Mapa mental do repositório (parte web)

```
apps/web/
├── index.html                         ← <title>, favicon, root <div id="root">
├── vite.config.ts                     ← config do bundler (porta dev, build)
├── .env.production                    ← VITE_API_BASE_URL=https://...
└── src/
    ├── main.tsx                       ← bootstrap React + QueryClient + RouterProvider
    ├── router.tsx                     ← TODAS as rotas: /, /login, /servidor/*, /banco/*, /averbadora/*
    ├── lib/
    │   ├── sdk.ts                     ← instancia o AtlasClient (lê VITE_API_BASE_URL)
    │   └── csv.ts                     ← util de download CSV
    └── routes/                        ← cada arquivo = uma página
        ├── login.tsx                  ← página pública /login
        ├── servidor/                  ← perfil servidor (usuário final)
        │   ├── layout.tsx             ← HEADER + MAIN compartilhados das telas /servidor/*
        │   ├── dashboard.tsx          ← /servidor/dashboard (Início)
        │   ├── marketplace.tsx        ← /servidor/marketplace (Ofertas)
        │   ├── simular.tsx            ← /servidor/simular (Simular)
        │   ├── propostas.tsx          ← /servidor/propostas
        │   ├── contratos.tsx          ← /servidor/contratos
        │   └── conta.tsx              ← /servidor/conta
        ├── banco/                     ← portal do banco parceiro
        │   ├── layout.tsx             ← SIDEBAR + topbar (AppShellAdmin)
        │   ├── visao-geral.tsx
        │   ├── margem-contratacao/
        │   ├── gerenciador-contratos/
        │   ├── cadastros/
        │   └── relatorios/
        └── averbadora/                ← painel super-admin
            ├── layout.tsx             ← SIDEBAR com 10 itens
            ├── dashboard.tsx
            ├── bancos.tsx
            ├── prefeituras.tsx
            ├── convenios.tsx
            ├── servidores.tsx
            ├── folhas.tsx
            ├── comunicados.tsx
            ├── health.tsx
            ├── logs.tsx
            └── vitrine.tsx
```

**Convenção de nomes:**
- `layout.tsx` — wrapper que renderiza header/sidebar + `<Outlet />` (slot onde a página filha entra). Há **um por perfil**.
- `dashboard.tsx`, `marketplace.tsx`, etc. — **uma página = um arquivo**, com função exportada nomeada (`export function ServidorMarketplace()`).
- Subpastas (`margem-contratacao/`, `relatorios/`) agrupam telas relacionadas; `index.tsx` é a tela "raiz" daquela área e `[outra].tsx` são as subpáginas.

---

## 2. Onde fica cada parte da UI

### 2.1 Header / menu de navegação

| Perfil | Arquivo do header |
|---|---|
| Servidor | [apps/web/src/routes/servidor/layout.tsx](apps/web/src/routes/servidor/layout.tsx) |
| Banco | [apps/web/src/routes/banco/layout.tsx](apps/web/src/routes/banco/layout.tsx) |
| Averbadora | [apps/web/src/routes/averbadora/layout.tsx](apps/web/src/routes/averbadora/layout.tsx) |

No layout do servidor a navegação é definida no array `NAV` no topo do arquivo:

```tsx
const NAV = [
  { key: "dashboard",   label: "Início",    href: "/servidor/dashboard" },
  { key: "marketplace", label: "Ofertas",   href: "/servidor/marketplace" },
  { key: "simular",     label: "Simular",   href: "/servidor/simular" },
  ...
];
```

→ **Adicionar/remover item do menu = editar esse array.** Não precisa tocar em mais nada (a renderização é em loop).

Estrutura do header (servidor):

```tsx
<header sticky com blur>                ← faixa full-width (não cortar bordas)
  <div maxWidth: 1280 margin auto>      ← container central
    <div esquerda>                       ← logo + nav buttons (loop do NAV)
    <div direita>                        ← Tema escuro / Sair
  </div>
</header>
<main maxWidth: 1280 margin auto>
  <Outlet />                            ← aqui entra a página atual
</main>
```

### 2.2 Main (conteúdo da página)

O `<main>` está no `layout.tsx` de cada perfil. Tem `maxWidth: 1280` para centralizar em telas grandes.

**Cada página filha** (ex: `simular.tsx`) renderiza um `<div>` que herda essa largura. Se a página quiser ser mais estreita que 1280, use:

```tsx
<div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
  ...conteúdo...
</div>
```

### 2.3 Footer

**O app não tem footer hoje** (a barra inferior é só do mobile via tab-bar). Se quiser adicionar:

```tsx
// em layout.tsx, depois do </main>
<footer style={{
  padding: "16px 24px",
  borderTop: "1px solid var(--border)",
  fontSize: 12,
  color: "var(--text-dim)",
}}>
  <div style={{ maxWidth: 1280, margin: "0 auto" }}>
    © 2026 Atlas Averbadora · <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a>
  </div>
</footer>
```

---

## 3. Como editar uma página existente

Exemplo: mudar o título da tela "Simular".

1. Abra [apps/web/src/routes/servidor/simular.tsx](apps/web/src/routes/servidor/simular.tsx)
2. Encontre o `<h1>Quanto cabe no seu bolso?</h1>` (já está dentro do `<header>` interno da página)
3. Edite o texto
4. Salve. Em dev (`pnpm --filter @atlas/web dev`) o hot-reload mostra na hora.

---

## 4. Como criar uma página nova (5 passos)

Exemplo: criar `/servidor/ajuda`.

**1. Crie o arquivo** `apps/web/src/routes/servidor/ajuda.tsx`:

```tsx
import { Card } from "@atlas/ui/web";

export function ServidorAjuda() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <h1>Ajuda</h1>
      <Card>
        <p>Conteúdo aqui.</p>
      </Card>
    </div>
  );
}
```

**2. Registre no router** ([apps/web/src/router.tsx](apps/web/src/router.tsx)):

```tsx
import { ServidorAjuda } from "./routes/servidor/ajuda";
// ...
// dentro do bloco do servidor, adicione:
{ path: "ajuda", element: <ServidorAjuda /> },
```

**3. Adicione no menu** ([apps/web/src/routes/servidor/layout.tsx](apps/web/src/routes/servidor/layout.tsx)):

```tsx
const NAV = [
  ...
  { key: "ajuda", label: "Ajuda", href: "/servidor/ajuda" },
];
```

**4. Typecheck**: `pnpm --filter @atlas/web typecheck`

**5. Build + deploy** (seção 7 abaixo).

---

## 5. Tokens de design (cores, fontes, sombras)

**Nunca codifique cores hex direto** — use as variáveis CSS:

| Token | Uso |
|---|---|
| `var(--bg)` | fundo geral da página |
| `var(--surface)` | fundo de cards |
| `var(--text)` | texto principal |
| `var(--text-muted)` | texto secundário |
| `var(--text-dim)` | hint, eyebrow, labels |
| `var(--border)` / `var(--border-strong)` | bordas |
| `var(--accent)` (gold) | destaque primário |
| `var(--emerald-500)` | sucesso, valor positivo |
| `var(--gold-500)` / `var(--gold-400)` | gradientes dourados |
| `var(--navy-700)` / `var(--navy-900)` | gradientes escuros |
| `var(--shadow-md)` / `var(--shadow-gold)` | sombras |
| `var(--font-mono)` | fonte mono para IDs/CPFs |

Definição em [packages/ui/src/tokens/tokens.css](packages/ui/src/tokens/tokens.css). Dark/light é trocado pelo `ThemeProvider`.

---

## 6. Componentes prontos do `@atlas/ui/web`

Importe assim:

```tsx
import { Button, Card, Pill, Tabs, DataTable, Modal, ... } from "@atlas/ui/web";
```

**Catálogo:**

| Componente | Quando usar |
|---|---|
| `Button` | Botões (variants: `primary`/`ghost`/`success`, sizes: `sm`/`md`; respeita `disabled`) |
| `Card` | Wrapper de painel com background `--surface` e padding |
| `Pill` | Badges de status (averbado, aceita, pendente, expirado, emdia, etc.) |
| `Input` / `FormField` | Inputs com label e validação visual |
| `Tabs` | Abas (variants: `underline`, `pills`) |
| `DataTable<T>` | Tabela genérica tipada com colunas + paginação |
| `KpiCard` | Card grande de KPI (Visão Geral do banco / dashboard averbadora) |
| `AppShellAdmin` | Layout sidebar + topbar (banco e averbadora) |
| `ConvenioSwitcher` | Dropdown de prefeitura × banco ativo (portal banco) |
| `MargemCard` | Card de margem do servidor (mobile e web) |
| `OperacoesGrid` | Grade 2×4 de operações (averbar/reservar) |
| `ContratosTable` | Tabela de contratos com filtros checkbox |
| `ContratoActions` | 6 botões de ação (imprimir/quitar/suspender/cancelar/alongar/alterar) |
| `FilterBar` | Pesquisar + filtros + exportar |
| `DataCorteCard` | Card calendário com data de corte por convênio |
| `ComunicadoCarrossel` | Carrossel de banners de prefeituras |

Lista completa em [packages/ui/src/web/index.ts](packages/ui/src/web/index.ts).

---

## 7. Ciclo de edit → deploy

### Dev local (preview instantâneo)

```bash
pnpm --filter @atlas/web dev
# abre http://localhost:5173 com hot-reload
```

### Deploy em produção (Cloudflare Pages)

```bash
# 1. Garante que pacotes internos estão buildados (só na primeira vez ou se mexer em @atlas/ui)
pnpm --filter @atlas/ui --filter @atlas/sdk --filter @atlas/types build

# 2. Build do web
pnpm --filter @atlas/web build

# 3. Deploy
export CLOUDFLARE_API_TOKEN="<seu-token>"
wrangler pages deploy apps/web/dist --project-name=atlas-web --branch=main --commit-dirty=true
```

URL: https://atlas-web-6ef.pages.dev (production) — cada deploy gera também uma preview `<hash>.atlas-web-6ef.pages.dev`.

---

## 8. Checklist antes de deployar

- [ ] `pnpm --filter @atlas/web typecheck` → verde
- [ ] Tema escuro e claro testados (use o botão "Tema escuro" no header)
- [ ] Largura testada em 1920px (centralizado) e ~768px (responsive não quebra)
- [ ] CPF/PII não aparece em logs (`console.log` deve ser removido)
- [ ] Se mexeu em componente do `@atlas/ui`, rodou `pnpm --filter @atlas/ui build` antes do build do web

---

## 9. FAQ rápido

**"Onde fica o header do site?"** → No `layout.tsx` do perfil correspondente (`servidor`, `banco` ou `averbadora`).

**"Como adiciono um link no menu?"** → Edite o array `NAV` no `layout.tsx` do perfil.

**"Como mudo a cor do tema?"** → Em [packages/ui/src/tokens/tokens.css](packages/ui/src/tokens/tokens.css) (dark e light), depois rebuild do `@atlas/ui` e do web.

**"Como mudo a largura máxima do conteúdo?"** → No `<main>` do `layout.tsx` do perfil — hoje está `maxWidth: 1280`.

**"Onde fica o login?"** → [apps/web/src/routes/login.tsx](apps/web/src/routes/login.tsx). Tela única que detecta o perfil pelo identifier (CPF → servidor; email → banco/averbadora).

**"Onde adiciono uma chamada de API nova?"** → Adicione o método em [packages/sdk/src/client.ts](packages/sdk/src/client.ts) e use `atlas.<novoMetodo>()` na página. Sempre via `useQuery` (TanStack Query) para cache.

**"Não está aparecendo a alteração depois do deploy."** → Cache do navegador. Ctrl+Shift+R (hard reload). Ou abra na URL `<hash>.atlas-web-6ef.pages.dev` retornada pelo deploy.
