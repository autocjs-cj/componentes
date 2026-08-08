-- ============================================================
-- CORRIGIR CONSTRAINT DE PERFIL NA TABELA USUARIOS
-- ============================================================

-- 1. Remover a constraint antiga (que aceita apenas 'admin' e 'operador')
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;

-- 2. Criar nova constraint aceitando 'admin' e 'almoxarife'
ALTER TABLE usuarios ADD CONSTRAINT usuarios_perfil_check 
    CHECK (perfil IN ('admin', 'almoxarife'));

-- 3. Atualizar usuários existentes com perfil 'operador' para 'almoxarife'
UPDATE usuarios SET perfil = 'almoxarife' WHERE perfil = 'operador';

-- 4. Verificar se a constraint foi aplicada corretamente
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'usuarios';

-- 5. Listar usuários ativos
SELECT id, email, nome, perfil, ativo FROM usuarios WHERE ativo = true;
