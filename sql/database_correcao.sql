-- ============================================
-- CORREÇÃO: Adicionar colunas faltantes na tabela reservas
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Adicionar colunas faltantes na tabela reservas
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMP WITH TIME ZONE;

-- Adicionar coluna faltante na tabela reserva_itens
ALTER TABLE reserva_itens ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verificar se a coluna quantidade_reservada existe em materiais
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS quantidade_reservada INTEGER DEFAULT 0;

-- Recriar trigger se necessário
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
