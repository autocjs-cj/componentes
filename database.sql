-- ============================================================
-- CONTROLE DE MATERIAIS - ESTRUTURA SUPABASE
-- ============================================================

-- Tabela: locais (Galpões, Depósitos, etc.)
CREATE TABLE IF NOT EXISTS locais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: sublocais (Prateleiras, Gavetas, etc.)
CREATE TABLE IF NOT EXISTS sublocais (
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
CREATE TABLE IF NOT EXISTS materiais (
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
CREATE TABLE IF NOT EXISTS movimentacoes (
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

-- Tabela: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) DEFAULT 'almoxarife' CHECK (perfil IN ('admin', 'almoxarife')),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sublocais_local_id ON sublocais(local_id);
CREATE INDEX IF NOT EXISTS idx_materiais_sublocal_id ON materiais(sublocal_id);
CREATE INDEX IF NOT EXISTS idx_materiais_codigo ON materiais(codigo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_material_id ON movimentacoes(material_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes(tipo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_locais_updated_at ON locais;
CREATE TRIGGER update_locais_updated_at BEFORE UPDATE ON locais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sublocais_updated_at ON sublocais;
CREATE TRIGGER update_sublocais_updated_at BEFORE UPDATE ON sublocais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_materiais_updated_at ON materiais;
CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON materiais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View para controle de estoque (materiais abaixo do mínimo)
CREATE OR REPLACE VIEW vw_materiais_compra AS
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
CREATE OR REPLACE VIEW vw_estoque_completo AS
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

-- Políticas de segurança RLS
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE sublocais ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON locais;
CREATE POLICY "Allow all" ON locais FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON sublocais;
CREATE POLICY "Allow all" ON sublocais FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON materiais;
CREATE POLICY "Allow all" ON materiais FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON movimentacoes;
CREATE POLICY "Allow all" ON movimentacoes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON usuarios;
CREATE POLICY "Allow all" ON usuarios FOR ALL USING (true) WITH CHECK (true);

-- Usuário administrador padrão (senha: admin123)
-- O hash é calculado no cliente, mas aqui inserimos um valor conhecido
-- Senha: admin123 -> hash: -1422442968 (calculado pelo algoritmo do cliente)
INSERT INTO usuarios (email, nome, senha, perfil)
VALUES ('admin@sistema.com', 'Administrador', '-1422442968', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Usuário almoxarife padrão (senha: almo123)
-- Senha: almo123 -> hash: 177274736
INSERT INTO usuarios (email, nome, senha, perfil)
VALUES ('almoxarife@sistema.com', 'Almoxarife', '177274736', 'almoxarife')
ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- MIGRAÇÃO: REMOVER COLUNA EMAIL DA TABELA USUARIOS
-- ============================================================
-- Execute estes comandos no SQL Editor do Supabase:

-- 1. Remover a constraint UNIQUE do email (se existir)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;

-- 2. Remover a coluna email
ALTER TABLE usuarios DROP COLUMN IF EXISTS email;

-- 3. Adicionar constraint UNIQUE no nome (login agora é por nome)
ALTER TABLE usuarios ADD CONSTRAINT usuarios_nome_key UNIQUE (nome);

-- 4. Atualizar os usuários padrão (remover referências a email)
UPDATE usuarios SET nome = 'Administrador' WHERE nome = 'admin@sistema.com' OR nome = 'Administrador';
UPDATE usuarios SET nome = 'Almoxarife' WHERE nome = 'almoxarife@sistema.com' OR nome = 'Almoxarife';

-- 5. Inserir usuários padrão atualizados (se não existirem)
INSERT INTO usuarios (nome, senha, perfil)
VALUES ('Administrador', '-1422442968', 'admin')
ON CONFLICT (nome) DO UPDATE SET senha = '-1422442968', perfil = 'admin', ativo = true;

INSERT INTO usuarios (nome, senha, perfil)
VALUES ('Almoxarife', '177274736', 'almoxarife')
ON CONFLICT (nome) DO UPDATE SET senha = '177274736', perfil = 'almoxarife', ativo = true;


-- ============================================================
-- TABELAS DE RESERVA DE MATERIAIS
-- ============================================================

-- Adicionar campo quantidade_reservada na tabela materiais
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS quantidade_reservada INTEGER DEFAULT 0;

-- Tabela: reservas
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

-- Tabela: reserva_itens
CREATE TABLE IF NOT EXISTS reserva_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reserva_id UUID NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_reservas_status ON reservas(status);
CREATE INDEX IF NOT EXISTS idx_reservas_documento ON reservas(documento);
CREATE INDEX IF NOT EXISTS idx_reserva_itens_reserva_id ON reserva_itens(reserva_id);
CREATE INDEX IF NOT EXISTS idx_reserva_itens_material_id ON reserva_itens(material_id);

-- Trigger updated_at para reservas
DROP TRIGGER IF EXISTS update_reservas_updated_at ON reservas;
CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON reservas;
CREATE POLICY "Allow all" ON reservas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON reserva_itens;
CREATE POLICY "Allow all" ON reserva_itens FOR ALL USING (true) WITH CHECK (true);
