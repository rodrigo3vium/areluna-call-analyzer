-- =====================================================================
-- Seed Template — preencher por cliente no kickoff
-- Copiar para _<nome_cliente>.sql e preencher os valores
-- =====================================================================

-- Configurações básicas da clínica
UPDATE comercial.configuracoes SET
  nome_clinica                       = 'Nome da Clínica',
  destinatarios_whatsapp             = ARRAY['dono@clinica.com', 'head@clinica.com'],
  destinatarios_calls                = ARRAY['dono@clinica.com', 'head@clinica.com'],
  threshold_score_baixo              = 50,
  threshold_alerta_imediato_whatsapp = 30,
  janela_analise_mensagens           = 50,
  retencao_meses                     = 24,
  zapier_plaud_mapping               = '{
    "transcript_field": "transcript",
    "title_field": "title",
    "duration_field": "duration",
    "plaud_id_field": "id",
    "phone_field": "phone",
    "recorded_at_field": "created_at"
  }'::jsonb
WHERE id = 1;

-- Evolution instance(s) da clínica
-- Repetir para cada número de WhatsApp que a secretária usa
INSERT INTO comercial.evolution_instances (apelido, evolution_url, evolution_api_key, instance_name, webhook_secret)
VALUES (
  'WhatsApp Principal',               -- apelido amigável
  'https://evolution.example.com',    -- URL da Evolution API do cliente
  'evo_api_key_aqui',                 -- API key da Evolution
  'nome-instancia-evolution',         -- instance_name na Evolution
  'webhook_secret_aleatorio_aqui'     -- segredo do webhook (gerar com: openssl rand -hex 32)
);
