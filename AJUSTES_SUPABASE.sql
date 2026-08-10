-- ============================================================
-- AJUSTES SUPABASE - CONTROLE DE MANGUEIRAS + SITES
-- Execute TODO este script no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- PARTE 1: TABELA SITES (NOVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para sites
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON sites;
CREATE POLICY "Allow all" ON sites FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 2: MODIFICAR TABELA LOCAIS (adicionar site_id)
-- ============================================================
-- Adicionar site_id (FK para sites)
ALTER TABLE locais ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- Remover coluna site antiga se existir de migração anterior
ALTER TABLE locais DROP COLUMN IF EXISTS site;

-- Índice
CREATE INDEX IF NOT EXISTS idx_locais_site_id ON locais(site_id);

-- ============================================================
-- PARTE 3: MODIFICAR TABELA MATERIAIS (adicionar categoria)
-- ============================================================
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'MATERIAL';
CREATE INDEX IF NOT EXISTS idx_materiais_categoria ON materiais(categoria);

-- ============================================================
-- PARTE 4: TABELA MANGUEIRAS (NOVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS mangueiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES materiais(id) ON DELETE SET NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    diametro VARCHAR(50) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    qtd_disponivel INTEGER DEFAULT 0,
    qtd_aplicada INTEGER DEFAULT 0,
    qtd_teste_necessario INTEGER DEFAULT 0,
    qtd_em_teste INTEGER DEFAULT 0,
    qtd_reprovada INTEGER DEFAULT 0,
    qtd_descartada INTEGER DEFAULT 0,
    estoque_minimo INTEGER DEFAULT 0,
    limite_compra INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger updated_at para mangueiras
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mangueiras_updated_at ON mangueiras;
CREATE TRIGGER update_mangueiras_updated_at BEFORE UPDATE ON mangueiras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_mangueiras_codigo ON mangueiras(codigo);
CREATE INDEX IF NOT EXISTS idx_mangueiras_material_id ON mangueiras(material_id);
CREATE INDEX IF NOT EXISTS idx_mangueiras_estoque_minimo ON mangueiras(estoque_minimo);
CREATE INDEX IF NOT EXISTS idx_mangueiras_limite_compra ON mangueiras(limite_compra);

-- RLS
ALTER TABLE mangueiras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON mangueiras;
CREATE POLICY "Allow all" ON mangueiras FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PARTE 5: TABELA MANGUEIRA_MOVIMENTACOES (NOVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS mangueira_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mangueira_id UUID NOT NULL REFERENCES mangueiras(id) ON DELETE CASCADE,
    tipo_movimentacao VARCHAR(50) NOT NULL CHECK (tipo_movimentacao IN (
        'RECEBIMENTO', 
        'APLICACAO_AREA', 
        'ENVIO_TESTE', 
        'RETORNO_APROVADO', 
        'RETORNO_REPROVADO', 
        'DESCARTE_AREA', 
        'DESCARTE_REPROVADA'
    )),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    documento_referencia VARCHAR(100),
    data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
    responsavel VARCHAR(255),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mangueira_movimentacoes_mangueira_id ON mangueira_movimentacoes(mangueira_id);
CREATE INDEX IF NOT EXISTS idx_mangueira_movimentacoes_data ON mangueira_movimentacoes(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_mangueira_movimentacoes_tipo ON mangueira_movimentacoes(tipo_movimentacao);

-- RLS
ALTER TABLE mangueira_movimentacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON mangueira_movimentacoes;
CREATE POLICY "Allow all" ON mangueira_movimentacoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
