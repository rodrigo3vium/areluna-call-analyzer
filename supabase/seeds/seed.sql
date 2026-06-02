-- =====================================================================
-- Seed de desenvolvimento — Areluna Call Analyzer
-- Executado após migrations em: supabase db reset / supabase start
-- =====================================================================

-- Configurações (linha singleton já inserida pela migration)
UPDATE comercial.configuracoes
SET
  nome_clinica          = 'Areluna Demo',
  destinatarios_calls   = ARRAY['dev@exemplo.com.br'],
  threshold_score_baixo = 50,
  retencao_meses        = 24
WHERE id = 1;

-- =====================================================================
-- Closers de exemplo
-- =====================================================================
INSERT INTO comercial.closers (nome, email, ativo)
VALUES
  ('Ana Costa',    'ana.costa@areluna.com',  true),
  ('Bruno Lima',   'bruno.lima@areluna.com', true),
  ('Carla Nunes',  null,                     false)
ON CONFLICT DO NOTHING;
