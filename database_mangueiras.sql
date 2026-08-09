-- ============================================================
-- CONTROLE DE MANGUEIRAS - TABELAS SUPABASE
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Tabela: mangueiras
CREATE TABLE IF NOT EXISTS mangueiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    diametro VARCHAR(50) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    qtd_disponivel INTEGER DEFAULT 0,
    qtd_teste_necessario INTEGER DEFAULT 0,
    qtd_em_teste INTEGER DEFAULT 0,
    qtd_reprovada INTEGER DEFAULT 0,
    qtd_descartada INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: mangueira_movimentacoes
CREATE TABLE IF NOT EXISTS mangueira_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mangueira_id UUID NOT NULL REFERENCES mangueiras(id) ON DELETE CASCADE,
    tipo_movimentacao VARCHAR(50) NOT NULL CHECK (tipo_movimentacao IN ('RECEBIMENTO', 'ENVIO_TESTE', 'RETORNO_APROVADO', 'RETORNO_REPROVADO', 'DESCARTE_AREA', 'DESCARTE_REPROVADA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
    responsavel VARCHAR(255),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mangueiras_codigo ON mangueiras(codigo);
CREATE INDEX IF NOT EXISTS idx_mangueira_movimentacoes_mangueira_id ON mangueira_movimentacoes(mangueira_id);
CREATE INDEX IF NOT EXISTS idx_mangueira_movimentacoes_data ON mangueira_movimentacoes(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_mangueira_movimentacoes_tipo ON mangueira_movimentacoes(tipo_movimentacao);

-- Trigger para atualizar updated_at automaticamente
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

-- Políticas de segurança RLS
ALTER TABLE mangueiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE mangueira_movimentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON mangueiras;
CREATE POLICY "Allow all" ON mangueiras FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON mangueira_movimentacoes;
CREATE POLICY "Allow all" ON mangueira_movimentacoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);