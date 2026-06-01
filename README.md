# Atlas OS Comercial

Sistema de inteligência comercial para clínicas médicas brasileiras. Captura conversas WhatsApp e calls de fechamento passivamente, analisa via IA, e entrega relatórios semanais consolidados a dono e head comercial — sem alterar o fluxo de trabalho da equipe operacional.

---

## Status do Projeto (2026-05-16)

### Concluído
- [x] Schema completo aplicado no Supabase remoto (13 tabelas, RLS, RPCs, GRANTs)
- [x] Todos os módulos de negócio (`lib/modules/`)
- [x] Webhooks Evolution + Zapier/Plaud (ack-first)
- [x] 7 crons configurados no Vercel (`vercel.json`)
- [x] Todas as telas do painel (dashboard, leads, calls, whatsapp, rondas, configurações, auth)
- [x] Templates de email pt-BR (invite + recovery)
- [x] Suite de testes (8 integração + 3 unitários)
- [x] Script de provisionamento de usuários (`npm run admin:create-user`)
- [x] Tipos TypeScript gerados do schema (`lib/supabase/types.ts`)
- [x] Build limpo (zero erros de tipo)
- [x] Repositório no GitHub

### Próximos passos
- [ ] Deploy no Vercel (conectar repo + env vars de produção)
- [ ] Criar primeiro usuário admin via `npm run admin:create-user`
- [ ] Configurar Resend como SMTP do Supabase Auth (dashboard Supabase → Auth → SMTP)
- [ ] Configurar Evolution instance real em `/configuracoes`
- [ ] Teste end-to-end: 1 mensagem WhatsApp real + 1 call de teste
- [ ] Rodar testes de integração (requer Docker + `supabase start`)

---

## Visão Geral

**Problema:** secretárias atendem leads no WhatsApp e closers gravam calls no Plaud. Ninguém revisa qualidade ou detecta tendências até o resultado do mês aparecer.

**Solução:** captura passiva das duas fontes, análise estruturada por Claude, e dois emails toda segunda-feira às 6h com resumo da semana + painel web para investigação pontual.

**Princípio:** usuários do sistema (dono + head) são analíticos, não operacionais. Secretárias e closers nunca tocam neste sistema.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| UI | Tailwind v3.4 + shadcn/ui + Recharts |
| Banco | Supabase (PostgreSQL, schema `comercial`, região `sa-east-1`) |
| IA — análise | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| IA — transcrição | OpenAI Whisper |
| Email | Resend |
| Webhooks entrada | Evolution API (WhatsApp) + Zapier/Plaud (calls) |
| Error tracking | Sentry |
| Deploy | Vercel Pro (timeout 60s) |

---

## Pré-requisitos

- Node.js ≥ 20
- Supabase CLI (`npm i -g supabase`)
- Docker (para testes de integração com Supabase local)
- Contas: Supabase, Vercel, Resend, Anthropic, OpenAI, Sentry, Evolution API

---

## Instalação

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd atlas-os-comercial
npm install
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (nunca exposta ao frontend) |
| `NEXT_PUBLIC_APP_URL` | URL pública do app (ex: `https://clinica.vercel.app`) |
| `RESEND_API_KEY` | Chave da API Resend |
| `ANTHROPIC_API_KEY` | Chave Anthropic para análise via Claude |
| `OPENAI_API_KEY` | Chave OpenAI para transcrição Whisper |
| `EVOLUTION_WEBHOOK_SECRET` | Secret para validar webhooks da Evolution |
| `ZAPIER_WEBHOOK_SECRET` | Secret para validar webhooks do Zapier/Plaud |
| `CRON_SECRET` | Bearer token para proteger rotas de cron |
| `SENTRY_DSN` | DSN do Sentry (opcional em dev) |
| `SENTRY_ORG` | Organização no Sentry |
| `SENTRY_PROJECT` | Projeto no Sentry |

Gere os secrets com:

```bash
openssl rand -hex 32
```

### 3. Banco de dados

```bash
# Aplicar todas as migrations
supabase db push

# Popular configuração inicial do cliente
# Edite supabase/seeds/_template.sql com os dados do cliente, salve como _cliente_X.sql
supabase db execute -f supabase/seeds/_cliente_X.sql
```

### 4. Criar usuários iniciais

```bash
# Criar dono
npm run admin:create-user -- --email dono@clinica.com --role dono --name "Nome"

# Criar head comercial
npm run admin:create-user -- --email head@clinica.com --role head --name "Nome"

# Criar conta BA (admin)
npm run admin:create-user -- --email ba@benitesalbuquerque.com.br --role admin
```

Cada usuário recebe um link de recovery por email para definir a própria senha.

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

---

## Kickoff por Cliente (checklist BA)

1. Criar projeto Supabase em `sa-east-1`
2. Configurar Resend como SMTP do Supabase Auth + templates pt-BR
3. Criar projeto Vercel, conectar ao fork, configurar env vars
4. `supabase db push`
5. Preencher `supabase/seeds/_template.sql` → `_cliente_X.sql` e rodar
6. `npm run admin:create-user` para cada email (dono, head, admin BA)
7. Configurar Evolution instances via `/configuracoes`
8. Configurar Zapier "Plaud → POST webhook" com `ZAPIER_WEBHOOK_SECRET`
9. Validar: 1 mensagem WhatsApp real + 1 call de teste → verificar painel

---

## Fluxo de Dados

### WhatsApp

```
Secretária fala no WhatsApp
  → Evolution API dispara POST /api/webhooks/evolution
  → Evento inserido em eventos_brutos (ack < 100ms)
  → Cron processar-eventos (1min): cria Lead + Conversa + Mensagem
  → Cron analise-whatsapp (30min): analisa conversas ociosas > 1h
    → Claude Sonnet 4.6 → score + tags + status sugerido + origem
    → Salva em analises_whatsapp
    → Atualiza status do lead (lead-status-machine)
    → Se score < threshold → alerta imediato por email
```

### Calls

```
Closer grava call no Plaud
  → Zapier dispara POST /api/webhooks/zapier-plaud
  → Evento inserido em eventos_brutos
  → Cron processar-eventos (1min): cria Call (com transcricao Plaud)
  → Cron analise-calls (5min):
    → [Paralelo] Análise Claude: score + fases + diagnóstico
    → [Paralelo] Match call→lead (3 camadas):
        1. Telefone exato
        2. Fuzzy SQL com pg_trgm (top 15)
        3. Claude decide entre candidatos ambíguos
    → Se score insuficiente → alerta imediato por email
```

### Rondas semanais

```
Toda segunda-feira às 6h (BRT = 9h UTC)
  → Cron ronda-semanal: agrega semana anterior
  → Gera snapshot whatsapp + snapshot calls (idempotente por UNIQUE periodo_inicio)
  → Renderiza HTML email responsivo
  → Envia via Resend para destinatários configurados
  → Cron backfill-rondas (diário ter-dom 9h05 UTC): regenera rondas que falharam
```

---

## Módulos (`lib/modules/`)

| Módulo | Responsabilidade |
|---|---|
| `captura-evolution` | Valida webhook Evolution, insere em `eventos_brutos`, ack-first |
| `captura-plaud` | Valida webhook Zapier/Plaud, aplica mapping configurável |
| `processador-eventos` | Consome fila `eventos_brutos`: cria Lead/Conversa/Mensagem/Call. Retry até 5×, dead-letter + email BA |
| `whisper` | Transcreve áudios WhatsApp via OpenAI Whisper |
| `analisador-whatsapp` | Analisa conversas ociosas via Claude, salva `analises_whatsapp`, atualiza status e origem |
| `analisador-calls` | Analisa calls via Claude, roda análise e match em paralelo |
| `matcher-call-lead` | Pipeline em camadas: telefone exato → fuzzy SQL → Claude IA |
| `lead-status-machine` | Transições de status (mais forte vence, respeita override manual) |
| `gerador-ronda` | Agrega dados do período, persiste snapshot com idempotência |
| `email-renderer-ronda` | Renderiza HTML responsivo das rondas (dark theme, gráficos CSS) |
| `enviador-resend` | Envia rondas via Resend com retry (3×), registra resultado em `rondas` |
| `email-alerta` | Templates de alerta imediato (score baixo, dead-letter) |
| `alerta-imediato` | Dispara alerta se score < threshold, throttle 1/lead/dia em memória |

---

## API Routes

### Webhooks (entrada de dados)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/webhooks/evolution` | Mensagens WhatsApp via Evolution API |
| POST | `/api/webhooks/zapier-plaud` | Calls via Zapier/Plaud |

Ambos respondem `200` imediatamente (ack-first) e processam de forma assíncrona via cron.

### Crons (protegidos por `CRON_SECRET`)

| Rota | Agenda (UTC) | Descrição |
|---|---|---|
| `/api/cron/processar-eventos` | `* * * * *` | Processa fila de eventos brutos |
| `/api/cron/analise-calls` | `*/5 * * * *` | Analisa calls pendentes (batch 10) |
| `/api/cron/analise-whatsapp` | `*/30 * * * *` | Analisa conversas ociosas > 1h (batch 10) |
| `/api/cron/ronda-semanal` | `0 9 * * 1` | Gera rondas da semana anterior (seg 6h BRT) |
| `/api/cron/backfill-rondas` | `5 9 * * 2-7` | Regenera rondas que falharam |
| `/api/cron/classify-origin-stale` | `0 6 * * *` | Marca origem pendente > 14 dias como `desconhecido` |
| `/api/cron/recompute-stale-leads` | `30 6 * * *` | Detecta `sem_resposta` por inatividade > 48h |

Para acionar manualmente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<seu-dominio>.vercel.app/api/cron/analise-whatsapp
```

### REST (autenticados)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/calls/[id]/match` | Confirmar/trocar match call→lead |
| POST | `/api/leads/[id]/classificar` | Classificar origem manualmente |
| PATCH | `/api/leads/[id]/status` | Editar status manualmente |
| POST | `/api/conversas/[id]/reanalisar` | Forçar re-análise de conversa |
| POST/PATCH/DELETE | `/api/evolution-instances/[id]` | CRUD de instâncias Evolution |
| POST | `/api/configuracoes` | Salvar configurações da clínica |
| POST | `/api/configuracoes/testar-evolution` | Testar conexão com instância Evolution |
| POST | `/api/configuracoes/email-teste` | Disparar email de teste |

---

## Telas do Painel

| Rota | Descrição |
|---|---|
| `/login` | Autenticação email + senha |
| `/auth/definir-senha` | Definição de senha (recovery link inicial) |
| `/auth/redefinir-senha` | Redefinição de senha (esqueci senha) |
| `/dashboard` | KPIs + gráfico de evolução + listas de destaque |
| `/whatsapp` | Lista de conversas com filtros |
| `/whatsapp/[id]` | Chat read-only + análise IA + histórico + botão re-analisar |
| `/calls` | Tabs: Aguardando Match / Analisadas |
| `/calls/[id]` | Performance por 8 fases + diagnóstico + transcrição + match |
| `/leads` | Tabela paginada de leads |
| `/leads/[id]` | Dados + timeline + scores + edição de status |
| `/leads/pendentes` | Fila de classificação de origem em massa |
| `/rondas` | Lista de rondas geradas |
| `/rondas/[id]` | Visualização rica do snapshot |
| `/configuracoes` | Destinatários, thresholds, instâncias Evolution |

---

## Schema Principal (`comercial`)

Todas as tabelas têm `id uuid PK`, `created_at timestamptz`, `updated_at timestamptz`, RLS ativo.

| Tabela | Propósito |
|---|---|
| `leads` | Cadastro com status, origem e telefone E.164 UNIQUE |
| `conversas` | Sessões WhatsApp por lead |
| `mensagens` | Mensagens individuais (texto, áudio, imagem…) |
| `calls` | Calls do Plaud com transcricao e match_status |
| `analises_whatsapp` | Histórico de análises de conversas (score, tags, resumo…) |
| `analises_calls` | Histórico de análises de calls (fases, classificação, diagnóstico…) |
| `rondas` | Snapshots semanais gerados + status de envio |
| `eventos_brutos` | Fila ack-first de webhooks (retry, dead-letter) |
| `evolution_instances` | Instâncias Evolution configuradas |
| `configuracoes` | Singleton (id=1): destinatários, thresholds, mapping Zapier |
| `autorizados` | Usuários com role (dono, head, admin) |
| `lead_eventos` | Timeline de eventos por lead |
| `auditoria` | Log de leituras e escritas |

### Status do lead

Máquina de estados unidirecional (mais forte sempre vence):

```
novo → em_atendimento → sem_resposta → agendou → compareceu → perdido → fechou
```

Override manual (`status_origem = 'manual'`) congela o status e ignora sugestões da IA.

### Match call→lead

| Nível | Estratégia | Resultado |
|---|---|---|
| 1 | Telefone exato em `leads` | `confirmado_auto` |
| 2 | Fuzzy SQL via `pg_trgm`, score ≥ 0.85 | `confirmado_auto` |
| 3 | Claude decide entre top 3 ambíguos, confidence ≥ 0.85 | `confirmado_auto` |
| — | Confidence < 0.85 | `sugerido` (requer confirmação manual) |
| — | Nenhum candidato | `pendente` |

---

## Testes

### Unitários

Testam funções puras sem DB:

```bash
npx vitest run --project unit
```

Cobertura: `lead-status-machine` (transições), `matcher-call-lead` (classificação de candidatos), `phone-normalizer` (E.164).

### Integração

Testam comportamento real contra Supabase local:

```bash
# Iniciar Supabase local (requer Docker)
supabase start

# Rodar testes de integração
npx vitest run --project integration
```

Cobertura: `captura-evolution`, `captura-plaud`, `processador-eventos`, `analisador-whatsapp`, `analisador-calls`, `gerador-ronda`, `lead-status-machine` (DB), `alerta-imediato`.

Fronteiras mockadas: Anthropic SDK, OpenAI Whisper, Resend.

---

## Comandos do Dia a Dia

```bash
# Dev
npm run dev

# Verificações antes de commit
npm run typecheck
npm run lint
npx vitest run --project unit

# Formatação
npm run format

# Build de produção
npm run build

# Criar usuário
npm run admin:create-user -- --email user@clinica.com --role head --name "Nome"

# Migrations
supabase db push                              # Aplicar em produção
supabase migration new nome_da_migration      # Criar nova migration
```

---

## Observabilidade

- **Sentry** — error tracking em frontend, API routes e crons. Cron monitors automáticos via `automaticVercelMonitors: true`.
- **Logs estruturados** — `lib/log.ts` (wrapper JSON sobre `console`). Disponíveis no Vercel Logs (retenção 7d no Pro).
- **Dead-letter** — após 5 tentativas falhas, evento vai para `dead_letter` e BA recebe email de alerta.

---

## Modelo de Deployment

Cada cliente é um fork isolado do repositório-template com Vercel + Supabase próprios. Sem multi-tenancy. Updates chegam por `git merge upstream/main` opt-in.

Todas as chaves de API (Anthropic, Resend, OpenAI…) ficam na conta do cliente. BA mantém conta `admin` em `autorizados` para suporte.

---

## Estimativa de Custo de IA por Cliente

| Serviço | Volume típico | Custo estimado/mês |
|---|---|---|
| Claude Sonnet 4.6 (análise WhatsApp) | ~200 conversas | ~US$ 8 |
| Claude Sonnet 4.6 (análise calls + match) | ~30 calls | ~US$ 7 |
| Claude Sonnet 4.6 (rondas) | 8 por mês | ~US$ 3 |
| OpenAI Whisper (transcrição áudio) | variável | ~US$ 5–10 |
| **Total** | | **~US$ 20–25/mês** |

Vai na conta do cliente. Prompt caching `ephemeral` ativo em todos os prompts de análise para reduzir custo.

---

## Fora de Escopo (v1)

- LGPD compliance completo (consentimento automatizado, pseudonimização, right-to-forget)
- 2FA
- Dark mode
- Análise de imagens/documentos via Claude Vision
- Multi-tenancy SaaS
- Exportação de dados (CSV)
- Gestão de usuários via UI
- Notificações push / Slack
- Feedback loop para IA aprender com overrides manuais
