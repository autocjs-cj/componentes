# 🚒 Instruções de Instalação - Controle de Mangueiras

## Arquivos novos para copiar

1. **mangueiras.html** → `pages/mangueiras.html`
2. **mangueiras.js** → `js/pages/mangueiras.js`
3. **database_mangueiras.sql** → Execute no SQL Editor do Supabase

## Arquivos a modificar

### 1. js/utils.js

Adicione `'mangueiras.html': 'almoxarife'` no objeto `PAGINAS_RESTRITAS`:

```javascript
const PAGINAS_RESTRITAS = {
    'locais.html': 'almoxarife',
    'materiais.html': 'almoxarife',
    'movimentacoes.html': 'almoxarife',
    'reserva.html': 'almoxarife',
    'mangueiras.html': 'almoxarife',   // <-- ADICIONAR ESTA LINHA
    'usuarios.html': 'admin'
};
```

Adicione o link no menu dentro da função `renderizarMenu()`, na seção que só aparece para usuários logados (almoxarife/admin):

```javascript
<li class="nav-item">
    <a href="${prefix}mangueiras.html" class="nav-link">
        <span class="nav-icon">🚒</span> Controle de Mangueiras
    </a>
</li>
```

### 2. Banco de Dados (Supabase)

Execute o script `database_mangueiras.sql` no SQL Editor do Supabase.

## Funcionalidades

- ✅ **Cadastro de tipos de mangueira** (código, diâmetro, tipo, descrição)
- ✅ **5 status de controle**: Disponível, Teste Necessário, Em Teste, Reprovada, Descartada
- ✅ **6 tipos de movimentação**:
  - 📥 Recebimento (compra nova / retorno aprovado de teste)
  - 🔬 Envio para Teste Hidrostático
  - ✅ Retorno de Teste Aprovado
  - ❌ Retorno de Teste Reprovado
  - 🗑️ Descarte (danificada da área)
  - 🗑️ Descarte (reprovada no teste)
- ✅ **Validação de saldo** — impede movimentação sem saldo suficiente
- ✅ **Histórico completo** de movimentações com filtros
- ✅ **Exportação Excel** de mangueiras e movimentações
- ✅ **Acesso restrito** a Almoxarife e Administrador
