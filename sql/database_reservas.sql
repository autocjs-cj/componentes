-- ============================================
-- CRIAÇÃO DAS TABELAS DE RESERVA DE MATERIAIS
-- Execute este script completo no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar campo quantidade_reservada na tabela materiais (se ainda não existir)
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS quantidade_reservada INTEGER DEFAULT 0;

-- 2. Criar tabela de reservas
CREATE TABLE IF NOT EXISTS reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitante VARCHAR(255) NOT NULL,
    documento VARCHAR(100) NOT NULL,
    data_reserva DATE NOT NULL DEFAULT CURRENT_DATE,
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADA', 'CANCELADA')),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    data_aprovacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de itens da reserva
CREATE TABLE IF NOT EXISTS reserva_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);
CREATE INDEX IF NOT EXISTS idx_reservas_documento ON reservas(documento);
CREATE INDEX IF NOT EXISTS idx_reserva_itens_reserva_id ON reserva_itens(reserva_id);
CREATE INDEX IF NOT EXISTS idx_reserva_itens_material_id ON reserva_itens(material_id);

-- 5. Trigger updated_at para reservas
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

-- 6. Políticas RLS (permitir acesso anônimo — auth customizada no cliente)
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON reservas;
CREATE POLICY "Allow all" ON reservas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON reserva_itens;
CREATE POLICY "Allow all" ON reserva_itens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
