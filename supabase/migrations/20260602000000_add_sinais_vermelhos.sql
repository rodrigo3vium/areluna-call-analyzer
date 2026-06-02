-- Adiciona coluna sinais_vermelhos à tabela calls
-- Armazena os números (1–8) dos sinais do Método Vitor que dispararam na análise
ALTER TABLE comercial.calls
  ADD COLUMN IF NOT EXISTS sinais_vermelhos jsonb;
