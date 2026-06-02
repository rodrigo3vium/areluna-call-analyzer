-- =====================================================================
-- Areluna Call Analyzer — Refatoração do Schema
-- Remove domínio WhatsApp/Lead/Evolution; introduce Closer + nova Call
-- =====================================================================

-- =====================================================================
-- 1. DROP funções que dependem das tabelas que serão removidas
-- =====================================================================
DROP FUNCTION IF EXISTS comercial.buscar_leads_fuzzy(text, text, integer);
DROP FUNCTION IF EXISTS comercial.get_dashboard(timestamptz, timestamptz);

-- =====================================================================
-- 2. DROP tabelas — ordem FK-safe (filhas antes das pais)
-- =====================================================================

-- analises_whatsapp → depende de conversas
DROP TABLE IF EXISTS comercial.analises_whatsapp;

-- analises_calls → depende de calls
DROP TABLE IF EXISTS comercial.analises_calls;

-- mensagens → depende de conversas
DROP TABLE IF EXISTS comercial.mensagens;

-- lead_eventos → depende de leads (CASCADE, mas dropamos explicitamente)
DROP TABLE IF EXISTS comercial.lead_eventos;

-- eventos_brutos (pipeline ack-first descontinuada — agora pull-based via cron)
DROP TABLE IF EXISTS comercial.eventos_brutos;

-- conversas → depende de leads e evolution_instances
DROP TABLE IF EXISTS comercial.conversas;

-- evolution_instances (substituído por integração SharePoint via env vars)
DROP TABLE IF EXISTS comercial.evolution_instances;

-- calls antiga → depende de leads
DROP TABLE IF EXISTS comercial.calls;

-- leads (domínio removido — substituído por closers)
DROP TABLE IF EXISTS comercial.leads;

-- =====================================================================
-- 3. CREATE TABLE comercial.closers
-- =====================================================================
CREATE TABLE comercial.closers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text        NOT NULL,
  email      text,
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_closers_ativo ON comercial.closers(ativo);

CREATE TRIGGER trg_closers_updated_at
  BEFORE UPDATE ON comercial.closers
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 4. CREATE TABLE comercial.calls (nova estrutura)
-- =====================================================================
CREATE TABLE comercial.calls (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id                uuid        REFERENCES comercial.closers(id) ON DELETE RESTRICT,
  sharepoint_file_id       text        UNIQUE NOT NULL,
  sharepoint_file_name     text        NOT NULL,
  sharepoint_file_url      text,
  data_gravacao            timestamptz,
  duracao_minutos          numeric(6,2),
  transcricao              text,
  transcricao_status       text        NOT NULL DEFAULT 'pendente'
    CHECK (transcricao_status IN ('pendente','em_processamento','concluida','erro')),
  transcricao_erro         text,
  score                    numeric(5,2),
  classificacao            text
    CHECK (classificacao IN ('EXCELENTE','BOM','REGULAR','INSUFICIENTE')),
  performance_por_criterio jsonb,
  pontos_melhoria          jsonb,  -- array de string serializado como jsonb
  diagnostico_ia           text,
  acao_recomendada         text,
  status_analise           text        NOT NULL DEFAULT 'aguardando_transcricao'
    CHECK (status_analise IN ('aguardando_transcricao','aguardando_analise','em_analise','analisada','erro')),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_closer_id         ON comercial.calls(closer_id);
CREATE INDEX idx_calls_status_analise    ON comercial.calls(status_analise);
CREATE INDEX idx_calls_transcricao_status ON comercial.calls(transcricao_status);
CREATE INDEX idx_calls_data_gravacao     ON comercial.calls(data_gravacao);

CREATE TRIGGER trg_calls_updated_at
  BEFORE UPDATE ON comercial.calls
  FOR EACH ROW EXECUTE FUNCTION comercial.set_updated_at();

-- =====================================================================
-- 5. ALTER comercial.configuracoes — remover colunas WhatsApp-específicas
-- =====================================================================
ALTER TABLE comercial.configuracoes
  DROP COLUMN IF EXISTS destinatarios_whatsapp,
  DROP COLUMN IF EXISTS threshold_alerta_imediato_whatsapp,
  DROP COLUMN IF EXISTS janela_analise_mensagens,
  DROP COLUMN IF EXISTS zapier_plaud_mapping;

-- =====================================================================
-- 6. ALTER comercial.rondas — restringir tipo a 'calls' apenas
-- =====================================================================
ALTER TABLE comercial.rondas DROP CONSTRAINT IF EXISTS rondas_tipo_check;
ALTER TABLE comercial.rondas ADD CONSTRAINT rondas_tipo_check CHECK (tipo = 'calls');
ALTER TABLE comercial.rondas ALTER COLUMN tipo SET DEFAULT 'calls';

-- Remover rondas whatsapp legadas (se existirem)
DELETE FROM comercial.rondas WHERE tipo = 'whatsapp';

-- =====================================================================
-- 7. RLS + GRANTs para as novas tabelas
-- =====================================================================
ALTER TABLE comercial.closers ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial.calls   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autorizados_all" ON comercial.closers
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

CREATE POLICY "autorizados_all" ON comercial.calls
  FOR ALL TO authenticated USING (comercial.is_authorized()) WITH CHECK (comercial.is_authorized());

GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.closers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comercial.calls   TO authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA comercial TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA comercial TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA comercial TO service_role;

-- =====================================================================
-- 8. RPC: get_dashboard (nova versão — calls + closers, sem leads/whatsapp)
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
  SELECT jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim),

    'kpis', jsonb_build_object(
      'calls_no_periodo', (
        SELECT count(*)
        FROM comercial.calls
        WHERE COALESCE(data_gravacao, created_at) BETWEEN p_inicio AND p_fim
      ),
      'calls_analisadas', (
        SELECT count(*)
        FROM comercial.calls
        WHERE status_analise = 'analisada'
          AND COALESCE(data_gravacao, created_at) BETWEEN p_inicio AND p_fim
      ),
      'calls_aguardando', (
        SELECT count(*)
        FROM comercial.calls
        WHERE status_analise IN ('aguardando_transcricao','aguardando_analise','em_analise')
      ),
      'score_medio_calls', (
        SELECT round(avg(score)::numeric, 1)
        FROM comercial.calls
        WHERE status_analise = 'analisada'
          AND COALESCE(data_gravacao, created_at) BETWEEN p_inicio AND p_fim
      ),
      'delta_score_calls', (
        WITH atual AS (
          SELECT avg(score) AS v
          FROM comercial.calls
          WHERE status_analise = 'analisada'
            AND COALESCE(data_gravacao, created_at) BETWEEN p_inicio AND p_fim
        ),
        anterior AS (
          SELECT avg(score) AS v
          FROM comercial.calls
          WHERE status_analise = 'analisada'
            AND COALESCE(data_gravacao, created_at) BETWEEN
              p_inicio - (p_fim - p_inicio) AND p_inicio
        )
        SELECT round((atual.v - anterior.v)::numeric, 1)
        FROM atual, anterior
      )
    ),

    'serie_temporal', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'semana', to_char(serie.semana, 'YYYY-MM-DD'),
          'score_calls', round(avg(c.score)::numeric, 1)
        )
        ORDER BY serie.semana
      ), '[]'::jsonb)
      FROM generate_series(
        date_trunc('week', now()) - '11 weeks'::interval,
        date_trunc('week', now()),
        '1 week'::interval
      ) AS serie(semana)
      LEFT JOIN comercial.calls c
        ON date_trunc('week', COALESCE(c.data_gravacao, c.created_at)) = serie.semana
        AND c.status_analise = 'analisada'
      GROUP BY serie.semana
    ),

    'calls_recentes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.data_gravacao DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT
          c.id,
          cl.nome AS closer_nome,
          c.classificacao,
          c.score,
          c.data_gravacao
        FROM comercial.calls c
        LEFT JOIN comercial.closers cl ON cl.id = c.closer_id
        WHERE COALESCE(c.data_gravacao, c.created_at) BETWEEN p_inicio AND p_fim
        ORDER BY COALESCE(c.data_gravacao, c.created_at) DESC
        LIMIT 8
      ) t
    ),

    'por_closer', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.total DESC), '[]'::jsonb)
      FROM (
        SELECT
          cl.id    AS closer_id,
          cl.nome  AS closer_nome,
          count(*) AS total,
          round(avg(c.score)::numeric, 1) AS score_medio
        FROM comercial.calls c
        JOIN comercial.closers cl ON cl.id = c.closer_id
        WHERE COALESCE(c.data_gravacao, c.created_at) BETWEEN p_inicio AND p_fim
          AND c.status_analise = 'analisada'
        GROUP BY cl.id, cl.nome
      ) t
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION comercial.get_dashboard(timestamptz, timestamptz)
  TO authenticated, service_role;

-- =====================================================================
-- Notify PostgREST to reload schema cache
-- =====================================================================
NOTIFY pgrst, 'reload schema';
