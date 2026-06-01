-- =====================================================================
-- Seed de desenvolvimento — Atlas OS Comercial
-- Executado após migrations em: supabase db reset / supabase start
-- =====================================================================

-- Configurações da clínica (linha singleton já inserida pela migration)
UPDATE comercial.configuracoes
SET
  nome_clinica                       = 'Clínica Demo',
  destinatarios_whatsapp             = ARRAY['dev@exemplo.com.br'],
  destinatarios_calls                = ARRAY['dev@exemplo.com.br'],
  threshold_score_baixo              = 50,
  threshold_alerta_imediato_whatsapp = 30,
  janela_analise_mensagens           = 50,
  retencao_meses                     = 24,
  zapier_plaud_mapping               = '{}'::jsonb
WHERE id = 1;

-- Evolution instance de desenvolvimento
INSERT INTO comercial.evolution_instances (apelido, evolution_url, evolution_api_key, instance_name, webhook_secret, ativa)
VALUES (
  'WhatsApp Dev',
  'http://localhost:8080',
  'dev-api-key-placeholder',
  'atlas-dev',
  'dev-webhook-secret-placeholder',
  true
)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- Leads de exemplo para desenvolvimento
-- =====================================================================
INSERT INTO comercial.leads (nome, telefone, email, status, origem, origem_status)
VALUES
  ('Ana Costa',       '+5511991110001', 'ana.costa@exemplo.com',    'em_atendimento', 'instagram',   'detectado'),
  ('Bruno Lima',      '+5511991110002', null,                        'agendou',        'google',      'detectado'),
  ('Carla Nunes',     '+5511991110003', 'carla.nunes@exemplo.com',  'novo',           null,          'pendente'),
  ('Diego Ferreira',  '+5511991110004', null,                        'sem_resposta',   'indicacao',   'detectado'),
  ('Elaine Souza',    '+5511991110005', 'elaine.s@exemplo.com',     'fechou',         'instagram',   'detectado'),
  ('Fábio Moraes',    '+5511991110006', null,                        'perdido',        'facebook',    'detectado'),
  ('Gabriela Ramos',  '+5511991110007', null,                        'compareceu',     'google',      'detectado'),
  ('Henrique Dias',   '+5511991110008', null,                        'novo',           null,          'pendente')
ON CONFLICT (telefone) DO NOTHING;

-- =====================================================================
-- Conversa de exemplo vinculada ao primeiro lead
-- =====================================================================
WITH lead AS (
  SELECT id FROM comercial.leads WHERE telefone = '+5511991110001' LIMIT 1
), inst AS (
  SELECT id FROM comercial.evolution_instances LIMIT 1
)
INSERT INTO comercial.conversas (lead_id, evolution_instance_id, numero_whatsapp, status, ultima_mensagem_em)
SELECT
  lead.id,
  inst.id,
  '+5511991110001',
  'aguardando',
  now() - interval '2 hours'
FROM lead, inst
ON CONFLICT DO NOTHING;
