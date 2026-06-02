-- =====================================================================
-- Seed Template — preencher por cliente no kickoff
-- Copiar para _<nome_cliente>.sql e preencher os valores
-- =====================================================================

-- Configurações básicas
UPDATE comercial.configuracoes SET
  nome_clinica          = 'Nome da Empresa',
  destinatarios_calls   = ARRAY['dono@empresa.com', 'head@empresa.com'],
  threshold_score_baixo = 50,
  retencao_meses        = 24
WHERE id = 1;

-- Closers iniciais da equipe
-- Adicionar um por linha para cada closer da equipe de fechamento
INSERT INTO comercial.closers (nome, email, ativo)
VALUES
  ('Nome do Closer', 'closer@empresa.com', true);
