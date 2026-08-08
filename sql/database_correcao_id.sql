-- ============================================
-- CORREÇÃO: Garantir que a coluna ID tenha DEFAULT gen_random_uuid()
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Habilitar extensão pgcrypto (necessária para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Corrigir a tabela reservas - garantir default no ID
ALTER TABLE reservas ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Corrigir a tabela reserva_itens - garantir default no ID
ALTER TABLE reserva_itens ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Verificar se as colunas created_at existem
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP WITH TIME ZONE;

ALTER TABLE reserva_itens ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Verificar quantidade_reservada em materiais
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS quantidade_reservada INTEGER DEFAULT 0;

-- 6. Recriar trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reservas_updated_at ON reservas;
CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
