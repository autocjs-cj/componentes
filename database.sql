-- ============================================================
-- CONTROLE DE MATERIAIS - ESTRUTURA SUPABASE
-- ============================================================

-- Tabela: locais (Galpões, Depósitos, etc.)
CREATE TABLE locais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: sublocais (Prateleiras, Gavetas, etc.)
CREATE TABLE sublocais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id UUID NOT NULL REFERENCES locais(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    capacidade INTEGER,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: materiais
CREATE TABLE materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    unidade_medida VARCHAR(20) DEFAULT 'UN',
    estoque_minimo INTEGER DEFAULT 0,
    estoque_maximo INTEGER DEFAULT 999999,
    limite_compra INTEGER DEFAULT 0,
    sublocal_id UUID REFERENCES sublocais(id) ON DELETE SET NULL,
    quantidade_atual INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: movimentacoes (entradas e saídas)
CREATE TABLE movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
    responsavel VARCHAR(255),
    motivo TEXT,
    documento_referencia VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: usuarios (opcional - para controle de acesso)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) DEFAULT 'operador' CHECK (perfil IN ('admin', 'operador')),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_sublocais_local_id ON sublocais(local_id);
CREATE INDEX idx_materiais_sublocal_id ON materiais(sublocal_id);
CREATE INDEX idx_materiais_codigo ON materiais(codigo);
CREATE INDEX idx_movimentacoes_material_id ON movimentacoes(material_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes(data_movimentacao);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes(tipo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_locais_updated_at BEFORE UPDATE ON locais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sublocais_updated_at BEFORE UPDATE ON sublocais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON materiais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View para controle de estoque (materiais abaixo do mínimo)
CREATE VIEW vw_materiais_compra AS
SELECT 
    m.id,
    m.codigo,
    m.nome,
    m.descricao,
    m.unidade_medida,
    m.quantidade_atual,
    m.estoque_minimo,
    m.estoque_maximo,
    m.limite_compra,
    (m.estoque_maximo - m.quantidade_atual) AS quantidade_sugerida,
    s.nome AS sublocal,
    l.nome AS local
FROM materiais m
LEFT JOIN sublocais s ON m.sublocal_id = s.id
LEFT JOIN locais l ON s.local_id = l.id
WHERE m.ativo = TRUE 
  AND m.quantidade_atual <= m.estoque_minimo;

-- View para posição de estoque completa
CREATE VIEW vw_estoque_completo AS
SELECT 
    m.id,
    m.codigo,
    m.nome,
    m.descricao,
    m.unidade_medida,
    m.quantidade_atual,
    m.estoque_minimo,
    m.estoque_maximo,
    m.limite_compra,
    CASE 
        WHEN m.quantidade_atual <= m.estoque_minimo THEN 'CRITICO'
        WHEN m.quantidade_atual <= (m.estoque_minimo * 1.5) THEN 'BAIXO'
        ELSE 'NORMAL'
    END AS status_estoque,
    s.nome AS sublocal,
    l.nome AS local
FROM materiais m
LEFT JOIN sublocais s ON m.sublocal_id = s.id
LEFT JOIN locais l ON s.local_id = l.id
WHERE m.ativo = TRUE;

-- Políticas de segurança RLS (Row Level Security) - opcional
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE sublocais ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON locais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON sublocais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON materiais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON movimentacoes FOR ALL USING (true) WITH CHECK (true);

-- Dados de exemplo (opcional)
-- INSERT INTO locais (nome, descricao) VALUES ('Galpão 01', 'Galpão principal de armazenamento');
-- INSERT INTO locais (nome, descricao) VALUES ('Galpão 02', 'Galpão secundário');
-- INSERT INTO sublocais (local_id, nome, descricao, capacidade) VALUES ('uuid-do-galpao-01', 'Prateleira A1', 'Prateleira metálica - Setor A', 500);
-- INSERT INTO sublocais (local_id, nome, descricao, capacidade) VALUES ('uuid-do-galpao-01', 'Prateleira A2', 'Prateleira metálica - Setor A', 500);
-- INSERT INTO sublocais (local_id, nome, descricao, capacidade) VALUES ('uuid-do-galpao-02', 'Gaveteiro B1', 'Gaveteiro organizador - Setor B', 200);
