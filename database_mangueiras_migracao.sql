-- ============================================================
-- MIGRAÇÃO: Adicionar controle de mangueiras aplicadas + alertas
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar colunas novas na tabela mangueiras
ALTER TABLE mangueiras ADD COLUMN IF NOT EXISTS qtd_aplicada INTEGER DEFAULT 0;
ALTER TABLE mangueiras ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 0;
ALTER TABLE mangueiras ADD COLUMN IF NOT EXISTS limite_compra INTEGER DEFAULT 0;

-- 2. Atualizar constraint de tipo_movimentacao para incluir APLICACAO_AREA
-- Primeiro remover a constraint antiga
ALTER TABLE mangueira_movimentacoes DROP CONSTRAINT IF EXISTS mangueira_movimentacoes_tipo_movimentacao_check;

-- Recriar com os novos tipos
ALTER TABLE mangueira_movimentacoes ADD CONSTRAINT mangueira_movimentacoes_tipo_movimentacao_check 
CHECK (tipo_movimentacao IN (
    'RECEBIMENTO', 
    'APLICACAO_AREA', 
    'ENVIO_TESTE', 
    'RETORNO_APROVADO', 
    'RETORNO_REPROVADO', 
    'DESCARTE_AREA', 
    'DESCARTE_REPROVADA'
));

-- 3. Índice para performance nas novas colunas
CREATE INDEX IF NOT EXISTS idx_mangueiras_estoque_minimo ON mangueiras(estoque_minimo);
CREATE INDEX IF NOT EXISTS idx_mangueiras_limite_compra ON mangueiras(limite_compra);
