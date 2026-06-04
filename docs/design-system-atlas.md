# Design System — Atlas Comercial (implementado)

Versão: 1.0 · Stack: Next.js + Tailwind v3.4 + Framer Motion + Recharts.
Documento legível por IA. Reflete o que **está no código** (não a spec original). Atualizar ao criar tokens/componentes novos.

> Estética: editorial premium warm — browns, dourado fosco, fundos creme/areia. Sem dark mode. Sem cores neon fora dos tokens de status.

---

## Tokens (fonte de verdade: `tailwind.config.ts`)

Cores definidas em **hex literal** (não há theme switching; CSS-vars HSL foram removidas). Suportam `/opacity` (ex.: `bg-success/10`).

### Browns / neutros
| Classe | Hex |
|---|---|
| `primary-900` / `primary` (DEFAULT) | `#2E2620` |
| `primary-800` | `#3D332C` |
| `primary-700` | `#4A3F37` |
| `primary-600` | `#6B5D52` |
| `primary-foreground` | `#FAF6F0` |

### Gold (único accent)
| Classe | Hex |
|---|---|
| `gold-500` / `gold` (DEFAULT) | `#C9A86B` |
| `gold-400` | `#D9BC85` |
| `gold-200` | `#EBD9B8` |

⚠️ **Não existem** `gold-600/700/300/100` nem `primary-500..50`. Para hover de gold use `gold-400`.

### Fundos / superfícies
| Classe | Hex | Uso |
|---|---|---|
| `bg-cream` / `background` | `#FAF6F0` | fundo de página (`<body>`) |
| `bg-sand` / `secondary` / `muted` / `accent` | `#F1E9DD` | superfícies alternativas, hover, insets |
| `bg-surface` / `card` / `popover` | `#FFFFFF` | cards/painéis principais |
| `border` / `input` (border-soft) | `#E5DBCB` | bordas sutis |
| `ring` | `#C9A86B` | focus ring (gold) |

### Texto
- Corpo: `text-foreground` (`#2E2620`).
- Secundário: `text-primary-700` / `text-primary-600`.
- Muted/metadata/placeholder: `text-muted-foreground` (`#9A8C7E`).
- Inverso (sobre sidebar dark): `text-cream` (`#FAF6F0`).
- ⚠️ Não use `text-secondary`/`text-muted` como cor de texto — esses tokens resolvem para fundos (sand/areia). Use os acima.

### Status (só para valores métricos e badges funcionais; nunca decoração)
| Classe | Hex | Semântica |
|---|---|---|
| `success` | `#5B7A5A` | positivo / EXCELENTE / tendência up |
| `warning` | `#C49B5C` | atenção / REGULAR |
| `error` / `destructive` (alias) | `#A85A4D` | negativo / INSUFICIENTE / erros |
| `info` | `#6F7D8C` | informativo / BOM |

Mapa de classificação (Método Vitor): EXCELENTE→`success`, BOM→`info`, REGULAR→`warning`, INSUFICIENTE→`error`.
`scoreBadgeVariant`: `>=70 success`, `>=40 warning`, `else error`, `null muted`.

---

## Tipografia (`app/globals.css` · `@layer components`)

Fontes via `next/font/google` em `app/layout.tsx`, expostas como CSS vars:
- **Cormorant Garamond** → `font-serif` / `--font-cormorant` (weights 300/400/500). Displays, headings, wordmark.
- **Inter** → `font-sans` / `--font-inter` (weights 400/500/600). UI, corpo, labels, botões.

Classes utilitárias:
| Classe | Definição |
|---|---|
| `.display-hero` | Cormorant 72px / 300 / lh 1.05 / ls -0.01em |
| `.display-section` | Cormorant 56px / 300 / lh 1.08 (título de página / H1) |
| `.display-card` | Cormorant 28px / 500 (valores de KPI, headline de card) |
| `.eyebrow` | Inter 13px / 500 / uppercase / ls 0.12em |
| `.btn-primary` / `.btn-secondary` | Inter 13px / 500 / ls 0.08em |

Proibições: Cormorant em corpo/inputs/tabelas; Inter em displays; `font-bold` em Cormorant (usar 300/500); headings em lowercase; `.eyebrow` sempre uppercase.

---

## Radius, sombras, easing
- Radius: `rounded-pill` (9999), `rounded-card` (24px), `rounded-card-lg` (32px), `rounded-xl` (12), `rounded-lg` (8), `rounded-md` (6), `rounded-sm` (4).
- Sombras: `shadow-soft` (cards), `shadow-elevated` (hover/modais), `shadow-gold-glow` (hover botão primary).
- Easing: `ease-standard` (`cubic-bezier(0.4,0,0.2,1)`), também em `:root --ease-standard`.
- `::selection`: bg `gold-200`, texto `primary-900`.

---

## Componentes (em `components/ui/` salvo nota)

- **Button** (`button.tsx`, CVA): variants `primary` (bg primary-800 + hover gold-glow), `secondary`, `ghost`, `soft` (sand→gold-200), `link`. Aliases legados: `default`/`outline`/`destructive`. Sizes `sm/md/lg/icon` (+ alias `default`). Prop `loading` → `<LoaderCircle animate-spin>`. Sempre `rounded-pill`. Ícones `stroke-width:1.6`.
- **Card / CardSand** (`card.tsx`): `rounded-card border-border shadow-soft`, surface (white) ou sand. Sem padding embutido — adicione `p-6`/`p-7`. `CardTitle` é `font-serif`.
- **Badge** (`badge.tsx`, CVA): `default, gold, success, warning, error, info, muted` (+ aliases `secondary`/`destructive`). `rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wider`.
- **Tabs** (`tabs.tsx`): list `rounded-pill bg-sand`; trigger ativo `bg-primary-800 text-cream shadow-sm`, uppercase tracking-wider.
- **Select** (`select.tsx`): trigger `rounded-pill`, borda gold no hover/focus, chevron gold; content `rounded-xl shadow-elevated`; item hover sand, checked gold-200.
- **PageHeader** (`page-header.tsx`): `eyebrow?`, `title` (.display-section), `subtitle?`, `ornament?`, `right?`. `mb-10`. Substitui headers ad-hoc. `title`/`subtitle` são `string` — conteúdo JSX vai no slot `right`.
- **OrnamentalDivider** (`ornamental-divider.tsx`): `variant "left"|"center"`. Linha gold → losango gold → linha gold.
- **MotionCard** (`motion-card.tsx`, framer-motion): entrada `opacity/​y:8→0`, 0.4s easeOut; `hover` opcional (`y:-2`); `delay` p/ stagger.
- **KpiCard** (`components/dashboard/kpi-card.tsx`): API PT mantida — `titulo, valor, delta, sufixo, destaque`. Valor em `.display-card`; delta `text-success`/`text-error`; `destaque` → accent gold.

### Layout
- **AppShell** (`components/layout/app-shell.tsx`): sidebar fixa `w-[240px] bg-primary-900 text-cream`, wordmark "ARELUNA" (Cormorant, `tracking-[0.32em]`) + eyebrow gold "ATLAS · COMERCIAL OS". Main `md:pl-[240px]`, container `max-w-[1400px] px-12 py-10`.
- **SidebarNav** (`sidebar-nav.tsx`): item ativo `border-l-2 border-gold-500 bg-white/5 text-cream` + ícone gold; inativo `text-cream/70 hover:bg-white/5`.

### Charts (Recharts — precisa de hex literal)
`score-chart.tsx`: grid `#E5DBCB`, eixos `#6B5D52`, tooltip bg `#FFFFFF`/border `#E5DBCB`, linha `#C9A86B`.

---

## Decisões de implementação (deltas vs. spec original)
- **Não construídos** (sem consumidor neste produto — call-analyzer, não CRM): `ChannelBadge`, `ConversionFunnel`, `RevenueByChannelChart`, `JourneyTimeline`, `Drawer`.
- **Removidos**: `vaul` (drawer), `next-themes` (sonner fixo em `theme="light"`). Sem dark mode.
- **Hex literal** em vez de CSS-vars HSL (não há theme switching).
- **Variants aditivos com aliases** em Button/Badge para não quebrar call sites shadcn legados.
- Migração foi, na prática, uma **inversão dark→light**: as páginas hardcodavam slate-dark sobre um `:root` light.
