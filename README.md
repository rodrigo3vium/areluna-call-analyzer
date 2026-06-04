# Areluna Call Analyzer

Sistema de inteligência comercial para o **Instituto Areluna do Porto** (implantodontia de alto ticket, Portugal). Sincroniza gravações de calls do SharePoint, transcreve via Whisper e avalia cada call com o **Método Vitor Balduino Oliveira** — entregando score, diagnóstico e pontos de melhoria para o gestor toda segunda-feira.

---

## Como funciona

```
SharePoint (pasta por closer)
  └─ sync-sharepoint (*/15min)    → descobre arquivos novos, cria registro no banco
       └─ transcrever-calls (*/5min) → baixa .mov, extrai áudio mono 32k via ffmpeg, transcreve (Whisper)
            └─ analise-calls (*/5min)   → avalia transcrição com GPT-4o + Método Vitor → score 0–10
                 └─ ronda-semanal (seg 9h)  → agrega a semana, renderiza email, envia via Resend
```

O gestor não precisa fazer nada — as calls aparecem analisadas no painel em até 20 minutos após a gravação.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| UI | Tailwind v3.4 + shadcn/ui + Recharts |
| Banco | Supabase (PostgreSQL, schema `comercial`) |
| IA — análise | GPT-4o (`response_format: json_object`) |
| IA — transcrição | AssemblyAI Universal-3 (aceita vídeo direto via URL) |
| Fonte de dados | Microsoft SharePoint via Microsoft Graph API |
| Email | Resend |
| Deploy | Vercel Pro |

---

## Pré-requisitos

- Node.js ≥ 20
- Contas: Supabase, Vercel, OpenAI, AssemblyAI, Resend, Microsoft Azure (App Registration)

---

## Instalação

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd areluna-call-analyzer
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

| Variável | Onde usar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role — **nunca expor ao cliente** |
| `NEXT_PUBLIC_APP_URL` | URL pública do app |
| `OPENAI_API_KEY` | GPT-4o (análise de calls com Método Vitor) |
| `ASSEMBLYAI_API_KEY` | Transcrição de calls (AssemblyAI Universal-3) |
| `RESEND_API_KEY` | Envio da ronda semanal |
| `CRON_SECRET` | Bearer token para proteger rotas `/api/cron/*` |
| `SHAREPOINT_TENANT_ID` | Tenant ID do Azure |
| `SHAREPOINT_CLIENT_ID` | Client ID do Azure |
| `SHAREPOINT_CLIENT_SECRET` | Client Secret — **somente server-side** |
| `SHAREPOINT_SITE_ID` | Resolvido via `tsx scripts/resolve-sharepoint-ids.ts` |
| `SHAREPOINT_DRIVE_ID` | Idem |
| `SHAREPOINT_FOLDER_ITEM_ID` | Idem |

### 3. Banco de dados

```bash
# Aplicar migrations
supabase db push

# Ou via Supabase Dashboard → SQL Editor (para redes restritas)
```

### 4. Setup SharePoint (1x)

1. Criar App Registration no Azure com permissões `Sites.Read.All` e `Files.Read.All` (application) + admin consent
2. Preencher `SHAREPOINT_TENANT_ID`, `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET` no `.env.local`
3. Resolver os IDs da pasta:

```bash
tsx scripts/resolve-sharepoint-ids.ts "<URL_DA_PASTA_SHAREPOINT>"
```

4. Colar os 3 IDs gerados no `.env.local`

**Estrutura de pastas esperada no SharePoint:**
```
Pasta raiz/
  Talita/
    2026-05-27 11-13-01.mov
    2026-05-27 16-46-32.mov
  Susana/
    2026-05-26 16-42-55.mov
  Vanessa/
    ...
```

O nome da pasta = nome do closer no banco (`comercial.closers`).

### 5. Cadastrar closers

```bash
# Garante que os closers existem no banco com nome = nome da pasta SharePoint
npx tsx scripts/seed-closers.ts
```

Edite `scripts/seed-closers.ts` para adicionar os closers reais antes de rodar.

### 6. Criar usuários

```bash
npm run admin:create-user -- --email gestor@areluna.pt --role dono --name "Nome"
npm run admin:create-user -- --email ba@benitesalbuquerque.com.br --role admin
```

### 7. Rodar em desenvolvimento

```bash
npm run dev
# App em http://localhost:3000
```

---

## Crons

Todos protegidos por `Authorization: Bearer $CRON_SECRET`. O Vercel injeta o header automaticamente.

| Rota | Agenda (UTC) | Descrição |
|---|---|---|
| `/api/cron/sync-sharepoint` | `*/15 * * * *` | Sincroniza pasta SharePoint, cria calls novas |
| `/api/cron/transcrever-calls` | `*/5 * * * *` | Transcreve batch de 3 calls pendentes |
| `/api/cron/analise-calls` | `*/5 * * * *` | Analisa batch de 10 calls (GPT-4o + Método Vitor) |
| `/api/cron/ronda-semanal` | `0 9 * * 1` | Gera e envia ronda da semana anterior (seg 9h UTC) |
| `/api/cron/backfill-rondas` | `5 9 * * 2-7` | Regenera rondas que falharam |

Para acionar manualmente:

```bash
source .env.local
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-sharepoint
```

---

## Telas do Painel

| Rota | Descrição |
|---|---|
| `/login` | Autenticação email + senha |
| `/dashboard` | KPIs da semana + score médio + distribuição de classificações |
| `/calls` | Lista de calls com status e score |
| `/calls/[id]` | Score por bloco A–G + diagnóstico + transcrição + pontos de melhoria |
| `/closers` | Lista de closers com score médio e total de calls |
| `/closers/[id]` | Histórico e evolução de um closer |
| `/rondas` | Lista de rondas geradas |
| `/rondas/[id]` | Visualização do snapshot semanal |
| `/configuracoes` | Destinatários da ronda, thresholds, dados da clínica |

---

## Módulos (`lib/modules/`)

| Módulo | Responsabilidade |
|---|---|
| `sharepoint-client` | Autenticação Graph API, listagem da pasta, download de arquivos |
| `sync-sharepoint` | Compara SharePoint vs banco, cria calls novas (dedup por `sharepoint_file_id`) |
| `transcritor-cloud` | Transcrição via AssemblyAI Universal-3 — recebe URL, retorna texto + duração + custo |
| `transcritor-calls` | Orquestra transcrição (obtém URL do SharePoint → AssemblyAI) com lock otimista |
| `parser-nome-arquivo` | Parseia padrão `YYYY-MM-DD_Closer_Cliente.ext` (alternativo ao modelo de pastas) |
| `resolver-closer` | Match `normalizarTexto(nomePasta)` → `closer_id` no banco |
| `analisador-calls` | Chama GPT-4o com Método Vitor, salva score + diagnóstico + sinais vermelhos |
| `gerador-ronda` | Agrega calls da semana por closer, persiste snapshot (idempotente) |
| `email-renderer-ronda` | Renderiza HTML responsivo da ronda |
| `enviador-resend` | Envia email via Resend, registra resultado em `rondas` |

---

## Schema (`comercial`)

| Tabela | Propósito |
|---|---|
| `closers` | Cadastro com nome (= pasta SharePoint), email, ativo |
| `calls` | Gravação + transcrição + análise inline (score, classificação, diagnóstico…) |
| `rondas` | Snapshot semanal gerado + status de envio |
| `configuracoes` | Singleton (id=1): destinatários, thresholds, nome da clínica |
| `autorizados` | Usuários com role (dono, head, admin) |
| `auditoria` | Log de leituras e escritas |

### Status das calls

```
transcricao_status:  pendente → em_processamento → concluida | erro
status_analise:      aguardando_transcricao → aguardando_analise → em_analise → analisada | erro
```

### Classificação (Método Vitor)

| Score | Classificação |
|---|---|
| ≥ 8.5 | EXCELENTE |
| 7.0 – 8.4 | BOM |
| 5.0 – 6.9 | REGULAR |
| < 5.0 | INSUFICIENTE |

---

## Testes

```bash
# Unitários (sem banco)
npx vitest run --project unit

# Integração (requer banco local via supabase start)
npx vitest run --project integration
```

Cobertura unitária: `parser-nome-arquivo`, `phone-normalizer`.  
Cobertura integração: `sync-sharepoint`, `transcritor-calls`, `gerador-ronda`.  
Fronteiras mockadas: OpenAI, SharePoint.

---

## Comandos do Dia a Dia

```bash
npm run dev                    # Dev server
npm run typecheck              # TypeScript (0 erros esperados)
npm run lint                   # ESLint
npm run build                  # Build de produção
npm run admin:create-user      # Criar usuário
npx tsx scripts/seed-closers.ts            # Cadastrar closers
npx tsx scripts/resolve-sharepoint-ids.ts  # Resolver IDs SharePoint
```

---

## Deploy (checklist por cliente)

1. Fork do template → repo do cliente
2. Criar projeto Supabase (`sa-east-1` ou região mais próxima)
3. `supabase db push`
4. Criar projeto Vercel, conectar repo, preencher env vars
5. Configurar Resend como SMTP do Supabase Auth + `RESEND_API_KEY`
6. Resolver IDs SharePoint: `tsx scripts/resolve-sharepoint-ids.ts "<URL>"`
7. Editar `scripts/seed-closers.ts` com os closers reais → rodar
8. `npm run admin:create-user` para gestor + admin BA
9. Preencher `/configuracoes`: nome da clínica, destinatários da ronda, threshold
10. Validar end-to-end: colocar 1 arquivo real na pasta SharePoint, aguardar ~20min

---

## Estimativa de Custo de IA por Cliente

| Serviço | Volume típico | Estimativa/mês |
|---|---|---|
| AssemblyAI Universal-3 | ~40 calls × 45min | ~US$ 11 |
| GPT-4o (análise calls) | ~40 calls × 6k tokens | ~US$ 10 |
| GPT-4o (rondas) | 4 por mês | ~US$ 2 |
| **Total** | | **~US$ 23/mês** |

Vai na conta do cliente (OpenAI + AssemblyAI).

---

## Fora de Escopo (v1)
- LGPD compliance completo
- 2FA, dark mode, exportação CSV
- Multi-tenancy / SaaS
