-- =====================================================================
-- Atlas OS Comercial — Schema Inicial
-- =====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- Schema
CREATE SCHEMA IF NOT EXISTS comercial;

-- =====================================================================
-- Trigger helper: updated_at automático
-- =====================================================================
CREATE OR REPLACE FUNCTION comercial.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 1. evolution_instances
-- =====================================================================
CREATE TABLE comercial.evolution_instances (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  apelido     text        NOT NULL,
  evolution_url   text    NOT NULL,
  evolution_api_key text  NOT NULL,
  instance_name   text    NOT NULL,
  webhook_secret  text    NOT NULL,
  ativa       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_evolution_instances_updated_at
  BEFORE UPDATE ON comercial.evolution_instances
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 2. leads
-- =====================================================================
CREATE TABLE comercial.leads (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text        NOT NULL,
  telefone              text        UNIQUE NOT NULL,  -- E.164
  email                 text,
  status                text        NOT NULL DEFAULT 'novo'
    CHECK (status IN ('novo','em_atendimento','sem_resposta','agendou','compareceu','perdido','fechou')),
  status_origem         text        NOT NULL DEFAULT 'sistema'
    CHECK (status_origem IN ('sistema','manual')),
  status_atualizado_em  timestamptz NOT NULL DEFAULT now(),
  status_atualizado_por uuid        REFERENCES auth.users(id),
  origem                text
    CHECK (origem IN ('instagram','facebook','google','indicacao','organico','whatsapp_ativo','outro','desconhecido')),
  origem_confidence     numeric(4,3),
  origem_status         text        NOT NULL DEFAULT 'pendente'
    CHECK (origem_status IN ('detectado','pendente','manual','desconhecido')),
  observacoes           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status        ON comercial.leads(status);
CREATE INDEX idx_leads_origem_status ON comercial.leads(origem_status);
CREATE INDEX idx_leads_telefone_trgm ON comercial.leads USING gin(telefone gin_trgm_ops);
CREATE INDEX idx_leads_nome_trgm     ON comercial.leads USING gin(nome gin_trgm_ops);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON comercial.leads
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 3. conversas
-- =====================================================================
CREATE TABLE comercial.conversas (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id              uuid        REFERENCES comercial.leads(id) ON DELETE SET NULL,
  evolution_instance_id uuid       REFERENCES comercial.evolution_instances(id),
  numero_whatsapp      text        NOT NULL,  -- E.164 do contato
  status               text        NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa','encerrada','aguardando')),
  ultimo_score         numeric(5,2),
  ultima_analise_em    timestamptz,
  ultima_mensagem_em   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversas_lead_id         ON comercial.conversas(lead_id);
CREATE INDEX idx_conversas_ultima_analise  ON comercial.conversas(ultima_mensagem_em, ultima_analise_em);
CREATE INDEX idx_conversas_status         ON comercial.conversas(status);

CREATE TRIGGER trg_conversas_updated_at
  BEFORE UPDATE ON comercial.conversas
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 4. mensagens
-- =====================================================================
CREATE TABLE comercial.mensagens (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id           uuid        NOT NULL REFERENCES comercial.conversas(id) ON DELETE CASCADE,
  message_id_evolution  text        UNIQUE,
  tipo                  text        NOT NULL DEFAULT 'texto'
    CHECK (tipo IN ('texto','audio','imagem','documento','outro')),
  fonte                 text        NOT NULL DEFAULT 'humano'
    CHECK (fonte IN ('humano','automacao')),
  conteudo              text,
  media_url             text,
  duracao_segundos      integer,
  remetente             text        NOT NULL DEFAULT 'lead',
  enviada_em            timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_conversa_em ON comercial.mensagens(conversa_id, enviada_em);

-- =====================================================================
-- 5. calls
-- =====================================================================
CREATE TABLE comercial.calls (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               uuid        REFERENCES comercial.leads(id) ON DELETE SET NULL,
  titulo                text,
  duracao_segundos      integer,
  plaud_id              text        UNIQUE,
  plaud_hash            text        UNIQUE,  -- fallback hash de transcript
  gravacao_url          text,
  transcricao           text,
  transcricao_origem    text
    CHECK (transcricao_origem IN ('plaud','whisper','manual')),
  telefone_extraido     text,  -- E.164 extraído do payload
  match_status          text        NOT NULL DEFAULT 'pendente'
    CHECK (match_status IN ('pendente','sugerido','confirmado','confirmado_auto','sem_lead','revertido')),
  match_sugestoes       jsonb,  -- top3: [{lead_id, nome, telefone, confidence}]
  match_confirmado_por  uuid        REFERENCES auth.users(id),
  match_confirmado_em   timestamptz,
  realizada_em          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_lead_id      ON comercial.calls(lead_id);
CREATE INDEX idx_calls_match_status ON comercial.calls(match_status);
CREATE INDEX idx_calls_realizada_em ON comercial.calls(realizada_em);

CREATE TRIGGER trg_calls_updated_at
  BEFORE UPDATE ON comercial.calls
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 6. analises_whatsapp
-- =====================================================================
CREATE TABLE comercial.analises_whatsapp (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id                 uuid        NOT NULL REFERENCES comercial.conversas(id) ON DELETE CASCADE,
  score                       numeric(5,2) NOT NULL,
  tags_positivas              text[]      NOT NULL DEFAULT '{}',
  tags_negativas              text[]      NOT NULL DEFAULT '{}',
  resumo                      text,
  diagnostico                 text,
  acao_recomendada            text,
  origem_detectada            text,
  origem_confidence           numeric(4,3),
  total_mensagens_analisadas  integer     NOT NULL DEFAULT 0,
  modelo                      text        NOT NULL,
  prompt_versao               text        NOT NULL DEFAULT 'v1',
  tokens_entrada              integer,
  tokens_saida                integer,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analises_whatsapp_conversa ON comercial.analises_whatsapp(conversa_id, created_at DESC);

-- =====================================================================
-- 7. analises_calls
-- =====================================================================
CREATE TABLE comercial.analises_calls (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id           uuid        NOT NULL REFERENCES comercial.calls(id) ON DELETE CASCADE,
  classificacao     text        NOT NULL
    CHECK (classificacao IN ('excelente','bom','regular','insuficiente')),
  score_geral       numeric(5,2) NOT NULL,
  fases             jsonb       NOT NULL DEFAULT '{}',
  diagnostico       text,
  acao_recomendada  text,
  modelo            text        NOT NULL,
  prompt_versao     text        NOT NULL DEFAULT 'v1',
  tokens_entrada    integer,
  tokens_saida      integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analises_calls_call ON comercial.analises_calls(call_id, created_at DESC);

-- =====================================================================
-- 8. rondas
-- =====================================================================
CREATE TABLE comercial.rondas (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo           text        NOT NULL CHECK (tipo IN ('whatsapp','calls')),
  periodo_inicio timestamptz NOT NULL,
  periodo_fim    timestamptz NOT NULL,
  snapshot       jsonb       NOT NULL DEFAULT '{}',
  vazia          boolean     NOT NULL DEFAULT false,
  status         text        NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','gerada','enviada','erro')),
  enviada_em     timestamptz,
  erro_envio     text,
  destinatarios  jsonb,
  reenvios       integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, periodo_inicio)
);

CREATE INDEX idx_rondas_tipo_periodo ON comercial.rondas(tipo, periodo_inicio DESC);

CREATE TRIGGER trg_rondas_updated_at
  BEFORE UPDATE ON comercial.rondas
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 9. eventos_brutos
-- =====================================================================
CREATE TABLE comercial.eventos_brutos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fonte        text        NOT NULL CHECK (fonte IN ('evolution','zapier_plaud')),
  external_id  text        NOT NULL,
  payload      jsonb       NOT NULL,
  status       text        NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','processando','processado','erro','dead_letter','ignorado')),
  tentativas   integer     NOT NULL DEFAULT 0,
  ultimo_erro  text,
  processado_em timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fonte, external_id)
);

CREATE INDEX idx_eventos_brutos_status     ON comercial.eventos_brutos(status, created_at);
CREATE INDEX idx_eventos_brutos_processado ON comercial.eventos_brutos(processado_em) WHERE status = 'processado';

CREATE TRIGGER trg_eventos_brutos_updated_at
  BEFORE UPDATE ON comercial.eventos_brutos
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 10. configuracoes (singleton)
-- =====================================================================
CREATE TABLE comercial.configuracoes (
  id                                integer     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome_clinica                      text        NOT NULL DEFAULT 'Clínica',
  destinatarios_whatsapp            text[]      NOT NULL DEFAULT '{}',
  destinatarios_calls               text[]      NOT NULL DEFAULT '{}',
  threshold_score_baixo             integer     NOT NULL DEFAULT 50,
  threshold_alerta_imediato_whatsapp integer    NOT NULL DEFAULT 30,
  janela_analise_mensagens          integer     NOT NULL DEFAULT 50,
  retencao_meses                    integer     NOT NULL DEFAULT 24,
  zapier_plaud_mapping              jsonb       NOT NULL DEFAULT '{}',
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_configuracoes_updated_at
  BEFORE UPDATE ON comercial.configuracoes
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

INSERT INTO comercial.configuracoes DEFAULT VALUES;

-- =====================================================================
-- 11. autorizados
-- =====================================================================
CREATE TABLE comercial.autorizados (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('dono','head','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX idx_autorizados_user_id ON comercial.autorizados(user_id);

-- =====================================================================
-- Helpers de autenticação (dependem de autorizados)
-- =====================================================================
CREATE OR REPLACE FUNCTION comercial.is_authorized()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = comercial, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM comercial.autorizados
    WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION comercial.get_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = comercial, public
AS $$
  SELECT role FROM comercial.autorizados
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- =====================================================================
-- 12. lead_eventos
-- =====================================================================
CREATE TABLE comercial.lead_eventos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid        NOT NULL REFERENCES comercial.leads(id) ON DELETE CASCADE,
  tipo        text        NOT NULL
    CHECK (tipo IN ('mensagem','call','status_change','analise','nota','match')),
  descricao   text,
  payload     jsonb,
  created_by  uuid        REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_eventos_lead ON comercial.lead_eventos(lead_id, created_at DESC);

-- =====================================================================
-- 13. auditoria
-- =====================================================================
CREATE TABLE comercial.auditoria (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id),
  acao        text        NOT NULL CHECK (acao IN ('read','create','update','delete')),
  recurso     text        NOT NULL,
  recurso_id  uuid,
  payload     jsonb,
  timestamp   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_user_ts     ON comercial.auditoria(user_id, timestamp DESC);
CREATE INDEX idx_auditoria_recurso     ON comercial.auditoria(recurso, recurso_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
ALTER TABLE comercial.evolution_instances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.conversas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.mensagens             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.calls                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.analises_whatsapp     ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.analises_calls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.rondas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.eventos_brutos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.configuracoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.autorizados           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.lead_eventos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.auditoria             ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autorizados têm acesso total a todas as tabelas
-- service_role bypassa RLS automaticamente (usado em server-side)

CREATE POLICY "autorizados_all" ON comercial.evolution_instances
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.leads
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.conversas
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.mensagens
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.calls
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.analises_whatsapp
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.analises_calls
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.rondas
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.eventos_brutos
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.configuracoes
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

-- autorizados: usuário pode ver sua própria entrada; admin pode ver todas
CREATE POLICY "ver_propria_entrada" ON comercial.autorizados
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR comercial.get_role() = 'admin');

CREATE POLICY "admin_all" ON comercial.autorizados
  FOR ALL TO authenticated USING (comercial.get_role() = 'admin') WITH CHECK (comercial.get_role() = 'admin');

CREATE POLICY "autorizados_all" ON comercial.lead_eventos
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

-- auditoria: somente leitura para autenticados
CREATE POLICY "autorizados_select" ON comercial.auditoria
  FOR SELECT TO authenticated USING (comercial.is_authorized());

-- =====================================================================
-- GRANTs
-- =====================================================================
GRANT USAGE ON SCHEMA comercial TO service_role, authenticated, anon;

GRANT ALL ON ALL TABLES IN SCHEMA comercial TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA comercial TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA comercial TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.evolution_instances   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.leads                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.conversas             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.mensagens             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.calls                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.analises_whatsapp     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.analises_calls        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.rondas               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.eventos_brutos        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.configuracoes         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.autorizados           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.lead_eventos          TO authenticated;
GRANT SELECT ON comercial.auditoria                                     TO authenticated;

GRANT EXECUTE ON FUNCTION comercial.is_authorized() TO authenticated;
GRANT EXECUTE ON FUNCTION comercial.get_role() TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- RPC Stub: get_dashboard
-- =====================================================================
CREATE OR REPLACE FUNCTION comercial.get_dashboard(
  p_inicio timestamptz,
  p_fim    timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = comercial, public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Stub: será implementado completamente na Fase 6
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim),
    'kpis', jsonb_build_object(
      'leads_ativos', (SELECT count(*) FROM comercial.leads WHERE status NOT IN ('perdido','fechou')),
      'score_medio_whatsapp', (
        SELECT round(avg(aw.score)::numeric, 1)
        FROM comercial.analises_whatsapp aw
        WHERE aw.created_at BETWEEN p_inicio AND p_fim
      ),
      'score_medio_calls', (
        SELECT round(avg(ac.score_geral)::numeric, 1)
        FROM comercial.analises_calls ac
        WHERE ac.created_at BETWEEN p_inicio AND p_fim
      ),
      'taxa_fechamento', (
        SELECT round(
          100.0 * count(*) FILTER (WHERE status = 'fechou')
               / NULLIF(count(*), 0),
          1
        )
        FROM comercial.leads
        WHERE created_at BETWEEN p_inicio AND p_fim
      )
    ),
    'conversas_recentes', '[]'::jsonb,
    'calls_recentes', '[]'::jsonb,
    'serie_temporal', '[]'::jsonb
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION comercial.get_dashboard(timestamptz, timestamptz) TO authenticated, service_role;
