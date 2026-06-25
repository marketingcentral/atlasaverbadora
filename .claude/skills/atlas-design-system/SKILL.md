---
name: atlas-design-system
description: Use whenever creating or editing UI in apps/web or apps/mobile — enforces use of @atlas/ui tokens and primitives, the official navy/gold/emerald palette, Inter typography, and dark/light theme support. Forbids hard-coded colors and ad-hoc styles.
---

# Atlas — Design System

The source of truth is the demo at `demo/assets/css/tokens.css` and `demo/assets/css/components.css`. The runtime source of truth is `packages/ui` and the MCP server `atlas-design-system`. **Never invent a new color, spacing, radius, or typography value.**

## Palette (use semantic vars, not raw hex)

### Brand (gold + emerald accent)
- `gold-600 #B8964F`, `gold-500 #C9A961`, `gold-400 #D4BC7E`, `gold-300 #E2D1A3`
- `emerald-600 #059669`, `emerald-500 #10B981`, `emerald-400 #34D399`

### Surface (navy + ivory)
- `navy-900 #0A1628` (dark bg), `navy-800 #122038`, `navy-700 #1A2942`, `navy-600 #233556`
- `ivory-50 #FAF8F3` (light bg), `ivory-100 #F3EFE6`, `white #FFFFFF`

### Semantic (theme-aware)
- `--bg`, `--bg-elev`, `--bg-elev-2`, `--surface`, `--surface-solid`
- `--text`, `--text-muted`, `--text-dim`
- `--border`, `--border-strong`
- `--accent` (gold-500 dark / gold-600 light), `--accent-hover`
- `--success` (emerald), `--danger #DC2626`, `--warn #F59E0B`, `--info #3B82F6`

## Typography
- **Sans:** Inter (400/500/600/700/800). Headings 700, body 400-500, buttons 600.
- **Mono:** JetBrains Mono (400/600). For code, badges, identifiers, timestamps.
- **Scale:** `clamp()` for hero, fixed rem otherwise. Body 0.95-1rem, small 0.85rem.

## Spacing (4-based)
`--space-1: 4px`, `-2: 8px`, `-3: 12px`, `-4: 16px`, `-5: 24px`, `-6: 32px`, `-7: 48px`, `-8: 64px`, `-9: 96px`.

## Radius
`--radius-sm: 6px`, `-md: 10px`, `-lg: 16px`, `-xl: 24px`, `-pill: 999px`.

## Shadows
`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-gold` (for gold CTAs).

## Themes
- `[data-theme="dark"]` (default for marketing / mobile splash)
- `[data-theme="light"]`
- Mobile: respect system + override in user settings. Persist with SecureStore.
- Web: `ThemeProvider` from `@atlas/ui` with `system | dark | light`.

## Primitives (web + mobile)
All exposed from `@atlas/ui`:

| Primitive | Variants | Notes |
|---|---|---|
| `Button` | `primary`, `ghost`, `success`, `sm` | Primary uses gold gradient + shadow-gold |
| `Card` | `surface`, `elevated` | Padding `space-5/6`, radius `lg` |
| `Badge` | `dot`, `pill` | Mono font |
| `Pill` (status) | `pendente`, `aceita`, `averbado`, `emdia`, `expirado`, `rejeitada` | Color-coded |
| `Input` | `text`, `password`, `cpf` (masked), `currency` | Floating label |
| `Slider` | — | Gold→emerald gradient track |
| `Tabs` | — | Pill container, gold-gradient active |
| `Modal` | — | Backdrop blur, scrim |
| `Toast` | `info`, `success`, `error` | Bottom-anchor, slide-up |
| `MargemCard` | — | Domain component — used in mobile Home and web Servidor dashboard |

## Rules (enforced)
1. **No hard-coded hex colors** in app code. Always `var(--accent)` (web) or `theme.colors.accent` (mobile/RN).
2. **No new spacing values** outside the scale. If you need it, justify and add to tokens.
3. **No inline font-family**. Components inherit.
4. **Hover effects on web only** (`@media (hover: hover)`).
5. **Touch targets ≥ 44px** on mobile.
6. **Both themes tested** before merge. Take screenshots in both.

## Visual fidelity check
After implementing a screen, compare side-by-side with the corresponding mockup in `demo/demo-ui.html` (mobile) or `demo/features.html` / `demo/index.html` (web). Fonts, weights, paddings, gradients, shadows must match.

## Phone screens canonical reference
The 8 mobile screens in `demo/demo-ui.html` are the spec for the Servidor app:
- `screen-home` — Home with margem card + actions grid + next installment
- `screen-propostas` — Lista de propostas
- `screen-contratos` — Tabs: Todos / Ativos / Quitados
- `screen-contrato` — Detalhe (financeiro + datas + parcelas)
- `screen-simular` — Slider + tabs de parcelas + resultado
- `screen-margem` — 3 categorias (Consignavel / Cartao consignado / Cartao beneficios)
- `screen-ofertas` — Cards de ofertas
- `screen-conta` — Avatar + dados + aparencia + seguranca + logout

## MCP server
Use `atlas-design-system` MCP to:
- Read tokens (`ds://tokens/colors`, etc.)
- Read component source (`ds://components/web/{name}`)
- Generate a component scaffold (`ds_generate_component`)
- Validate palette use (`ds_validate_palette`)
