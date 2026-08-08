-- ============================================
-- ADICIONAR COLUNA descricao NA TABELA materiais
-- Execute no SQL Editor do Supabase
-- ============================================

ALTER TABLE materiais ADD COLUMN IF NOT EXISTS descricao TEXT;
