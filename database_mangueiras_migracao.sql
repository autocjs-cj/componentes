-- ============================================================
-- MIGRAÇÃO: Adicionar coluna documento_referencia
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Adicionar coluna documento_referencia na tabela mangueira_movimentacoes
ALTER TABLE mangueira_movimentacoes ADD COLUMN IF NOT EXISTS documento_referencia VARCHAR(100);
