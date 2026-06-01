# CLAUDE.md — Atlas OS Comercial

Guia de comportamento para o Claude Code neste repositório. Leia antes de qualquer tarefa.

---

## Contexto do Projeto

Sistema de inteligência comercial **single-tenant** para clínicas médicas brasileiras. Cada cliente é um fork isolado deste repositório com Vercel + Supabase próprios. Sem multi-tenancy. Sem SaaS.

**BA Consultoria** mantém conta `admin` em `autorizados` por cliente. Transferência de repositório + infra acontece no kickoff.

---

## Stack — Decisões Travadas

| Decisão | Regra |
|---|---|
| ORM | **Supabase JS direto**. Sem Drizzle, sem Prisma, sem query builders |
| Schema | **`comercial`** em todas as queries: `.schema("comercial").from(...)` |
| Erros | **`.throwOnError()`** obrigatório em toda query. Sem `if (error)` manual |
| Queries complexas | Viram RPC (função Postgres). Não criar queries SQL inline longas no TS |
| Tailwind | **v3.4**. Não migrar para v4 |
| Modelo IA | **`claude-sonnet-4-6`** em todas as análises. Não trocar sem motivo explícito |
| Prompt caching | **`cache_control: { type: "ephemeral" }`** em todos os system prompts |
| Timestamps | **`timestamptz`** no banco. Nunca `timestamp without time zone` |
| Telefone | **E.164** (`+5511...`). Normalizar via `lib/phone.ts` |
| Migrations | Arquivos em `supabase/migrations/`. Nunca editar migration já aplicada — criar nova |
| Tipos | Gerados em `lib/supabase/types.ts`. Atualizar após cada migration |

---

## Padrões de Código

### Queries Supabase

```ts
// Correto
const { data } = await supabase
  .schema("comercial")
  .from("leads")
  .select("id, nome, status")
  .eq("id", id)
  .single()
  .throwOnError();

// Errado — nunca omitir .throwOnError() nem usar .schema sem "comercial"
const { data, error } = await supabase.from("leads").select("*");
```

### Crons

Toda rota de cron valida `Authorization: Bearer $CRON_SECRET` antes de executar. O Vercel injeta o header automaticamente; não remover essa validação.

### Webhooks

Padrão ack-first obrigatório: valida secret → insere em `eventos_brutos` → responde `200`. O processamento acontece no cron `processar-eventos`. Nunca processar inline no webhook.

### Server vs Client

- Queries ao banco: sempre em Server Components ou Route Handlers com `createServiceClient()` (service role, bypassa RLS)
- Frontend autenticado: `createBrowserClient()` via `lib/supabase/client.ts`
- Middleware: `lib/supabase/middleware.ts`

---

## Estrutura de Arquivos

```
app/
  (app)/          # Telas autenticadas (protegidas por middleware)
  (auth)/         # Login, definir-senha, redefinir-senha
  api/
    cron/         # 7 crons (protegidos por CRON_SECRET)
    webhooks/     # evolution + zapier-plaud
lib/
  modules/        # Lógica de negócio (sem dependências de framework)
  prompts/        # System prompts Claude (analyze-call, analyze-whatsapp)
  supabase/       # Clientes (client, server, middleware) + types.ts
  phone.ts        # Normalização E.164
  log.ts          # Logger estruturado JSON
supabase/
  migrations/     # SQL versionado (nunca editar o que já foi aplicado)
  seeds/          # seed.sql para dev local; _template.sql para kickoff de cliente
  templates/      # Emails auth pt-BR (invite.html, recovery.html)
```

---

## O Que Não Fazer

- **Não adicionar multi-tenancy** (`clinic_id`, row por cliente, etc.) — decisão YAGNI explícita
- **Não criar abstrações preventivas** — três linhas repetidas é melhor que abstração prematura
- **Não implementar LGPD** (consentimento automático, pseudonimização, right-to-forget) — adiado para v2
- **Não adicionar 2FA, dark mode, exportação CSV** — fora de escopo v1
- **Não reabrir decisões arquiteturais** listadas neste arquivo sem motivo concreto novo
- **Não commitar `.env.local`** — está no `.gitignore` via `.env*`

---

## RLS e Permissões

- **`service_role`** bypassa RLS automaticamente (usado em server-side e crons)
- **`authenticated`** passa por RLS — políticas verificam `comercial.is_authorized()`
- **`anon`** não tem acesso a nada no schema `comercial`

Toda tabela nova precisa de: `ENABLE ROW LEVEL SECURITY` + policy + `GRANT` para `service_role` e `authenticated`.

---

## Variáveis de Ambiente Necessárias

Ver `.env.example` na raiz. Resumo das críticas:

| Variável | Onde usar |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Somente server-side/crons. Nunca expor ao cliente |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend (safe to expose) |
| `CRON_SECRET` | Validar header nas rotas `/api/cron/*` |
| `EVOLUTION_WEBHOOK_SECRET` | Validar HMAC nos webhooks Evolution |
| `ZAPIER_WEBHOOK_SECRET` | Validar token nos webhooks Zapier |
| `ANTHROPIC_API_KEY` | Somente server-side |

---

## Fluxo de Deploy (por cliente)

1. Fork do template → `comercial-os-clinica-XYZ`
2. Criar projeto Supabase `sa-east-1` na conta do cliente
3. `supabase db push` (ou SQL Editor para redes restritas)
4. Criar projeto Vercel, conectar repo, preencher env vars
5. Configurar Resend como SMTP do Supabase Auth
6. `npm run admin:create-user` para dono, head e admin BA
7. Configurar Evolution instance em `/configuracoes`
8. Validar end-to-end com 1 mensagem + 1 call reais
