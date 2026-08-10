// ===== CONTROLE DE MANGUEIRAS (via tabela materiais) =====

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
    document.getElementById('modal-mov-data').value = hojeISO();
    await carregarMangueiras();
    await carregarMovimentacoesMangueira();

const buscarMovInput = document.getElementById('buscar-movimentacao');
    if (buscarMovInput) buscarMovInput.addEventListener('input', buscarMovimentacaoMangueira);
});

// ===== CARREGAR DADOS =====

async function carregarMangueiras() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('*')
            .eq('eh_mangueira_spci', true)
            .eq('ativo', true)
            .order('codigo');

        if (error) throw error;
        mangueirasCache = data || [];
        atualizarCards();
        atualizarSelectMangueiras();
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
            .select('*, materiais(codigo, nome, diametro)')
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

    const criticos = mangueirasCache.filter(m => (m.estoque_minimo > 0) && (m.quantidade_atual <= m.estoque_minimo));
    const compra = mangueirasCache.filter(m => (m.limite_compra > 0) && (m.quantidade_atual <= m.limite_compra));

    if (criticos.length > 0) {
        const nomes = criticos.map(m => `<strong>${m.codigo}</strong> (${m.quantidade_atual} disp / min ${m.estoque_minimo})`).join(', ');
        html += `<div class="alerta-estoque alerta-critico">🚨 <strong>Estoque Crítico:</strong> ${nomes}</div>`;
    }

    if (compra.length > 0) {
        const nomes = compra.map(m => `<strong>${m.codigo}</strong> (${m.quantidade_atual} disp / limite ${m.limite_compra})`).join(', ');
        html += `<div class="alerta-estoque alerta-compra">⚠️ <strong>Compra Necessária:</strong> ${nomes}</div>`;
    }

    container.innerHTML = html;
}

// ===== CARDS =====

function atualizarCards() {
    const disponivel = mangueirasCache.reduce((acc, m) => acc + (m.quantidade_atual || 0), 0);
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

// ===== TABELA MANGUEIRAS (removida da página) =====
// A listagem de mangueiras foi removida. Apenas cards e movimentações são exibidos.

// ===== MOVIMENTAÇÕES =====

function renderizarMovimentacoes(dados) {
    const tbody = document.getElementById('tabela-movimentacoes-mangueira');
    if (!dados.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma movimentação registrada</td></tr>';
        return;
    }
    tbody.innerHTML = dados.map(m => {
        const tipoInfo = TIPOS_MOVIMENTACAO[m.tipo_movimentacao] || { label: m.tipo_movimentacao, badge: 'badge-info', icon: '📝' };
        return `
        <tr>
            <td>${formatarData(m.data_movimentacao)}</td>
            <td><span class="badge-movimentacao ${tipoInfo.badge}">${tipoInfo.icon} ${tipoInfo.label}</span></td>
            <td>${m.materiais?.nome || 'N/A'} (${m.materiais?.codigo || ''}) — ${m.materiais?.diametro || ''}</td>
            <td><strong>${m.quantidade}</strong></td>
            <td>${m.documento_referencia || '-'}</td>
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
        const mangueira = (m.materiais?.nome || '').toLowerCase();
        const codigo = (m.materiais?.codigo || '').toLowerCase();
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
        let query = sb.from('mangueira_movimentacoes').select('*, materiais(codigo, nome, diametro)');
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

// ===== MODAL MOVIMENTAÇÃO =====

function atualizarSelectMangueiras() {
    const select = document.getElementById('modal-mov-mangueira');
    if (!select) return;
    const valAtual = select.value;
    select.innerHTML = '<option value="">Selecione uma mangueira...</option>';
    mangueirasCache.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.nome} (${m.codigo}) — ${m.diametro || ''}`;
        opt.dataset.disponivel = m.quantidade_atual || 0;
        opt.dataset.aplicada = m.qtd_aplicada || 0;
        opt.dataset.em_teste = m.qtd_em_teste || 0;
        opt.dataset.reprovada = m.qtd_reprovada || 0;
        select.appendChild(opt);
    });
    select.value = valAtual;
}

function atualizarInfoMovimentacao() {
    atualizarSaldoMovimentacao();
}

function atualizarSaldoMovimentacao() {
    const tipo = document.getElementById('modal-mov-tipo').value;
    const materialId = document.getElementById('modal-mov-mangueira').value;
    const infoDiv = document.getElementById('info-saldo-movimentacao');
    const saldoSpan = document.getElementById('saldo-atual-movimentacao');

    if (!tipo || !materialId) {
        infoDiv.classList.add('hidden');
        return;
    }

    const m = mangueirasCache.find(x => x.id === materialId);
    if (!m) {
        infoDiv.classList.add('hidden');
        return;
    }

    let saldo = 0;
    let label = '';

    switch (tipo) {
        case 'RECEBIMENTO':
            label = 'Entrada de estoque — sem limite de saldo';
            saldo = '∞';
            break;
        case 'APLICACAO_AREA':
        case 'DESCARTE_AREA':
            saldo = m.quantidade_atual || 0;
            label = `Disponível: ${saldo} unidades`;
            break;
        case 'ENVIO_TESTE':
            saldo = m.qtd_aplicada || 0;
            label = `Aplicadas na área: ${saldo} unidades`;
            break;
        case 'RETORNO_APROVADO':
        case 'RETORNO_REPROVADO':
            saldo = m.qtd_em_teste || 0;
            label = `Em teste: ${saldo} unidades`;
            break;
        case 'DESCARTE_REPROVADA':
            saldo = m.qtd_reprovada || 0;
            label = `Reprovadas: ${saldo} unidades`;
            break;
    }

    if (tipo === 'RECEBIMENTO') {
        saldoSpan.textContent = label;
    } else {
        saldoSpan.textContent = `${saldo} unidades (${label})`;
    }
    infoDiv.classList.remove('hidden');
}

function abrirModalMovimentacao() {
    document.getElementById('modal-mov-tipo').value = '';
    document.getElementById('modal-mov-mangueira').value = '';
    document.getElementById('modal-mov-quantidade').value = '';
    document.getElementById('modal-mov-data').value = hojeISO();
    document.getElementById('modal-mov-documento').value = '';
    document.getElementById('modal-mov-responsavel').value = '';
    document.getElementById('modal-mov-observacao').value = '';
    document.getElementById('info-saldo-movimentacao').classList.add('hidden');
    atualizarSelectMangueiras();
    document.getElementById('modal-movimentacao-mangueira').classList.remove('hidden');
}

function fecharModalMovimentacao() {
    document.getElementById('modal-movimentacao-mangueira').classList.add('hidden');
}

async function salvarMovimentacaoMangueira() {
    const tipo = document.getElementById('modal-mov-tipo').value;
    const materialId = document.getElementById('modal-mov-mangueira').value;
    const quantidade = parseInt(document.getElementById('modal-mov-quantidade').value);

    if (!tipo || !materialId || !quantidade || quantidade < 1) {
        mostrarToast('Preencha todos os campos obrigatórios corretamente', 'erro');
        return;
    }

    const m = mangueirasCache.find(x => x.id === materialId);
    if (!m) {
        mostrarToast('Mangueira não encontrada', 'erro');
        return;
    }

    // Validações de saldo (RECEBIMENTO não precisa validar)
    let saldoOrigem = null;
    switch (tipo) {
        case 'RECEBIMENTO':
            saldoOrigem = null;
            break;
        case 'APLICACAO_AREA':
        case 'DESCARTE_AREA':
            saldoOrigem = m.quantidade_atual || 0;
            break;
        case 'ENVIO_TESTE':
            saldoOrigem = m.qtd_aplicada || 0;
            break;
        case 'RETORNO_APROVADO':
        case 'RETORNO_REPROVADO':
            saldoOrigem = m.qtd_em_teste || 0;
            break;
        case 'DESCARTE_REPROVADA':
            saldoOrigem = m.qtd_reprovada || 0;
            break;
    }

    if (saldoOrigem !== null && saldoOrigem < quantidade) {
        mostrarToast(`Saldo insuficiente! Disponível: ${saldoOrigem} unidades`, 'erro');
        return;
    }

    toggleLoading(true);
    try {
        // 1. Calcular novas quantidades
        const atualizacoes = calcularAtualizacoes(m, tipo, quantidade);

        // 2. Inserir movimentação
        const movData = {
            material_id: materialId,
            tipo_movimentacao: tipo,
            quantidade: quantidade,
            documento_referencia: document.getElementById('modal-mov-documento').value.trim() || null,
            data_movimentacao: document.getElementById('modal-mov-data').value,
            responsavel: document.getElementById('modal-mov-responsavel').value.trim() || null,
            observacao: document.getElementById('modal-mov-observacao').value.trim() || null
        };

        const { error: errMov } = await sb.from('mangueira_movimentacoes').insert(movData);
        if (errMov) throw errMov;

        // 3. Atualizar material (mangueira)
        const { error: errUpdate } = await sb
            .from('materiais')
            .update(atualizacoes)
            .eq('id', materialId);

        if (errUpdate) throw errUpdate;

        const tipoLabel = TIPOS_MOVIMENTACAO[tipo]?.label || tipo;
        mostrarToast(`${tipoLabel} registrado com sucesso!`);
        fecharModalMovimentacao();
        await carregarMangueiras();
        await carregarMovimentacoesMangueira();

    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao registrar movimentação: ' + (erro.message || 'Tente novamente'), 'erro');
    } finally {
        toggleLoading(false);
    }
}

function calcularAtualizacoes(m, tipo, qtd) {
    const disp = m.quantidade_atual || 0;
    const apl  = m.qtd_aplicada || 0;
    const test = m.qtd_em_teste || 0;
    const rep  = m.qtd_reprovada || 0;
    const desc = m.qtd_descartada || 0;

    switch (tipo) {
        case 'RECEBIMENTO':
            return { quantidade_atual: disp + qtd };
        case 'APLICACAO_AREA':
            return {
                quantidade_atual: Math.max(0, disp - qtd),
                qtd_aplicada: apl + qtd
            };
        case 'ENVIO_TESTE':
            return {
                qtd_aplicada: Math.max(0, apl - qtd),
                qtd_em_teste: test + qtd
            };
        case 'RETORNO_APROVADO':
            return {
                qtd_em_teste: Math.max(0, test - qtd),
                quantidade_atual: disp + qtd
            };
        case 'RETORNO_REPROVADO':
            return {
                qtd_em_teste: Math.max(0, test - qtd),
                qtd_reprovada: rep + qtd
            };
        case 'DESCARTE_AREA':
            return {
                qtd_aplicada: Math.max(0, apl - qtd),
                qtd_descartada: desc + qtd
            };
        case 'DESCARTE_REPROVADA':
            return {
                qtd_reprovada: Math.max(0, rep - qtd),
                qtd_descartada: desc + qtd
            };
        default:
            return {};
    }
}

// ===== EXPORTAR =====

function exportarMangueiras() {
    const dadosExport = mangueirasCache.map(m => ({
        codigo: m.codigo,
        nome: m.nome,
        diametro: m.diametro || '',
        descricao: m.descricao || '',
        qtd_disponivel: m.quantidade_atual || 0,
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
        { titulo: 'Tipo', campo: 'nome' },
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
        codigo: m.materiais?.codigo || '',
        tipo_mangueira: m.materiais?.nome || 'N/A',
        diametro: m.materiais?.diametro || '',
        quantidade: m.quantidade,
        documento: m.documento_referencia || '',
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
        { titulo: 'OM / Pedido', campo: 'documento' },
        { titulo: 'Responsável', campo: 'responsavel' },
        { titulo: 'Observação', campo: 'observacao' }
    ];

    exportarExcel(dadosExport, 'movimentacoes_mangueiras', colunas);
}
