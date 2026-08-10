-- ============================================================
-- TABELA SITES + MODIFICAÇÃO LOCAIS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Criar tabela sites
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar site_id na tabela locais
ALTER TABLE locais ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- 3. Remover coluna site antiga (se existir de migração anterior)
ALTER TABLE locais DROP COLUMN IF EXISTS site;

-- 4. Índice
CREATE INDEX IF NOT EXISTS idx_locais_site_id ON locais(site_id);

-- 5. RLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON sites;
CREATE POLICY "Allow all" ON sites FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
