# 📦 Controle de Materiais

Sistema web completo para controle de estoque e materiais, com banco de dados no **Supabase** e pronto para publicação no **GitHub Pages**.

---

## ✨ Funcionalidades

- ✅ **Cadastro de Locais e Sub-locais** de armazenamento
- ✅ **Cadastro de Materiais** com vínculo a local de armazenamento
- ✅ **Controle de Estoque** automático (entrada, saída, saldo)
- ✅ **Status automático** do estoque (Abaixo do mínimo, Dentro do Intervalo, Acima do máximo)
- ✅ **Alerta de compra** quando estoque atinge o limite de solicitação
- ✅ **Registro de Movimentações** (entrada e saída de materiais)
- ✅ **Filtros avançados** por OM, descrição, datas e local
- ✅ **Exportação para Excel** do estoque completo
- ✅ **Exportação para Excel** de materiais que necessitam compra
- ✅ **Controle de Usuários** com níveis de acesso (Admin, Gerente, Operador, Consulta)
- ✅ **Segurança por funcionalidade** (RLS - Row Level Security)
- ✅ **Dashboard** com indicadores e alertas em tempo real

---

## 🚀 Tecnologias

- **HTML5 + CSS3 + JavaScript** (Vanilla)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **SheetJS (XLSX)** para exportação Excel
- **Font Awesome** para ícones

---

## 📋 Pré-requisitos

1. Conta no [Supabase](https://supabase.com)
2. Conta no [GitHub](https://github.com)

---

## ⚙️ Configuração do Supabase

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha os dados do projeto e aguarde a criação

### 2. Executar o Schema

1. No painel do Supabase, vá em **SQL Editor**
2. Crie uma **"New query"**
3. Cole todo o conteúdo do arquivo `schema.sql`
4. Clique em **"Run"**

### 3. Configurar Autenticação

1. Vá em **Authentication > Settings**
2. Em **Site URL**, coloque a URL do seu GitHub Pages (ex: `https://seuusuario.github.io/controle-materiais`)
3. Em **Redirect URLs**, adicione a mesma URL

### 4. Obter credenciais

1. Vá em **Project Settings > API**
2. Copie a **URL** e a **anon public** key
3. Cole esses valores no arquivo `js/app.js`:

```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';
```

---

## 📤 Publicação no GitHub

### 1. Criar repositório

1. Acesse [github.com](https://github.com)
2. Crie um novo repositório público chamado `controle-materiais`
3. **Não** inicialize com README (já temos um)

### 2. Enviar arquivos

```bash
git init
git add .
git commit -m "Primeiro commit - Controle de Materiais"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/controle-materiais.git
git push -u origin main
```

Ou faça upload manual dos arquivos via interface web.

### 3. Habilitar GitHub Pages

1. No repositório, vá em **Settings > Pages**
2. Em **Source**, selecione **Deploy from a branch**
3. Selecione a branch `main` e pasta `/ (root)`
4. Clique em **Save**
5. Aguarde alguns minutos e acesse a URL fornecida

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `sub_local` | Sub-locais de armazenamento |
| `local_armazenamento` | Locais de armazenamento (vinculados a sub-locais) |
| `material` | Cadastro de materiais |
| `controle_materiais` | Controle de estoque com cálculos automáticos |
| `movimentacao` | Histórico de entradas e saídas |
| `perfis` | Perfis de usuários com níveis de acesso |

### Relacionamentos

```
sub_local (1) ──────> (N) local_armazenamento
local_armazenamento (1) ──────> (N) material
local_armazenamento (1) ──────> (N) controle_materiais
material (1) ──────> (1) controle_materiais
material (1) ──────> (N) movimentacao
```

### Campos Calculados

- **`estoque_atual`** = `entrada - saída` (calculado automaticamente)
- **`status`** = baseado na comparação com estoque mínimo e máximo

---

## 👥 Níveis de Acesso

| Nível | Permissões |
|-------|------------|
| **Admin** | Acesso total: cadastrar, editar, excluir, visualizar, exportar, gerenciar usuários |
| **Gerente** | Cadastrar, editar, visualizar, exportar, receber, retirar |
| **Operador** | Cadastrar, visualizar, receber, retirar |
| **Consulta** | Apenas visualizar |

---

## 📁 Estrutura de Arquivos

```
controle-materiais/
├── index.html          # Página principal (SPA)
├── css/
│   └── style.css       # Estilos da aplicação
├── js/
│   └── app.js          # Lógica principal da aplicação
├── schema.sql          # Script SQL para criar tabelas no Supabase
└── README.md           # Este arquivo
```

---

## 🔒 Segurança

- **RLS (Row Level Security)** habilitado em todas as tabelas
- Políticas de acesso baseadas no nível do usuário
- Autenticação via Supabase Auth (JWT)
- Senhas criptografadas automaticamente

---

## 📝 Primeiro Acesso

1. Acesse a aplicação publicada
2. Clique em **"Cadastre-se"**
3. Crie sua conta
4. O primeiro usuário cadastrado terá nível **"consulta"**
5. Para tornar um usuário **admin**, execute no SQL Editor do Supabase:

```sql
UPDATE perfis SET nivel_acesso = 'admin', funcionalidades = array['cadastrar','editar','excluir','visualizar','exportar','receber','retirar']
WHERE email = 'seu-email@exemplo.com';
```

---

## 🛠️ Personalização

### Cores
Edite as variáveis CSS no arquivo `css/style.css`:

```css
:root {
    --primary: #2563eb;    /* Azul principal */
    --success: #10b981;    /* Verde */
    --danger: #ef4444;     /* Vermelho */
    --warning: #f59e0b;    /* Amarelo */
}
```

### Logo
Altere o ícone e título no `index.html` na seção `.login-logo`.

---

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verifique o console do navegador (F12) para erros
2. Confirme se as credenciais do Supabase estão corretas
3. Verifique se o schema SQL foi executado sem erros
4. Consulte a [documentação do Supabase](https://supabase.com/docs)

---

## 📄 Licença

Este projeto é de código aberto. Sinta-se livre para usar, modificar e distribuir.

---

**Desenvolvido com ❤️ para gestão eficiente de materiais.**
