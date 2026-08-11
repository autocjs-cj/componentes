// ===== MOVIMENTAÇÕES =====

let materiaisCache = [];
let movimentacoesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('modal-mov-data').value = hojeISO();
    await carregarMateriais();
    await carregarMovimentacoes();

    // Filtro automático por digitação (igual página de materiais)
    const buscarInput = document.getElementById('buscar-movimentacao');
    if (buscarInput) {
        buscarInput.addEventListener('input', buscarMovimentacao);
    }
});

async function carregarMateriais() {
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('id, codigo, nome, quantidade_atual, quantidade_reservada, unidade_medida')
            .eq('ativo', true).eq('eh_mangueira_spci', false)
            .order('nome');

        if (error) throw error;
        materiaisCache = data || [];
        // Preenche select de material no modal
        const selectModal = document.getElementById('modal-mov-material');
        if (selectModal) {
            selectModal.innerHTML = '<option value="">Selecione um material...</option>';
            materiaisCache.forEach(m => {
                const disponivel = m.quantidade_atual - (m.quantidade_reservada || 0);
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `${m.nome} (${m.codigo}) — Disp: ${disponivel} ${m.unidade_medida}`;
                opt.dataset.disponivel = disponivel;
                selectModal.appendChild(opt);
            });
        }
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar materiais', 'erro');
    }
}

async function carregarMovimentacoes() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('movimentacoes')
            .select('*, materiais(nome, codigo, unidade_medida)')
            .order('created_at', { ascending: false })
            .limit(100);

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

function renderizarMovimentacoes(dados) {
    const tbody = document.getElementById('tabela-movimentacoes');
    if (!dados.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma movimentação registrada</td></tr>';
        return;
    }
    tbody.innerHTML = dados.map(m => `
        <tr>
            <td>${formatarData(m.data_movimentacao)}</td>
            <td><span class="badge badge-${m.tipo === 'ENTRADA' ? 'success' : 'danger'}">${m.tipo}</span></td>
            <td>${m.materiais?.nome || 'N/A'} (${m.materiais?.codigo || ''})</td>
            <td><strong>${m.quantidade}</strong> ${m.materiais?.unidade_medida || ''}</td>
            <td>${m.responsavel || '-'}</td>
            <td>${m.documento_referencia || '-'}</td>
        </tr>
    `).join('');
}

// ===== FILTRO AUTOMÁTICO POR DIGITAÇÃO (igual página de materiais) =====

function buscarMovimentacao() {
    const termo = document.getElementById('buscar-movimentacao').value.toLowerCase().trim();
    if (!termo) {
        renderizarMovimentacoes(movimentacoesCache);
        return;
    }
    const filtrados = movimentacoesCache.filter(m => {
        const materialNome = (m.materiais?.nome || '').toLowerCase();
        const materialCodigo = (m.materiais?.codigo || '').toLowerCase();
        const responsavel = (m.responsavel || '').toLowerCase();
        const documento = (m.documento_referencia || '').toLowerCase();
        const tipo = (m.tipo || '').toLowerCase();
        return materialNome.includes(termo) ||
               materialCodigo.includes(termo) ||
               responsavel.includes(termo) ||
               documento.includes(termo) ||
               tipo.includes(termo);
    });
    renderizarMovimentacoes(filtrados);
}

// ===== FILTRO POR DATA/TIPO (botão Filtrar) =====

async function filtrarMovimentacoes() {
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const tipo = document.getElementById('filtro-tipo').value;

    toggleLoading(true);
    try {
        let query = sb.from('movimentacoes').select('*, materiais(nome, codigo, unidade_medida)');

        if (dataInicio) query = query.gte('data_movimentacao', dataInicio);
        if (dataFim) query = query.lte('data_movimentacao', dataFim);
        if (tipo) query = query.eq('tipo', tipo);

        const { data, error } = await query.order('data_movimentacao', { ascending: false });
        if (error) throw error;

        movimentacoesCache = data || [];
        // Aplica o filtro de texto também, se houver
        const termoBusca = document.getElementById('buscar-movimentacao')?.value.toLowerCase().trim() || '';
        if (termoBusca) {
            buscarMovimentacao();
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
    document.getElementById('filtro-tipo').value = '';
    document.getElementById('buscar-movimentacao').value = '';
    carregarMovimentacoes();
}

function exportarMovimentacoes() {
    const dadosExport = movimentacoesCache.map(m => ({
        data_movimentacao: m.data_movimentacao,
        tipo: m.tipo,
        material: m.materiais?.nome || 'N/A',
        codigo: m.materiais?.codigo || '',
        quantidade: m.quantidade,
        unidade: m.materiais?.unidade_medida || '',
        responsavel: m.responsavel || '',
        documento: m.documento_referencia || ''
    }));

    const colunas = [
        { titulo: 'Data', campo: 'data_movimentacao', formato: 'data' },
        { titulo: 'Tipo', campo: 'tipo' },
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Material', campo: 'material' },
        { titulo: 'Quantidade', campo: 'quantidade' },
        { titulo: 'Unidade', campo: 'unidade' },
        { titulo: 'Responsável', campo: 'responsavel' },
        { titulo: 'Documento', campo: 'documento' }
    ];

    exportarExcel(dadosExport, 'movimentacoes_estoque', colunas);
}

async function salvarMovimentacaoModal() {
    if (!validarFormulario('form-modal-movimentacao')) return;

    const tipo = document.getElementById('modal-mov-tipo').value;
    const materialId = document.getElementById('modal-mov-material').value;
    const quantidade = parseInt(document.getElementById('modal-mov-quantidade').value);
    const material = materiaisCache.find(m => m.id === materialId);

    const disponivel = material.quantidade_atual - (material.quantidade_reservada || 0);
    if (tipo === 'SAIDA' && disponivel < quantidade) {
        mostrarToast(`Saldo insuficiente! Disponível: ${disponivel} ${material.unidade_medida} (Reservado: ${material.quantidade_reservada || 0})`, 'erro');
        return;
    }

    toggleLoading(true);
    try {
        const dataInput = document.getElementById('modal-mov-data').value;

        const movData = {
            material_id: materialId,
            tipo: tipo,
            quantidade: quantidade,
            data_movimentacao: dataInput,
            responsavel: document.getElementById('modal-mov-responsavel').value.trim() || null,
            documento_referencia: document.getElementById('modal-mov-documento').value.trim() || null
        };

        const { error: errMov } = await sb.from('movimentacoes').insert(movData);
        if (errMov) throw errMov;

        const novaQtd = tipo === 'ENTRADA' 
            ? material.quantidade_atual + quantidade 
            : material.quantidade_atual - quantidade;

        const { error: errMat } = await sb
            .from('materiais')
            .update({ quantidade_atual: novaQtd })
            .eq('id', materialId);

        if (errMat) throw errMat;

        material.quantidade_atual = novaQtd;

        mostrarToast(`${tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
        limparFormulario('form-modal-movimentacao');
        document.getElementById('modal-mov-data').value = hojeISO();
        await carregarMovimentacoes();

    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao registrar movimentação', 'erro');
    } finally {
        toggleLoading(false);
    }
}

// ===== MODAL MOVIMENTAÇÃO =====

function abrirModalNovaMovimentacao() {
    document.getElementById('modal-mov-tipo').value = '';
    document.getElementById('modal-mov-material').value = '';
    document.getElementById('modal-mov-quantidade').value = '';
    document.getElementById('modal-mov-data').value = hojeISO();
    document.getElementById('modal-mov-responsavel').value = '';
    document.getElementById('modal-mov-documento').value = '';
    document.getElementById('modal-movimentacao').classList.remove('hidden');
}

function fecharModalMovimentacao() {
    document.getElementById('modal-movimentacao').classList.add('hidden');
}


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
    atualizarSelectRetornoArea();
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

        // Inserir movimentações
        const { error: errMov } = await sb.from('mangueira_movimentacoes').insert(movimentacoes);
        if (errMov) throw errMov;

        // Atualizar material
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

// Listeners para atualizar soma em tempo real
['retorno-furtadas', 'retorno-teste', 'retorno-descarte'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', atualizarSomaRetorno);
});

// Carregar mangueiras no DOMContentLoaded
carregarMangueirasParaRetorno();

window.abrirModalRetornoArea = abrirModalRetornoArea;
window.fecharModalRetornoArea = fecharModalRetornoArea;
window.salvarRetornoArea = salvarRetornoArea;
window.atualizarInfoRetornoArea = atualizarInfoRetornoArea;
