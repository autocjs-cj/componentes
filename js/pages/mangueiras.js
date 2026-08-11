// ===== CONTROLE DE MANGUEIRAS (via tabela materiais) =====

let mangueirasCache = [];
let movimentacoesCache = [];

// Calcula data de vencimento do teste hidrostático (1 ano após retorno aprovado)
function calcularVencimentoTeste(dataBase) {
    const d = dataBase ? new Date(dataBase) : new Date();
    d.setFullYear(d.getFullYear() + 1);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Verifica status do vencimento: 'vencido', 'proximo' (menos 30 dias), 'ok'
function statusVencimento(dataVencimento) {
    if (!dataVencimento) return 'sem-data';
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const venc = new Date(dataVencimento);
    venc.setHours(0,0,0,0);
    const diffMs = venc - hoje;
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return 'vencido';
    if (diffDias <= 30) return 'proximo';
    return 'ok';
}

const TIPOS_MOVIMENTACAO = {
    'RECEBIMENTO':           { label: 'Recebimento',           badge: 'badge-recebimento',        icon: '📥' },
    'APLICACAO_AREA':        { label: 'Aplicação na Área',     badge: 'badge-aplicacao',          icon: '🧯' },
    'FURTO':                 { label: 'Furto',                 badge: 'badge-furto',              icon: '🦹' },
    'ENVIO_TESTE':           { label: 'Envio p/ Teste',        badge: 'badge-envio-teste',        icon: '🔬' },
    'ENVIO_TESTE_ESTOQUE':   { label: 'Envio p/ Teste (Estoque)', badge: 'badge-envio-teste-estoque', icon: '🔬' },
    'RETORNO_APROVADO':      { label: 'Retorno Aprovado',      badge: 'badge-retorno-aprovado',   icon: '✅' },
    'RETORNO_REPROVADO':     { label: 'Retorno Reprovado',     badge: 'badge-retorno-reprovado',  icon: '❌' },
    'DESCARTE_AREA':         { label: 'Descarte (Área)',       badge: 'badge-descarte-area',      icon: '🗑️' },
    'DESCARTE_REPROVADA':    { label: 'Descarte (Reprovada)',  badge: 'badge-descarte-reprovada', icon: '🗑️' }
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

function renderizarAlertasVencimento() {
    const container = document.getElementById('alertas-vencimento-container');
    if (!container) return;
    const vencidos = mangueirasCache.filter(m => statusVencimento(m.data_vencimento_teste) === 'vencido');
    const proximos = mangueirasCache.filter(m => statusVencimento(m.data_vencimento_teste) === 'proximo');
    let html = '';
    if (vencidos.length > 0) {
        const nomes = vencidos.map(m => `<strong>${m.codigo}</strong> (${m.nome}) — vencido em ${formatarData(m.data_vencimento_teste)}`).join(', ');
        html += `<div class="alerta-estoque alerta-critico">🚨 <strong>Teste Hidrostático Vencido:</strong> ${nomes}</div>`;
    }
    if (proximos.length > 0) {
        const nomes = proximos.map(m => `<strong>${m.codigo}</strong> (${m.nome}) — vence em ${formatarData(m.data_vencimento_teste)}`).join(', ');
        html += `<div class="alerta-estoque alerta-compra">⏰ <strong>Teste Hidrostático Próximo do Vencimento:</strong> ${nomes}</div>`;
    }
    container.innerHTML = html;
}

// ===== CARDS =====

function atualizarCards() {
    const disponivel = mangueirasCache.reduce((acc, m) => acc + (m.quantidade_atual || 0), 0);
    const aplicada   = mangueirasCache.reduce((acc, m) => acc + (m.qtd_aplicada   || 0), 0);
    const furtada    = mangueirasCache.reduce((acc, m) => acc + (m.qtd_furtada    || 0), 0);
    const emTeste    = mangueirasCache.reduce((acc, m) => acc + (m.qtd_em_teste   || 0), 0);
    const reprovada  = mangueirasCache.reduce((acc, m) => acc + (m.qtd_reprovada  || 0), 0);
    const descartada = mangueirasCache.reduce((acc, m) => acc + (m.qtd_descartada || 0), 0);
    const totFur    = mangueirasCache.reduce((acc, m) => acc + (m.total_furtadas || 0), 0);
    const totDescA   = mangueirasCache.reduce((acc, m) => acc + (m.total_descarte_area || 0), 0);
    const totDescT   = mangueirasCache.reduce((acc, m) => acc + (m.total_descarte_teste || 0), 0);

    document.getElementById('total-disponivel').textContent = disponivel;
    document.getElementById('total-aplicada').textContent = aplicada;
    document.getElementById('total-furtada').textContent = furtada;
    document.getElementById('total-em-teste').textContent = emTeste;
    document.getElementById('total-reprovada').textContent = reprovada;
    document.getElementById('total-descartada').textContent = descartada;
    document.getElementById('total-hist-furtadas').textContent = totFur;
    document.getElementById('total-hist-descarte-area').textContent = totDescA;
    document.getElementById('total-hist-descarte-teste').textContent = totDescT;
    renderizarAlertas();
    renderizarAlertasVencimento();
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
        case 'ENVIO_TESTE_ESTOQUE':
            saldo = m.quantidade_atual || 0;
            label = `Disponível: ${saldo} unidades`;
            break;
        case 'ENVIO_TESTE':
        case 'DESCARTE_AREA':
        case 'FURTO':
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
        case 'ENVIO_TESTE_ESTOQUE':
            saldoOrigem = m.quantidade_atual || 0;
            break;
        case 'ENVIO_TESTE':
        case 'DESCARTE_AREA':
        case 'FURTO':
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
    const fur  = m.qtd_furtada || 0;
    const totFur = m.total_furtadas || 0;
    const totDescArea = m.total_descarte_area || 0;
    const totDescTeste = m.total_descarte_teste || 0;

    switch (tipo) {
        case 'RECEBIMENTO':
            return { quantidade_atual: disp + qtd };
        case 'APLICACAO_AREA':
            return {
                quantidade_atual: Math.max(0, disp - qtd),
                qtd_aplicada: apl + qtd
            };
        case 'FURTO':
            return {
                qtd_aplicada: Math.max(0, apl - qtd),
                qtd_furtada: fur + qtd,
                total_furtadas: totFur + qtd
            };
        case 'ENVIO_TESTE':
            return {
                qtd_aplicada: Math.max(0, apl - qtd),
                qtd_em_teste: test + qtd
            };
        case 'ENVIO_TESTE_ESTOQUE':
            return {
                quantidade_atual: Math.max(0, disp - qtd),
                qtd_em_teste: test + qtd
            };
        case 'RETORNO_APROVADO':
            return {
                qtd_em_teste: Math.max(0, test - qtd),
                quantidade_atual: disp + qtd,
                data_vencimento_teste: calcularVencimentoTeste()
            };
        case 'RETORNO_REPROVADO':
            return {
                qtd_em_teste: Math.max(0, test - qtd),
                qtd_reprovada: rep + qtd
            };
        case 'DESCARTE_AREA':
            return {
                qtd_aplicada: Math.max(0, apl - qtd),
                qtd_descartada: desc + qtd,
                total_descarte_area: totDescArea + qtd
            };
        case 'DESCARTE_REPROVADA':
            return {
                qtd_reprovada: Math.max(0, rep - qtd),
                qtd_descartada: desc + qtd,
                total_descarte_teste: totDescTeste + qtd
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
        qtd_furtada: m.qtd_furtada || 0,
        qtd_em_teste: m.qtd_em_teste || 0,
        qtd_reprovada: m.qtd_reprovada || 0,
        qtd_descartada: m.qtd_descartada || 0,
        total_furtadas: m.total_furtadas || 0,
        total_descarte_area: m.total_descarte_area || 0,
        total_descarte_teste: m.total_descarte_teste || 0,
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
        { titulo: 'Furtada', campo: 'qtd_furtada' },
        { titulo: 'Em Teste', campo: 'qtd_em_teste' },
        { titulo: 'Reprovada', campo: 'qtd_reprovada' },
        { titulo: 'Descartada', campo: 'qtd_descartada' },
        { titulo: 'Hist. Furtadas', campo: 'total_furtadas' },
        { titulo: 'Hist. Descarte Área', campo: 'total_descarte_area' },
        { titulo: 'Hist. Descarte Teste', campo: 'total_descarte_teste' },
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

// ===== RETORNO DE TESTE HIDROSTÁTICO =====

let mangueirasRetornoTesteCache = [];

async function carregarMangueirasParaRetornoTeste() {
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('id, codigo, nome, diametro, qtd_em_teste, qtd_reprovada, qtd_descartada, total_descarte_teste, quantidade_atual')
            .eq('eh_mangueira_spci', true)
            .eq('ativo', true)
            .gt('qtd_em_teste', 0)
            .order('nome');

        if (error) throw error;
        mangueirasRetornoTesteCache = data || [];
        atualizarSelectRetornoTeste();
    } catch (erro) {
        console.error('Erro ao carregar mangueiras para retorno de teste:', erro);
    }
}

function atualizarSelectRetornoTeste() {
    const select = document.getElementById('retorno-teste-mangueira');
    if (!select) return;
    const valAtual = select.value;
    select.innerHTML = '<option value="">Selecione uma mangueira...</option>';
    mangueirasRetornoTesteCache.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.nome} (${m.codigo}) — ${m.diametro || ''} [Em teste: ${m.qtd_em_teste}]`;
        opt.dataset.em_teste = m.qtd_em_teste;
        select.appendChild(opt);
    });
    select.value = valAtual;
}

function atualizarInfoRetornoTeste() {
    const materialId = document.getElementById('retorno-teste-mangueira').value;
    const infoDiv = document.getElementById('info-em-teste-retorno');
    const qtdSpan = document.getElementById('qtd-em-teste-retorno');
    const infoSoma = document.getElementById('info-soma-retorno-teste');
    const somaMax = document.getElementById('soma-maximo-teste');

    if (!materialId) {
        infoDiv.classList.add('hidden');
        infoSoma.classList.add('hidden');
        return;
    }

    const m = mangueirasRetornoTesteCache.find(x => x.id === materialId);
    if (!m) {
        infoDiv.classList.add('hidden');
        infoSoma.classList.add('hidden');
        return;
    }

    qtdSpan.textContent = m.qtd_em_teste;
    somaMax.textContent = m.qtd_em_teste;
    infoDiv.classList.remove('hidden');
    infoSoma.classList.remove('hidden');
    atualizarSomaRetornoTeste();
}

function atualizarSomaRetornoTeste() {
    const aprovadas = parseInt(document.getElementById('retorno-aprovadas').value) || 0;
    const reprovadas = parseInt(document.getElementById('retorno-reprovadas').value) || 0;
    const soma = aprovadas + reprovadas;
    document.getElementById('soma-retorno-teste').textContent = soma;

    const materialId = document.getElementById('retorno-teste-mangueira').value;
    const m = mangueirasRetornoTesteCache.find(x => x.id === materialId);
    const maximo = m ? m.qtd_em_teste : 0;

    const somaSpan = document.getElementById('soma-retorno-teste');
    if (soma > maximo) {
        somaSpan.style.color = '#ef4444';
        somaSpan.style.fontWeight = '700';
    } else {
        somaSpan.style.color = '#92400e';
        somaSpan.style.fontWeight = '600';
    }
}

function abrirModalRetornoTeste() {
    document.getElementById('retorno-teste-mangueira').value = '';
    document.getElementById('retorno-aprovadas').value = '0';
    document.getElementById('retorno-reprovadas').value = '0';
    document.getElementById('retorno-teste-data').value = hojeISO();
    document.getElementById('retorno-teste-documento').value = '';
    document.getElementById('retorno-teste-responsavel').value = '';
    document.getElementById('retorno-teste-observacao').value = '';
    document.getElementById('info-em-teste-retorno').classList.add('hidden');
    document.getElementById('info-soma-retorno-teste').classList.add('hidden');
    carregarMangueirasParaRetornoTeste();
    document.getElementById('modal-retorno-teste').classList.remove('hidden');
}

function fecharModalRetornoTeste() {
    document.getElementById('modal-retorno-teste').classList.add('hidden');
}

async function salvarRetornoTeste() {
    const materialId = document.getElementById('retorno-teste-mangueira').value;
    const aprovadas = parseInt(document.getElementById('retorno-aprovadas').value) || 0;
    const reprovadas = parseInt(document.getElementById('retorno-reprovadas').value) || 0;
    const data = document.getElementById('retorno-teste-data').value;
    const documento = document.getElementById('retorno-teste-documento').value.trim() || null;
    const responsavel = document.getElementById('retorno-teste-responsavel').value.trim() || null;
    const observacao = document.getElementById('retorno-teste-observacao').value.trim() || null;

    if (!materialId) {
        mostrarToast('Selecione uma mangueira', 'erro');
        return;
    }

    const m = mangueirasRetornoTesteCache.find(x => x.id === materialId);
    if (!m) {
        mostrarToast('Mangueira não encontrada', 'erro');
        return;
    }

    const total = aprovadas + reprovadas;
    if (total === 0) {
        mostrarToast('Informe pelo menos uma quantidade', 'erro');
        return;
    }

    if (total > m.qtd_em_teste) {
        mostrarToast(`Total excede as mangueiras em teste! Disponível: ${m.qtd_em_teste}`, 'erro');
        return;
    }

    toggleLoading(true);
    try {
        const movimentacoes = [];

        if (aprovadas > 0) {
            movimentacoes.push({
                material_id: materialId,
                tipo_movimentacao: 'RETORNO_APROVADO',
                quantidade: aprovadas,
                data_movimentacao: data,
                documento_referencia: documento,
                responsavel: responsavel,
                observacao: observacao
            });
        }
        if (reprovadas > 0) {
            movimentacoes.push({
                material_id: materialId,
                tipo_movimentacao: 'RETORNO_REPROVADO',
                quantidade: reprovadas,
                data_movimentacao: data,
                documento_referencia: documento,
                responsavel: responsavel,
                observacao: observacao
            });
        }

        const { error: errMov } = await sb.from('mangueira_movimentacoes').insert(movimentacoes);
        if (errMov) throw errMov;

        const novaQtdEmTeste = Math.max(0, m.qtd_em_teste - total);
        const novaQtdReprovada = (m.qtd_reprovada || 0) + reprovadas;
        const novaQtdDescartada = (m.qtd_descartada || 0) + reprovadas;
        const novoTotalDescarteTeste = (m.total_descarte_teste || 0) + reprovadas;

        const atualizacoes = {
            qtd_em_teste: novaQtdEmTeste,
            qtd_reprovada: novaQtdReprovada,
            qtd_descartada: novaQtdDescartada,
            total_descarte_teste: novoTotalDescarteTeste,
            quantidade_atual: (m.quantidade_atual || 0) + aprovadas
        };

        if (aprovadas > 0) {
            atualizacoes.data_vencimento_teste = calcularVencimentoTeste(data);
        }

        const { error: errUpdate } = await sb
            .from('materiais')
            .update(atualizacoes)
            .eq('id', materialId);

        if (errUpdate) throw errUpdate;

        mostrarToast('Retorno de teste registrado com sucesso!');
        fecharModalRetornoTeste();
        await carregarMangueiras();
        await carregarMovimentacoesMangueira();
        await carregarMangueirasParaRetornoTeste();

    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao registrar retorno: ' + (erro.message || 'Tente novamente'), 'erro');
    } finally {
        toggleLoading(false);
    }
}

['retorno-aprovadas', 'retorno-reprovadas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', atualizarSomaRetornoTeste);
});

window.abrirModalRetornoTeste = abrirModalRetornoTeste;
window.fecharModalRetornoTeste = fecharModalRetornoTeste;
window.salvarRetornoTeste = salvarRetornoTeste;
window.atualizarInfoRetornoTeste = atualizarInfoRetornoTeste;

// ===== RETORNO DE MANGUEIRAS DA ÁREA =====

let mangueirasRetornoCache = [];

async function carregarMangueirasParaRetorno() {
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('id, codigo, nome, diametro, qtd_aplicada, qtd_furtada, qtd_em_teste, qtd_descartada, total_furtadas, total_descarte_area')
            .eq('eh_mangueira_spci', true)
            .eq('ativo', true)
            .gt('qtd_aplicada', 0)
            .order('nome');

        if (error) throw error;
        mangueirasRetornoCache = data || [];
        atualizarSelectRetornoArea();
    } catch (erro) {
        console.error('Erro ao carregar mangueiras para retorno:', erro);
    }
}

function atualizarSelectRetornoArea() {
    const select = document.getElementById('retorno-mangueira');
    if (!select) return;
    const valAtual = select.value;
    select.innerHTML = '<option value="">Selecione uma mangueira...</option>';
    mangueirasRetornoCache.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.nome} (${m.codigo}) — ${m.diametro || ''} [Aplicada: ${m.qtd_aplicada}]`;
        opt.dataset.aplicada = m.qtd_aplicada;
        select.appendChild(opt);
    });
    select.value = valAtual;
}

function atualizarInfoRetornoArea() {
    const materialId = document.getElementById('retorno-mangueira').value;
    const infoDiv = document.getElementById('info-aplicada-retorno');
    const qtdSpan = document.getElementById('qtd-aplicada-retorno');
    const infoSoma = document.getElementById('info-soma-retorno');
    const somaMax = document.getElementById('soma-maximo');

    if (!materialId) {
        infoDiv.classList.add('hidden');
        infoSoma.classList.add('hidden');
        return;
    }

    const m = mangueirasRetornoCache.find(x => x.id === materialId);
    if (!m) {
        infoDiv.classList.add('hidden');
        infoSoma.classList.add('hidden');
        return;
    }

    qtdSpan.textContent = m.qtd_aplicada;
    somaMax.textContent = m.qtd_aplicada;
    infoDiv.classList.remove('hidden');
    infoSoma.classList.remove('hidden');
    atualizarSomaRetorno();
}

function atualizarSomaRetorno() {
    const furtadas = parseInt(document.getElementById('retorno-furtadas').value) || 0;
    const teste = parseInt(document.getElementById('retorno-teste').value) || 0;
    const descarte = parseInt(document.getElementById('retorno-descarte').value) || 0;
    const soma = furtadas + teste + descarte;
    document.getElementById('soma-retorno').textContent = soma;

    const materialId = document.getElementById('retorno-mangueira').value;
    const m = mangueirasRetornoCache.find(x => x.id === materialId);
    const maximo = m ? m.qtd_aplicada : 0;

    const somaSpan = document.getElementById('soma-retorno');
    if (soma > maximo) {
        somaSpan.style.color = '#ef4444';
        somaSpan.style.fontWeight = '700';
    } else {
        somaSpan.style.color = '#92400e';
        somaSpan.style.fontWeight = '600';
    }
}

function abrirModalRetornoArea() {
    document.getElementById('retorno-mangueira').value = '';
    document.getElementById('retorno-furtadas').value = '0';
    document.getElementById('retorno-teste').value = '0';
    document.getElementById('retorno-descarte').value = '0';
    document.getElementById('retorno-data').value = hojeISO();
    document.getElementById('retorno-documento').value = '';
    document.getElementById('retorno-responsavel').value = '';
    document.getElementById('retorno-observacao').value = '';
    document.getElementById('info-aplicada-retorno').classList.add('hidden');
    document.getElementById('info-soma-retorno').classList.add('hidden');
    carregarMangueirasParaRetorno();
    document.getElementById('modal-retorno-area').classList.remove('hidden');
}

function fecharModalRetornoArea() {
    document.getElementById('modal-retorno-area').classList.add('hidden');
}

async function salvarRetornoArea() {
    const materialId = document.getElementById('retorno-mangueira').value;
    const furtadas = parseInt(document.getElementById('retorno-furtadas').value) || 0;
    const teste = parseInt(document.getElementById('retorno-teste').value) || 0;
    const descarte = parseInt(document.getElementById('retorno-descarte').value) || 0;
    const data = document.getElementById('retorno-data').value;
    const documento = document.getElementById('retorno-documento').value.trim() || null;
    const responsavel = document.getElementById('retorno-responsavel').value.trim() || null;
    const observacao = document.getElementById('retorno-observacao').value.trim() || null;

    if (!materialId) {
        mostrarToast('Selecione uma mangueira', 'erro');
        return;
    }

    const m = mangueirasRetornoCache.find(x => x.id === materialId);
    if (!m) {
        mostrarToast('Mangueira não encontrada', 'erro');
        return;
    }

    const total = furtadas + teste + descarte;
    if (total === 0) {
        mostrarToast('Informe pelo menos uma quantidade', 'erro');
        return;
    }

    if (total > m.qtd_aplicada) {
        mostrarToast(`Total excede as mangueiras aplicadas! Disponível: ${m.qtd_aplicada}`, 'erro');
        return;
    }

    toggleLoading(true);
    try {
        const movimentacoes = [];

        if (furtadas > 0) {
            movimentacoes.push({
                material_id: materialId,
                tipo_movimentacao: 'FURTO',
                quantidade: furtadas,
                data_movimentacao: data,
                documento_referencia: documento,
                responsavel: responsavel,
                observacao: observacao
            });
        }
        if (teste > 0) {
            movimentacoes.push({
                material_id: materialId,
                tipo_movimentacao: 'ENVIO_TESTE',
                quantidade: teste,
                data_movimentacao: data,
                documento_referencia: documento,
                responsavel: responsavel,
                observacao: observacao
            });
        }
        if (descarte > 0) {
            movimentacoes.push({
                material_id: materialId,
                tipo_movimentacao: 'DESCARTE_AREA',
                quantidade: descarte,
                data_movimentacao: data,
                documento_referencia: documento,
                responsavel: responsavel,
                observacao: observacao
            });
        }

        const { error: errMov } = await sb.from('mangueira_movimentacoes').insert(movimentacoes);
        if (errMov) throw errMov;

        const atualizacoes = {
            qtd_aplicada: Math.max(0, m.qtd_aplicada - total),
            qtd_furtada: (m.qtd_furtada || 0) + furtadas,
            total_furtadas: (m.total_furtadas || 0) + furtadas,
            qtd_em_teste: (m.qtd_em_teste || 0) + teste,
            qtd_descartada: (m.qtd_descartada || 0) + descarte,
            total_descarte_area: (m.total_descarte_area || 0) + descarte
        };

        const { error: errUpdate } = await sb
            .from('materiais')
            .update(atualizacoes)
            .eq('id', materialId);

        if (errUpdate) throw errUpdate;

        mostrarToast('Retorno da área registrado com sucesso!');
        fecharModalRetornoArea();
        await carregarMateriais();
        await carregarMovimentacoes();
        await carregarMangueirasParaRetorno();

    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao registrar retorno: ' + (erro.message || 'Tente novamente'), 'erro');
    } finally {
        toggleLoading(false);
    }
}

['retorno-furtadas', 'retorno-teste', 'retorno-descarte'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', atualizarSomaRetorno);
});

carregarMangueirasParaRetorno();

window.abrirModalRetornoArea = abrirModalRetornoArea;
window.fecharModalRetornoArea = fecharModalRetornoArea;
window.salvarRetornoArea = salvarRetornoArea;
window.atualizarInfoRetornoArea = atualizarInfoRetornoArea;
