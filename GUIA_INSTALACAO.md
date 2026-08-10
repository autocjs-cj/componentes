# 🛠️ Guia de Ajustes no Supabase

## Passo a passo

### 1. Acesse o SQL Editor do Supabase
- Vá em **SQL Editor** → **New query**

### 2. Cole o script completo
- Abra o arquivo `AJUSTES_SUPABASE.sql`
- Cole TODO o conteúdo no editor
- Clique em **Run**

---

## 📋 O que o script cria/modifica:

### Tabelas NOVAS:
| Tabela | Descrição |
|--------|-----------|
| `sites` | Cadastro de sites/bases operacionais (id, nome, ativo) |
| `mangueiras` | Controle de mangueiras com 6 status + estoque_minimo + limite_compra |
| `mangueira_movimentacoes` | Histórico de movimentações com documento_referencia |

### Modificações em tabelas EXISTENTES:
| Tabela | Alteração |
|--------|-----------|
| `locais` | Adiciona `site_id` (FK para sites) |
| `materiais` | Adiciona `categoria` (default: 'MATERIAL') |

### Políticas RLS:
Todas as tabelas novas já vêm com RLS aberta (`Allow all`) para anon e authenticated.

---

## ⚠️ Importante

- O script usa `IF NOT EXISTS` e `ADD COLUMN IF NOT EXISTS`
- Pode ser executado **múltiplas vezes** sem erros
- Se você já executou scripts anteriores, este script completo apenas complementa o que falta

---

## ✅ Após executar o SQL

1. Copie os arquivos do ZIP para o projeto (sobrescrevendo os antigos)
2. Acesse a aplicação no navegador
3. Pronto! As novas funcionalidades estarão disponíveis
