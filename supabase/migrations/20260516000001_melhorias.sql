-- =====================================================================
-- Fase 5: calls.analisada_em + buscar_leads_fuzzy
-- Fase 6: get_dashboard completo
-- =====================================================================

-- Coluna para rastrear análise de calls sem subconsulta
ALTER TABLE comercial.calls ADD COLUMN IF NOT EXISTS analisada_em timestamptz;

-- =====================================================================
-- RPC: buscar_leads_fuzzy (pg_trgm)
-- =====================================================================
CREATE OR REPLACE FUNCTION comercial.buscar_leads_fuzzy(
  p_telefone text    DEFAULT NULL,
  p_nome     text    DEFAULT NULL,
  p_limite   integer DEFAULT 15
)
RETURNS TABLE (id uuid, nome text, telefone text, score numeric)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = comercial, public, extensions
AS $$
  SELECT
    l.id,
    l.nome,
    l.telefone,
    (
      COALESCE(similarity(l.telefone, p_telefone), 0) * 0.7 +
      COALESCE(similarity(l.nome, p_nome), 0) * 0.3
    )::numeric AS score
  FROM comercial.leads l
  WHERE
    (p_telefone IS NOT NULL AND similarity(l.telefone, p_telefone) > 0.2) OR
    (p_nome IS NOT NULL AND similarity(l.nome, p_nome) > 0.3)
  ORDER BY score DESC
  LIMIT p_limite;
$$;

GRANT EXECUTE ON FUNCTION comercial.buscar_leads_fuzzy(text, text, integer)
  TO authenticated, service_role;

-- =====================================================================
-- RPC: get_dashboard (implementação completa)
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
      'leads_ativos', (
        SELECT count(*) FROM comercial.leads
        WHERE status NOT IN ('perdido','fechou')
      ),
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
      ),
      -- deltas (vs período anterior de mesmo tamanho)
      'delta_score_whatsapp', (
        WITH atual AS (
          SELECT avg(score) AS v
          FROM comercial.analises_whatsapp
          WHERE created_at BETWEEN p_inicio AND p_fim
        ),
        anterior AS (
          SELECT avg(score) AS v
          FROM comercial.analises_whatsapp
          WHERE created_at BETWEEN
            p_inicio - (p_fim - p_inicio) AND p_inicio
        )
        SELECT round((atual.v - anterior.v)::numeric, 1)
        FROM atual, anterior
      ),
      'delta_score_calls', (
        WITH atual AS (
          SELECT avg(score_geral) AS v
          FROM comercial.analises_calls
          WHERE created_at BETWEEN p_inicio AND p_fim
        ),
        anterior AS (
          SELECT avg(score_geral) AS v
          FROM comercial.analises_calls
          WHERE created_at BETWEEN
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
          'score_whatsapp', round(avg(aw.score)::numeric, 1),
          'score_calls', round(avg(ac.score_geral)::numeric, 1)
        )
        ORDER BY serie.semana
      ), '[]'::jsonb)
      FROM generate_series(
        date_trunc('week', now()) - '11 weeks'::interval,
        date_trunc('week', now()),
        '1 week'::interval
      ) AS serie(semana)
      LEFT JOIN comercial.analises_whatsapp aw
        ON date_trunc('week', aw.created_at) = serie.semana
      LEFT JOIN comercial.analises_calls ac
        ON date_trunc('week', ac.created_at) = serie.semana
      GROUP BY serie.semana
    ),

    'conversas_recentes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.ultima_mensagem_em DESC), '[]'::jsonb)
      FROM (
        SELECT
          c.id,
          l.nome AS lead_nome,
          l.telefone AS lead_telefone,
          c.ultimo_score,
          c.ultima_mensagem_em,
          (SELECT aw.resumo FROM comercial.analises_whatsapp aw
           WHERE aw.conversa_id = c.id ORDER BY aw.created_at DESC LIMIT 1) AS ultimo_resumo,
          (SELECT aw.tags_negativas FROM comercial.analises_whatsapp aw
           WHERE aw.conversa_id = c.id ORDER BY aw.created_at DESC LIMIT 1) AS tags_negativas
        FROM comercial.conversas c
        LEFT JOIN comercial.leads l ON l.id = c.lead_id
        WHERE c.ultima_mensagem_em BETWEEN p_inicio AND p_fim
        ORDER BY c.ultima_mensagem_em DESC
        LIMIT 8
      ) t
    ),

    'calls_recentes', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.realizada_em DESC), '[]'::jsonb)
      FROM (
        SELECT
          ca.id,
          ca.titulo,
          ca.realizada_em,
          ca.match_status,
          l.nome AS lead_nome,
          ac.classificacao,
          ac.score_geral
        FROM comercial.calls ca
        LEFT JOIN comercial.leads l ON l.id = ca.lead_id
        LEFT JOIN LATERAL (
          SELECT classificacao, score_geral
          FROM comercial.analises_calls
          WHERE call_id = ca.id
          ORDER BY created_at DESC LIMIT 1
        ) ac ON true
        WHERE ca.realizada_em BETWEEN p_inicio AND p_fim
           OR ca.created_at BETWEEN p_inicio AND p_fim
        ORDER BY COALESCE(ca.realizada_em, ca.created_at) DESC
        LIMIT 8
      ) t
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;
