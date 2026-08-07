# 📦 Controle de Materiais

Sistema web completo para controle de estoque e materiais, com integração ao **Supabase** como banco de dados.

## 🚀 Funcionalidades

- ✅ **Cadastro de Locais** - Galpões, depósitos, etc.
- ✅ **Cadastro de Sub-locais** - Prateleiras, gavetas, etc. (hierarquia Local > Sub-local)
- ✅ **Cadastro de Materiais** - Com código, descrição, unidade de medida e localização
- ✅ **Controle de Estoque** - Estoque mínimo, máximo e limite para compra
- ✅ **Movimentações** - Registro de entradas (recebimento) e saídas (retirada)
- ✅ **Dashboard** - Visão geral com indicadores e materiais críticos
- ✅ **Relatório de Compras** - Lista automática de materiais abaixo do estoque mínimo
- ✅ **Exportação Excel** - Exportação em CSV (compatível com Excel) de estoque e compras
- ✅ **CRUD Completo** - Inserir, editar e excluir registros em todas as tabelas

## 📁 Estrutura do Projeto

```
controle_materiais/
├── index.html              # Dashboard principal
├── database.sql            # Script SQL para criar tabelas no Supabase
├── css/
│   └── style.css           # Estilos globais
├── js/
│   ├── supabase.js         # Configuração do cliente Supabase
│   ├── utils.js            # Funções utilitárias (datas, toast, exportação, etc.)
│   └── pages/
│       ├── dashboard.js    # Lógica do dashboard
│       ├── locais.js       # Lógica de locais e sub-locais
│       ├── materiais.js    # Lógica de materiais
│       ├── movimentacoes.js # Lógica de entradas/saídas
│       ├── estoque.js      # Lógica de controle de estoque
│       └── compras.js      # Lógica de materiais para compra
└── pages/
    ├── locais.html         # Página de locais/sub-locais
    ├── materiais.html      # Página de materiais
    ├── movimentacoes.html  # Página de movimentações
    ├── estoque.html        # Página de controle de estoque
    └── compras.html        # Página de compras necessárias
```

## ⚙️ Configuração do Supabase

1. Acesse seu projeto no [Supabase](https://app.supabase.com)
2. Vá em **SQL Editor** > **New query**
3. Cole o conteúdo do arquivo `database.sql`
4. Execute o script (botão **Run**)

### Dados de Conexão (já configurados no projeto)

```javascript
const SB_URL = 'https://dnlxrelguvereehhbugo.supabase.co';
const SB_KEY = 'sb_publishable_o7CcaPohS7zUmhFz5lZoVw_Z376ElS9';
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas criadas:

| Tabela | Descrição |
|--------|-----------|
| `locais` | Galpões, depósitos e locais principais |
| `sublocais` | Prateleiras, gavetas (filhos de locais) |
| `materiais` | Cadastro de produtos/materiais |
| `movimentacoes` | Registro de entradas e saídas |
| `usuarios` | Controle de acesso (opcional) |

### Views criadas:

| View | Descrição |
|------|-----------|
| `vw_materiais_compra` | Materiais com estoque <= mínimo |
| `vw_estoque_completo` | Posição completa de estoque com status |

## 🚀 Como Usar

1. **Publicar no GitHub Pages** ou qualquer servidor estático
2. **Abrir `index.html`** no navegador
3. **Cadastrar locais** em "Locais & Sub-locais"
4. **Cadastrar sub-locais** (prateleiras) vinculados aos locais
5. **Cadastrar materiais** em "Materiais"
6. **Registrar movimentações** em "Movimentações"
7. **Acompanhar estoque** em "Controle de Estoque"
8. **Ver compras necessárias** em "Compras Necessárias"

## 📊 Exportação Excel

O sistema exporta dados em formato **CSV** (compatível com Excel, Google Sheets, LibreOffice):
- **Materiais** → `materiais_estoque.csv`
- **Movimentações** → `movimentacoes_estoque.csv`
- **Estoque** → `posicao_estoque.csv`
- **Compras** → `materiais_para_compra.csv`

> Os arquivos CSV usam ponto-e-vírgula (`;`) como separador e incluem BOM UTF-8 para suporte a acentos.

## 📅 Formato de Datas

Todas as datas são exibidas no formato **DD/MM/AAAA** conforme solicitado.

## 🔒 Segurança

O projeto inclui políticas RLS (Row Level Security) abertas. Para produção, recomenda-se:
- Implementar autenticação no Supabase
- Ajustar as políticas RLS conforme necessário
- Usar a tabela `usuarios` para controle de perfis

## 🛠️ Tecnologias

- HTML5 + CSS3 (puro, sem frameworks)
- JavaScript Vanilla (ES6+)
- Supabase (PostgreSQL + API REST)
- Sem dependências externas (exceto CDN do Supabase)

---

**Desenvolvido para controle eficiente de materiais e estoque.**
