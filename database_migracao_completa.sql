-- ============================================================
-- MIGRAÇÃO: Integrar mangueiras com materiais + Site em locais
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar categoria na tabela materiais
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'MATERIAL';

-- 2. Adicionar material_id na tabela mangueiras (FK para materiais)
ALTER TABLE mangueiras ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materiais(id) ON DELETE SET NULL;

-- 3. Adicionar site na tabela locais
ALTER TABLE locais ADD COLUMN IF NOT EXISTS site VARCHAR(100);

-- 4. Criar índice para categoria
CREATE INDEX IF NOT EXISTS idx_materiais_categoria ON materiais(categoria);
