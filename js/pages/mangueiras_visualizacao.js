// ===== CONTROLE DE MANGUEIRAS — VISUALIZAÇÃO PÚBLICA =====

let mangueirasCache = [];
let movimentacoesCache = [];

const TIPOS_MOVIMENTACAO = {
    'RECEBIMENTO':        { label: 'Recebimento',        badge: 'badge-recebimento',        icon: '📥' },
    'APLICACAO_AREA':     { label: 'Aplicação na Área',  badge: 'badge-aplicacao',        icon: '🧯' },
    'ENVIO_TESTE':        { label: 'Envio p/ Teste',     badge: 'badge-envio-teste',      icon: '🔬' },
    'RETORNO_APROVADO':   { label: 'Retorno Aprovado',   badge: 'badge-retorno-aprovado', icon: '✅' },
    'RETORNO_REPROVADO':  { label: 'Retorno Reprovado',  badge: 'badge-retorno-reprovado',icon: '❌' },
    'DESCARTE_AREA':      { label: 'Descarte (Área)',    badge: 'badge-descarte-area',      icon: '🗑️' },
    'DESCARTE_REPROVADA': { label: 'Descarte (Reprovada)',badge: 'badge-descarte-reprovada', icon: '🗑️' }
};

document.addEventListener('DOMContentLoaded', async () => {
    await carregarMangueiras();
    await carregarMovimentacoesMangueira();

    const buscarInput = document.getElementById('buscar-mangueira');
    if (buscarInput) buscarInput.addEventListener('input', buscarMangueira);

    const buscarMovInput = document.getElementById('buscar-movimentacao');
    if (buscarMovInput) buscarMovInput.addEventListener('input', buscarMovimentacaoMangueira);
});

async function carregarMangueiras() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('mangueiras')
            .select('*')
            .eq('ativo', true)
            .order('codigo');

        if (error) throw error;
        mangueirasCache = data || [];
        renderizarMangueiras();
        atualizarCards();
        renderizarAlertas();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar mangueiras', 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function carregarMovimentacoesMangueira() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('mangueira_movimentacoes')
            .select('*, mangueiras(codigo, tipo, diametro)')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;
        movimentacoesCache = data || [];
        renderizarMovimentacoes(movimentacoesCache);
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar movimentações', 'erro');
    } finally {
        toggleLoading(false);
    }
}

// ===== ALERTAS =====

function renderizarAlertas() {
    const container = document.getElementById('alertas-container');
    if (!container) return;

    let html = '';

    const criticos = mangueirasCache.filter(m => (m.estoque_minimo > 0) && (m.qtd_disponivel <= m.estoque_minimo));
    const compra = mangueirasCache.filter(m => (m.limite_compra > 0) && (m.qtd_disponivel <= m.limite_compra));

    if (criticos.length > 0) {
        const nomes = criticos.map(m => `<strong>${m.codigo}</strong> (${m.qtd_disponivel} disp / min ${m.estoque_minimo})`).join(', ');
        html += `<div class="alerta-estoque alerta-critico">🚨 <strong>Estoque Crítico:</strong> ${nomes}</div>`;
    }

    if (compra.length > 0) {
        const nomes = compra.map(m => `<strong>${m.codigo}</strong> (${m.qtd_disponivel} disp / limite ${m.limite_compra})`).join(', ');
        html += `<div class="alerta-estoque alerta-compra">⚠️ <strong>Compra Necessária:</strong> ${nomes}</div>`;
    }

    container.innerHTML = html;
}

// ===== CARDS =====

function atualizarCards() {
    const disponivel = mangueirasCache.reduce((acc, m) => acc + (m.qtd_disponivel || 0), 0);
    const aplicada   = mangueirasCache.reduce((acc, m) => acc + (m.qtd_aplicada   || 0), 0);
    const testeNec   = mangueirasCache.reduce((acc, m) => acc + (m.qtd_teste_necessario || 0), 0);
    const emTeste    = mangueirasCache.reduce((acc, m) => acc + (m.qtd_em_teste   || 0), 0);
    const reprovada  = mangueirasCache.reduce((acc, m) => acc + (m.qtd_reprovada  || 0), 0);
    const descartada = mangueirasCache.reduce((acc, m) => acc + (m.qtd_descartada || 0), 0);

    document.getElementById('total-disponivel').textContent = disponivel;
    document.getElementById('total-aplicada').textContent = aplicada;
    document.getElementById('total-teste-necessario').textContent = testeNec;
    document.getElementById('total-em-teste').textContent = emTeste;
    document.getElementById('total-reprovada').textContent = reprovada;
    document.getElementById('total-descartada').textContent = descartada;
}

// ===== TABELA MANGUEIRAS =====

function renderizarMangueiras(lista = mangueirasCache) {
    const tbody = document.getElementById('tabela-mangueiras');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhuma mangueira cadastrada</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(m => {
        const alertas = [];
        if (m.estoque_minimo > 0 && m.qtd_disponivel <= m.estoque_minimo) {
            alertas.push('<span class="badge badge-danger">CRÍTICO</span>');
        }
        if (m.limite_compra > 0 && m.qtd_disponivel <= m.limite_compra) {
            alertas.push('<span class="badge badge-warning">COMPRA</span>');
        }

        return `
        <tr>
            <td><strong>${m.codigo}</strong></td>
            <td>${m.tipo}</td>
            <td>${m.diametro}</td>
            <td><strong style="color: #22c55e;">${m.qtd_disponivel || 0}</strong></td>
            <td><strong style="color: #8b5cf6;">${m.qtd_aplicada || 0}</strong></td>
            <td><strong style="color: #f59e0b;">${m.qtd_teste_necessario || 0}</strong></td>
            <td><strong style="color: #3b82f6;">${m.qtd_em_teste || 0}</strong></td>
            <td><strong style="color: #ef4444;">${m.qtd_reprovada || 0}</strong></td>
            <td><strong style="color: #6b7280;">${m.qtd_descartada || 0}</strong></td>
            <td>${alertas.length ? alertas.join(' ') : '<span class="badge badge-success">OK</span>'}</td>
        </tr>
    `}).join('');
}

function buscarMangueira() {
    const termo = document.getElementById('buscar-mangueira').value.toLowerCase();
    const filtrados = mangueirasCache.filter(m =>
        m.codigo.toLowerCase().includes(termo) ||
        m.tipo.toLowerCase().includes(termo) ||
        m.diametro.toLowerCase().includes(termo) ||
        (m.descricao || '').toLowerCase().includes(termo)
    );
    renderizarMangueiras(filtrados);
}

// ===== MOVIMENTAÇÕES =====

function renderizarMovimentacoes(dados) {
    const tbody = document.getElementById('tabela-movimentacoes-mangueira');
    if (!dados.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma movimentação registrada</td></tr>';
        return;
    }
    tbody.innerHTML = dados.map(m => {
        const tipoInfo = TIPOS_MOVIMENTACAO[m.tipo_movimentacao] || { label: m.tipo_movimentacao, badge: 'badge-info', icon: '📝' };
        return `
        <tr>
            <td>${formatarData(m.data_movimentacao)}</td>
            <td><span class="badge-movimentacao ${tipoInfo.badge}">${tipoInfo.icon} ${tipoInfo.label}</span></td>
            <td>${m.mangueiras?.tipo || 'N/A'} (${m.mangueiras?.codigo || ''})</td>
            <td><strong>${m.quantidade}</strong></td>
            <td>${m.responsavel || '-'}</td>
            <td>${m.observacao || '-'}</td>
        </tr>
    `}).join('');
}

function buscarMovimentacaoMangueira() {
    const termo = document.getElementById('buscar-movimentacao').value.toLowerCase().trim();
    if (!termo) {
        renderizarMovimentacoes(movimentacoesCache);
        return;
    }
    const filtrados = movimentacoesCache.filter(m => {
        const tipo = (TIPOS_MOVIMENTACAO[m.tipo_movimentacao]?.label || m.tipo_movimentacao).toLowerCase();
        const mangueira = (m.mangueiras?.tipo || '').toLowerCase();
        const codigo = (m.mangueiras?.codigo || '').toLowerCase();
        const responsavel = (m.responsavel || '').toLowerCase();
        const observacao = (m.observacao || '').toLowerCase();
        return tipo.includes(termo) || mangueira.includes(termo) || codigo.includes(termo) ||
               responsavel.includes(termo) || observacao.includes(termo);
    });
    renderizarMovimentacoes(filtrados);
}

async function filtrarMovimentacoesMangueira() {
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const tipo = document.getElementById('filtro-tipo-movimentacao').value;

    toggleLoading(true);
    try {
        let query = sb.from('mangueira_movimentacoes').select('*, mangueiras(codigo, tipo, diametro)');
        if (dataInicio) query = query.gte('data_movimentacao', dataInicio);
        if (dataFim) query = query.lte('data_movimentacao', dataFim);
        if (tipo) query = query.eq('tipo_movimentacao', tipo);

        const { data, error } = await query.order('data_movimentacao', { ascending: false });
        if (error) throw error;

        movimentacoesCache = data || [];
        const termoBusca = document.getElementById('buscar-movimentacao')?.value.toLowerCase().trim() || '';
        if (termoBusca) buscarMovimentacaoMangueira();
        else renderizarMovimentacoes(movimentacoesCache);
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao filtrar', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function limparFiltroMovimentacoes() {
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-tipo-movimentacao').value = '';
    document.getElementById('buscar-movimentacao').value = '';
    carregarMovimentacoesMangueira();
}

// ===== EXPORTAR =====

function exportarMangueiras() {
    const dadosExport = mangueirasCache.map(m => ({
        codigo: m.codigo,
        tipo: m.tipo,
        diametro: m.diametro,
        descricao: m.descricao || '',
        qtd_disponivel: m.qtd_disponivel || 0,
        qtd_aplicada: m.qtd_aplicada || 0,
        qtd_teste_necessario: m.qtd_teste_necessario || 0,
        qtd_em_teste: m.qtd_em_teste || 0,
        qtd_reprovada: m.qtd_reprovada || 0,
        qtd_descartada: m.qtd_descartada || 0,
        estoque_minimo: m.estoque_minimo || 0,
        limite_compra: m.limite_compra || 0
    }));

    const colunas = [
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Tipo', campo: 'tipo' },
        { titulo: 'Diâmetro', campo: 'diametro' },
        { titulo: 'Descrição', campo: 'descricao' },
        { titulo: 'Disponível', campo: 'qtd_disponivel' },
        { titulo: 'Aplicada', campo: 'qtd_aplicada' },
        { titulo: 'Teste Nec.', campo: 'qtd_teste_necessario' },
        { titulo: 'Em Teste', campo: 'qtd_em_teste' },
        { titulo: 'Reprovada', campo: 'qtd_reprovada' },
        { titulo: 'Descartada', campo: 'qtd_descartada' },
        { titulo: 'Estoque Mín', campo: 'estoque_minimo' },
        { titulo: 'Limite Compra', campo: 'limite_compra' }
    ];

    exportarExcel(dadosExport, 'controle_mangueiras', colunas);
}

function exportarMovimentacoesMangueira() {
    const dadosExport = movimentacoesCache.map(m => ({
        data_movimentacao: m.data_movimentacao,
        tipo: TIPOS_MOVIMENTACAO[m.tipo_movimentacao]?.label || m.tipo_movimentacao,
        codigo: m.mangueiras?.codigo || '',
        tipo_mangueira: m.mangueiras?.tipo || 'N/A',
        diametro: m.mangueiras?.diametro || '',
        quantidade: m.quantidade,
        responsavel: m.responsavel || '',
        observacao: m.observacao || ''
    }));

    const colunas = [
        { titulo: 'Data', campo: 'data_movimentacao', formato: 'data' },
        { titulo: 'Tipo Movimentação', campo: 'tipo' },
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Tipo Mangueira', campo: 'tipo_mangueira' },
        { titulo: 'Diâmetro', campo: 'diametro' },
        { titulo: 'Quantidade', campo: 'quantidade' },
        { titulo: 'Responsável', campo: 'responsavel' },
        { titulo: 'Observação', campo: 'observacao' }
    ];

    exportarExcel(dadosExport, 'movimentacoes_mangueiras', colunas);
}