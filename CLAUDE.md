# CLAUDE.md — Areluna Call Analyzer (Atlas OS Comercial)

Guia de comportamento para o Claude Code neste repositório. Leia antes de qualquer tarefa.

---

## Contexto do Projeto

Sistema de inteligência comercial **single-tenant** para clínicas médicas. Cada cliente é um fork isolado deste repositório com Vercel + Supabase próprios. Sem multi-tenancy. Sem SaaS.

Este fork é o **Instituto Areluna do Porto** (implantodontia de alto ticket, Portugal). O produto avalia **calls comerciais** gravadas: as gravações ficam no **SharePoint** (estrutura `NomeDoCloser/arquivo.mov`), são transcritas via **Whisper** e analisadas pela IA com o **Método Vitor Balduino Oliveira** (régua Sinal + Marcação). O resultado vira score + diagnóstico por call, agregado numa **ronda semanal** enviada por email.

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

### Server vs Client

- Queries ao banco: sempre em Server Components ou Route Handlers com `createServiceClient()` (service role, bypassa RLS)
- Frontend autenticado: `createBrowserClient()` via `lib/supabase/client.ts`
- Middleware: `lib/supabase/middleware.ts`

---

## Pipeline de Análise de Calls

Quatro crons encadeados por status na tabela `comercial.calls`:

```
sync-sharepoint (*/15)   → lista a pasta SharePoint, cria 1 call por arquivo novo.
                           Closer = nome da pasta, resolvido via resolver-closer.ts.
                           status: transcricao_status='pendente'
transcrever-calls (*/5)  → baixa o arquivo, extrai áudio (Whisper + ffmpeg), transcreve.
                           status: 'concluida' → status_analise='aguardando_analise'
analise-calls (*/5)      → roda o Método Vitor (analyze-call.ts), grava score/diagnóstico.
                           status_analise: 'analisada'
ronda-semanal (seg 09h)  → agrega as calls da semana num email; backfill-rondas cobre falhas.
```

- **Closers** (`comercial.closers`): cadastrados com `nome` = nome exato da pasta no SharePoint. O `resolver-closer.ts` faz match por `normalizarTexto(nome)`. Seed inicial: `scripts/seed-closers.ts`.
- **Whisper** (`lib/modules/whisper.ts`): aceita até 25MB e não engole container de vídeo. Para qualquer `.mov`/`.mp4` (magic `ftyp`) ou arquivo grande, extrai áudio **mono 32kbps m4a** via `ffmpeg` antes de enviar (~104 min cabem em 25MB). Calls mais longas estouram o limite → precisam de chunking (follow-up).
  - **⚠️ Produção (Vercel):** o `ffmpeg` é chamado via `execFile` (binário do sistema). O runtime serverless do Vercel **não tem ffmpeg por padrão** — precisa de layer/binário empacotado ou serviço externo de extração. Hoje só roda local.
- **Análise IA** (`lib/prompts/analyze-call.ts`): Método Vitor, 7 blocos (A–G) + bônus, 8 sinais vermelhos, saída JSON. `PROMPT_VERSION` versiona o prompt. O modelo às vezes embrulha o JSON em ```` ```json ````; o `analisador-calls.ts` faz strip antes do `JSON.parse`.

---

## Estrutura de Arquivos

```
app/
  (app)/          # Telas autenticadas: dashboard, calls, closers, rondas, configuracoes
  (auth)/         # Login, definir-senha, redefinir-senha
  api/
    cron/         # 5 crons: sync-sharepoint, transcrever-calls, analise-calls,
                  #          ronda-semanal, backfill-rondas (protegidos por CRON_SECRET)
lib/
  modules/        # Lógica de negócio: sharepoint-client, whisper, parser-nome-arquivo,
                  #   resolver-closer, sync-sharepoint, transcritor-calls, analisador-calls,
                  #   gerador-ronda, email-renderer-ronda, enviador-resend
  prompts/        # System prompt Claude (analyze-call — Método Vitor)
  supabase/       # Clientes (client, server, middleware) + types.ts
  utils/          # normalizar.ts (normalização de texto p/ match de closer)
  phone.ts        # Normalização E.164
  log.ts          # Logger estruturado JSON
scripts/          # resolve-sharepoint-ids, seed-closers, seed-test-closer, create-user
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
| `SHAREPOINT_TENANT_ID` | `lib/modules/sharepoint-client.ts` e `scripts/resolve-sharepoint-ids.ts` |
| `SHAREPOINT_CLIENT_ID` | Idem |
| `SHAREPOINT_CLIENT_SECRET` | Idem — somente server-side |
| `SHAREPOINT_SITE_ID` | Resolvido via `tsx scripts/resolve-sharepoint-ids.ts` |
| `SHAREPOINT_DRIVE_ID` | Idem |
| `SHAREPOINT_FOLDER_ITEM_ID` | Idem |
| `OPENAI_API_KEY` | `lib/modules/whisper.ts` (transcrição) — somente server-side |
| `ANTHROPIC_API_KEY` | `lib/modules/analisador-calls.ts` (Método Vitor) — somente server-side |
| `RESEND_API_KEY` | `lib/modules/enviador-resend.ts` (ronda semanal) — somente server-side |

---

## Fluxo de Deploy (por cliente)

1. Fork do template → `comercial-os-clinica-XYZ`
2. Criar projeto Supabase `sa-east-1` na conta do cliente
3. `supabase db push` (ou SQL Editor para redes restritas)
4. Criar projeto Vercel, conectar repo, preencher env vars
5. Configurar Resend (API key em `RESEND_API_KEY`) para a ronda semanal
6. `npm run admin:create-user` para dono, head e admin BA
7. Configurar credenciais SharePoint: `tsx scripts/resolve-sharepoint-ids.ts "<URL_DA_PASTA>"` → colar os IDs no `.env.local`
8. Cadastrar os closers (nome = nome das pastas no SharePoint) — `scripts/seed-closers.ts` como base
9. Validar end-to-end: 1 arquivo real na pasta → sync → transcrever → analisar
