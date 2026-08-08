-- ============================================================
-- ADICIONAR COLUNA SENHA NA TABELA USUARIOS (Supabase)
-- ============================================================

-- 1. Adicionar a coluna senha na tabela usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

-- 2. Garantir que a coluna não aceite valores nulos (após preencher dados existentes)
-- Primeiro atualize os usuários existentes com uma senha temporária,
-- depois execute: ALTER TABLE usuarios ALTER COLUMN senha SET NOT NULL;

-- 3. Inserir usuário administrador padrão (senha: admin123)
-- O hash é calculado pelo algoritmo do cliente
INSERT INTO usuarios (email, nome, senha, perfil, ativo)
VALUES ('admin@sistema.com', 'Administrador', '-1422442968', 'admin', true)
ON CONFLICT (email) DO UPDATE SET 
    senha = EXCLUDED.senha,
    perfil = EXCLUDED.perfil,
    ativo = true;

-- 4. Inserir usuário almoxarife padrão (senha: almo123)
INSERT INTO usuarios (email, nome, senha, perfil, ativo)
VALUES ('almoxarife@sistema.com', 'Almoxarife', '177274736', 'almoxarife', true)
ON CONFLICT (email) DO UPDATE SET 
    senha = EXCLUDED.senha,
    perfil = EXCLUDED.perfil,
    ativo = true;

-- 5. Verificar se os usuários foram criados corretamente
SELECT id, email, nome, perfil, ativo FROM usuarios WHERE ativo = true;
