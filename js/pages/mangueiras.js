// ===== CONTROLE DE MANGUEIRAS =====

let mangueirasCache = [];
let movimentacoesCache = [];

// Mapeamento de tipos de movimentação para labels e badges
const TIPOS_MOVIMENTACAO = {
    'RECEBIMENTO': { label: 'Recebimento', badge: 'badge-recebimento', icon: '📥' },
    'ENVIO_TESTE': { label: 'Envio p/ Teste', badge: 'badge-envio-teste', icon: '🔬' },
    'RETORNO_APROVADO': { label: 'Retorno Aprovado', badge: 'badge-retorno-aprovado', icon: '✅' },
    'RETORNO_REPROVADO': { label: 'Retorno Reprovado', badge: 'badge-retorno-reprovado', icon: '❌' },
    'DESCARTE_AREA': { label: 'Descarte (Área)', badge: 'badge-descarte-area', icon: '🗑️' },
    'DESCARTE_REPROVADA': { label: 'Descarte (Reprovada)', badge: 'badge-descarte-reprovada', icon: '🗑️' }
};

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('modal-mov-data').value = hojeISO();
    await carregarMangueiras();
    await carregarMovimentacoesMangueira();

    const buscarInput = document.getElementById('buscar-mangueira');
    if (buscarInput) {
        buscarInput.addEventListener('input', buscarMangueira);
    }

    const buscarMovInput = document.getElementById('buscar-movimentacao');
    if (buscarMovInput) {
        buscarMovInput.addEventListener('input', buscarMovimentacaoMangueira);
    }
});

// ===== CARREGAR DADOS =====

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

// ===== RENDERIZAR CARDS =====

function atualizarCards() {
    const disponivel = mangueirasCache.reduce((acc, m) => acc + (m.qtd_disponivel || 0), 0);
    const testeNecessario = mangueirasCache.reduce((acc, m) => acc + (m.qtd_teste_necessario || 0), 0);
    const emTeste = mangueirasCache.reduce((acc, m) => acc + (m.qtd_em_teste || 0), 0);
    const reprovada = mangueirasCache.reduce((acc, m) => acc + (m.qtd_reprovada || 0), 0);
    const descartada = mangueirasCache.reduce((acc, m) => acc + (m.qtd_descartada || 0), 0);

    document.getElementById('total-disponivel').textContent = disponivel;
    document.getElementById('total-teste-necessario').textContent = testeNecessario;
    document.getElementById('total-em-teste').textContent = emTeste;
    document.getElementById('total-reprovada').textContent = reprovada;
    document.getElementById('total-descartada').textContent = descartada;
}

// ===== RENDERIZAR TABELA DE MANGUEIRAS =====

function renderizarMangueiras(lista = mangueirasCache) {
    const tbody = document.getElementById('tabela-mangueiras');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Nenhuma mangueira cadastrada</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(m => `
        <tr>
            <td><strong>${m.codigo}</strong></td>
            <td>${m.tipo}</td>
            <td>${m.diametro}</td>
            <td><strong style="color: #22c55e;">${m.qtd_disponivel || 0}</strong></td>
            <td><strong style="color: #f59e0b;">${m.qtd_teste_necessario || 0}</strong></td>
            <td><strong style="color: #3b82f6;">${m.qtd_em_teste || 0}</strong></td>
            <td><strong style="color: #ef4444;">${m.qtd_reprovada || 0}</strong></td>
            <td><strong style="color: #6b7280;">${m.qtd_descartada || 0}</strong></td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="abrirModalMangueira('${m.id}')" title="Editar">✏️</button>
                    <button class="btn-acao excluir" onclick="excluirMangueira('${m.id}')" title="Excluir">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
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

// ===== RENDERIZAR MOVIMENTAÇÕES =====

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
        if (termoBusca) {
            buscarMovimentacaoMangueira();
        } else {
            renderizarMovimentacoes(movimentacoesCache);
        }
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

// ===== MODAL MANGUEIRA (CADASTRO / EDIÇÃO) =====

function abrirModalMangueira(id = null) {
    const modo = id ? 'editar' : 'novo';
    document.getElementById('modal-mangueira-modo').value = modo;
    document.getElementById('modal-mangueira-id').value = id || '';

    if (id) {
        const m = mangueirasCache.find(x => x.id === id);
        if (!m) return;
        document.getElementById('titulo-modal-mangueira').textContent = '✏️ Editar Mangueira';
        document.getElementById('modal-mangueira-codigo').value = m.codigo;
        document.getElementById('modal-mangueira-diametro').value = m.diametro;
        document.getElementById('modal-mangueira-tipo').value = m.tipo;
        document.getElementById('modal-mangueira-descricao').value = m.descricao || '';

        document.getElementById('modal-info-disponivel').textContent = m.qtd_disponivel || 0;
        document.getElementById('modal-info-teste-necessario').textContent = m.qtd_teste_necessario || 0;
        document.getElementById('modal-info-em-teste').textContent = m.qtd_em_teste || 0;
        document.getElementById('modal-info-reprovada').textContent = m.qtd_reprovada || 0;
        document.getElementById('modal-info-descartada').textContent = m.qtd_descartada || 0;
        document.getElementById('modal-info-estoque-mangueira').classList.remove('hidden');
    } else {
        document.getElementById('titulo-modal-mangueira').textContent = '🚒 Nova Mangueira';
        limparFormulario('form-modal-mangueira');
        document.getElementById('modal-info-estoque-mangueira').classList.add('hidden');
    }

    document.getElementById('modal-mangueira').classList.remove('hidden');
}

function fecharModalMangueira() {
    document.getElementById('modal-mangueira').classList.add('hidden');
}

async function salvarMangueira() {
    const modo = document.getElementById('modal-mangueira-modo').value;
    const id = document.getElementById('modal-mangueira-id').value;

    const codigo = document.getElementById('modal-mangueira-codigo').value.trim().toUpperCase();
    const diametro = document.getElementById('modal-mangueira-diametro').value.trim();
    const tipo = document.getElementById('modal-mangueira-tipo').value.trim();

    if (!codigo || !diametro || !tipo) {
        mostrarToast('Preencha todos os campos obrigatórios', 'erro');
        return;
    }

    const dados = {
        codigo: codigo,
        diametro: diametro,
        tipo: tipo,
        descricao: document.getElementById('modal-mangueira-descricao').value.trim() || null
    };

    toggleLoading(true);
    try {
        if (modo === 'editar' && id) {
            const { error } = await sb.from('mangueiras').update(dados).eq('id', id);
            if (error) throw error;
            mostrarToast('Mangueira atualizada com sucesso!');
        } else {
            const { error } = await sb.from('mangueiras').insert(dados);
            if (error) throw error;
            mostrarToast('Mangueira cadastrada com sucesso!');
        }
        fecharModalMangueira();
        await carregarMangueiras();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao salvar: ' + (erro.message || 'Verifique o código'), 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function excluirMangueira(id) {
    if (!await confirmarExclusao('Excluir esta mangueira?')) return;

    toggleLoading(true);
    try {
        const { error } = await sb.from('mangueiras').update({ ativo: false }).eq('id', id);
        if (error) throw error;
        mostrarToast('Mangueira excluída com sucesso!');
        await carregarMangueiras();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao excluir mangueira', 'erro');
    } finally {
        toggleLoading(false);
    }
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
        opt.textContent = `${m.tipo} (${m.codigo}) — ${m.diametro}`;
        opt.dataset.disponivel = m.qtd_disponivel || 0;
        opt.dataset.teste_necessario = m.qtd_teste_necessario || 0;
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
    const mangueiraId = document.getElementById('modal-mov-mangueira').value;
    const infoDiv = document.getElementById('info-saldo-movimentacao');
    const saldoSpan = document.getElementById('saldo-atual-movimentacao');

    if (!tipo || !mangueiraId) {
        infoDiv.classList.add('hidden');
        return;
    }

    const m = mangueirasCache.find(x => x.id === mangueiraId);
    if (!m) {
        infoDiv.classList.add('hidden');
        return;
    }

    let saldo = 0;
    let label = '';

    switch (tipo) {
        case 'RECEBIMENTO':
            label = 'Estoque disponível atual';
            saldo = m.qtd_disponivel || 0;
            break;
        case 'ENVIO_TESTE':
            label = 'Disponível para envio';
            saldo = m.qtd_disponivel || 0;
            break;
        case 'RETORNO_APROVADO':
        case 'RETORNO_REPROVADO':
            label = 'Em teste no momento';
            saldo = m.qtd_em_teste || 0;
            break;
        case 'DESCARTE_AREA':
            label = 'Disponível para descarte';
            saldo = m.qtd_disponivel || 0;
            break;
        case 'DESCARTE_REPROVADA':
            label = 'Reprovadas para descarte';
            saldo = m.qtd_reprovada || 0;
            break;
    }

    saldoSpan.textContent = `${saldo} unidades (${label})`;
    infoDiv.classList.remove('hidden');
}

function abrirModalMovimentacao() {
    document.getElementById('modal-mov-tipo').value = '';
    document.getElementById('modal-mov-mangueira').value = '';
    document.getElementById('modal-mov-quantidade').value = '';
    document.getElementById('modal-mov-data').value = hojeISO();
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
    const mangueiraId = document.getElementById('modal-mov-mangueira').value;
    const quantidade = parseInt(document.getElementById('modal-mov-quantidade').value);

    if (!tipo || !mangueiraId || !quantidade || quantidade < 1) {
        mostrarToast('Preencha todos os campos obrigatórios corretamente', 'erro');
        return;
    }

    const m = mangueirasCache.find(x => x.id === mangueiraId);
    if (!m) {
        mostrarToast('Mangueira não encontrada', 'erro');
        return;
    }

    // Validações de saldo
    let saldoOrigem = 0;
    switch (tipo) {
        case 'ENVIO_TESTE':
        case 'DESCARTE_AREA':
            saldoOrigem = m.qtd_disponivel || 0;
            break;
        case 'RETORNO_APROVADO':
        case 'RETORNO_REPROVADO':
            saldoOrigem = m.qtd_em_teste || 0;
            break;
        case 'DESCARTE_REPROVADA':
            saldoOrigem = m.qtd_reprovada || 0;
            break;
    }

    if (saldoOrigem < quantidade) {
        mostrarToast(`Saldo insuficiente! Disponível: ${saldoOrigem} unidades`, 'erro');
        return;
    }

    toggleLoading(true);
    try {
        // 1. Calcular novas quantidades
        const atualizacoes = calcularAtualizacoes(m, tipo, quantidade);

        // 2. Inserir movimentação
        const movData = {
            mangueira_id: mangueiraId,
            tipo_movimentacao: tipo,
            quantidade: quantidade,
            data_movimentacao: document.getElementById('modal-mov-data').value,
            responsavel: document.getElementById('modal-mov-responsavel').value.trim() || null,
            observacao: document.getElementById('modal-mov-observacao').value.trim() || null
        };

        const { error: errMov } = await sb.from('mangueira_movimentacoes').insert(movData);
        if (errMov) throw errMov;

        // 3. Atualizar mangueira
        const { error: errUpdate } = await sb
            .from('mangueiras')
            .update(atualizacoes)
            .eq('id', mangueiraId);

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
    const disp = m.qtd_disponivel || 0;
    const nec = m.qtd_teste_necessario || 0;
    const test = m.qtd_em_teste || 0;
    const rep = m.qtd_reprovada || 0;
    const desc = m.qtd_descartada || 0;

    switch (tipo) {
        case 'RECEBIMENTO':
            return { qtd_disponivel: disp + qtd };
        case 'ENVIO_TESTE':
            return {
                qtd_disponivel: Math.max(0, disp - qtd),
                qtd_teste_necessario: Math.max(0, nec - qtd),
                qtd_em_teste: test + qtd
            };
        case 'RETORNO_APROVADO':
            return {
                qtd_em_teste: Math.max(0, test - qtd),
                qtd_disponivel: disp + qtd
            };
        case 'RETORNO_REPROVADO':
            return {
                qtd_em_teste: Math.max(0, test - qtd),
                qtd_reprovada: rep + qtd
            };
        case 'DESCARTE_AREA':
            return {
                qtd_disponivel: Math.max(0, disp - qtd),
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
        tipo: m.tipo,
        diametro: m.diametro,
        descricao: m.descricao || '',
        qtd_disponivel: m.qtd_disponivel || 0,
        qtd_teste_necessario: m.qtd_teste_necessario || 0,
        qtd_em_teste: m.qtd_em_teste || 0,
        qtd_reprovada: m.qtd_reprovada || 0,
        qtd_descartada: m.qtd_descartada || 0
    }));

    const colunas = [
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Tipo', campo: 'tipo' },
        { titulo: 'Diâmetro', campo: 'diametro' },
        { titulo: 'Descrição', campo: 'descricao' },
        { titulo: 'Disponível', campo: 'qtd_disponivel' },
        { titulo: 'Teste Necessário', campo: 'qtd_teste_necessario' },
        { titulo: 'Em Teste', campo: 'qtd_em_teste' },
        { titulo: 'Reprovada', campo: 'qtd_reprovada' },
        { titulo: 'Descartada', campo: 'qtd_descartada' }
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