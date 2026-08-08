# 📦 Controle de Materiais

Sistema web completo para controle de estoque e materiais, com integração ao **Supabase** como banco de dados e controle de acesso por perfil de usuário.

## 🚀 Funcionalidades

- ✅ **Cadastro de Locais** - Galpões, depósitos, etc.
- ✅ **Cadastro de Sub-locais** - Prateleiras, gavetas, etc. (hierarquia Local > Sub-local)
- ✅ **Cadastro de Materiais** - Com código SAP, unidade de medida e localização
- ✅ **Controle de Estoque** - Estoque mínimo, máximo e limite para compra
- ✅ **Movimentações** - Registro de entradas (recebimento) e saídas (retirada)
- ✅ **Dashboard** - Visão geral com indicadores e materiais críticos
- ✅ **Relatório de Compras** - Lista automática de materiais que atingiram o limite de compra
- ✅ **Exportação Excel** - Exportação em CSV (compatível com Excel)
- ✅ **Sistema de Login** - Controle de acesso com perfis de usuário
- ✅ **Gerenciamento de Usuários** - Cadastro, edição e exclusão (Administrador)
- ✅ **CRUD Completo** - Inserir, editar e excluir registros em todas as tabelas

## 👤 Perfis de Acesso

| Perfil | Acesso |
|--------|--------|
| **Administrador** | Todas as páginas + cadastro de usuários |
| **Almoxarife** | Locais, Sub-locais, Materiais, Movimentações, Estoque, Compras |
| **Sem Login** | Dashboard, Controle de Estoque, Compras Necessárias |

### Usuários Padrão

| Email | Senha | Perfil |
|-------|-------|--------|
| admin@sistema.com | admin123 | Administrador |
| almoxarife@sistema.com | almo123 | Almoxarife |

## 📁 Estrutura do Projeto

```
controle_materiais/
├── index.html              # Dashboard principal (público)
├── database.sql            # Script SQL para criar tabelas no Supabase
├── README.md               # Documentação
├── css/
│   └── style.css           # Estilos globais
├── js/
│   ├── supabase.js         # Configuração do cliente Supabase + Auth
│   ├── utils.js            # Funções utilitárias + controle de acesso
│   └── pages/
│       ├── dashboard.js    # Lógica do dashboard
│       ├── locais.js       # Lógica de locais e sub-locais
│       ├── materiais.js    # Lógica de materiais
│       ├── movimentacoes.js # Lógica de entradas/saídas
│       ├── estoque.js      # Lógica de controle de estoque
│       ├── compras.js      # Lógica de materiais para compra
│       ├── login.js        # Lógica de autenticação
│       └── usuarios.js     # Lógica de gerenciamento de usuários
└── pages/
    ├── login.html          # Página de login
    ├── locais.html         # Página de locais/sub-locais (restrito)
    ├── materiais.html      # Página de materiais (restrito)
    ├── movimentacoes.html  # Página de movimentações (restrito)
    ├── estoque.html        # Página de controle de estoque (público)
    ├── compras.html        # Página de compras necessárias (público)
    └── usuarios.html       # Página de usuários (admin)
```

## ⚙️ Configuração do Supabase

1. Acesse seu projeto no [Supabase](https://app.supabase.com)
2. Vá em **SQL Editor** > **New query**
3. Cole o conteúdo do arquivo `database.sql`
4. Execute o script (botão **Run**)

### Dados de Conexão (já configurados no projeto)

```javascript
const SB_URL = 'https://dfbjmyrtrmgnihshxhwl.supabase.co';
const SB_KEY = 'sb_publishable_xfP9bf4Dx0rlTejSnd3RZA_CZaCiECB';
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas criadas:

| Tabela | Descrição |
|--------|-----------|
| `locais` | Galpões, depósitos e locais principais |
| `sublocais` | Prateleiras, gavetas (filhos de locais) |
| `materiais` | Cadastro de produtos/materiais |
| `movimentacoes` | Registro de entradas e saídas |
| `usuarios` | Controle de acesso (email, senha, perfil) |

### Views criadas:

| View | Descrição |
|------|-----------|
| `vw_materiais_compra` | Materiais com estoque <= mínimo |
| `vw_estoque_completo` | Posição completa de estoque com status |

## 🚀 Como Usar

1. **Publicar no GitHub Pages** ou qualquer servidor estático
2. **Abrir `index.html`** no navegador
3. **Clique em "Entrar"** no menu e faça login
4. **Cadastrar locais** em "Locais & Sub-locais"
5. **Cadastrar sub-locais** (prateleiras) vinculados aos locais
6. **Cadastrar materiais** em "Materiais"
7. **Registrar movimentações** em "Movimentações"
8. **Acompanhar estoque** em "Controle de Estoque"
9. **Ver compras necessárias** em "Compras Necessárias"
10. **Gerenciar usuários** (apenas Administrador)

## 📊 Regras do Sistema

| Regra | Condição |
|-------|----------|
| **Estoque Crítico** | `quantidade_atual ≤ estoque_minimo` |
| **Estoque Baixo** | `estoque_minimo < quantidade_atual ≤ estoque_minimo × 1.5` |
| **Estoque Normal** | `quantidade_atual > estoque_minimo × 1.5` |
| **Compras Necessárias** | `quantidade_atual ≤ limite_compra` |

## 📊 Exportação Excel

O sistema exporta dados em formato **CSV** (compatível com Excel, Google Sheets, LibreOffice):
- **Materiais** → `materiais_estoque.csv`
- **Movimentações** → `movimentacoes_estoque.csv`
- **Estoque** → `posicao_estoque.csv`
- **Compras** → `materiais_para_compra.csv`

> Os arquivos CSV usam ponto-e-vírgula (`;`) como separador e incluem BOM UTF-8 para suporte a acentos.

## 📅 Formato de Datas

Todas as datas são exibidas no formato **DD/MM/AAAA** e armazenadas corretamente sem problemas de timezone.

## 🔒 Segurança

- O projeto inclui políticas RLS (Row Level Security) abertas para facilitar o uso inicial
- Senhas são hasheadas com algoritmo simples no cliente
- Para produção, recomenda-se implementar autenticação nativa do Supabase Auth

## 🛠️ Tecnologias

- HTML5 + CSS3 (puro, sem frameworks)
- JavaScript Vanilla (ES6+)
- Supabase (PostgreSQL + API REST)
- Sem dependências externas (exceto CDN do Supabase)

---

**Desenvolvido para controle eficiente de materiais e estoque.**
