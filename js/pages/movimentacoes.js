// ===== MOVIMENTAÇÕES =====

let materiaisCache = [];
let movimentacoesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    ativarMenuAtual();
    document.getElementById('mov-data').value = hojeISO();
    await carregarMateriais();
    await carregarMovimentacoes();

    document.getElementById('form-movimentacao').addEventListener('submit', registrarMovimentacao);
});

async function carregarMateriais() {
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('id, codigo, nome, quantidade_atual')
            .eq('ativo', true)
            .order('nome');

        if (error) throw error;
        materiaisCache = data || [];
        carregarSelect('mov-material', materiaisCache, 'id', 'nome', 'Selecione um material...');
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma movimentação registrada</td></tr>';
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
            <td>${m.motivo || '-'}</td>
        </tr>
    `).join('');
}

async function registrarMovimentacao(e) {
    e.preventDefault();
    if (!validarFormulario('form-movimentacao')) return;

    const tipo = document.getElementById('mov-tipo').value;
    const materialId = document.getElementById('mov-material').value;
    const quantidade = parseInt(document.getElementById('mov-quantidade').value);
    const material = materiaisCache.find(m => m.id === materialId);

    // Validação de saída
    if (tipo === 'SAIDA' && material.quantidade_atual < quantidade) {
        mostrarToast(`Saldo insuficiente! Disponível: ${material.quantidade_atual}`, 'erro');
        return;
    }

    toggleLoading(true);
    try {
        // Registrar movimentação
        const movData = {
            material_id: materialId,
            tipo: tipo,
            quantidade: quantidade,
            data_movimentacao: document.getElementById('mov-data').value,
            responsavel: document.getElementById('mov-responsavel').value.trim() || null,
            documento_referencia: document.getElementById('mov-documento').value.trim() || null,
            motivo: document.getElementById('mov-motivo').value.trim() || null
        };

        const { error: errMov } = await sb.from('movimentacoes').insert(movData);
        if (errMov) throw errMov;

        // Atualizar estoque do material
        const novaQtd = tipo === 'ENTRADA' 
            ? material.quantidade_atual + quantidade 
            : material.quantidade_atual - quantidade;

        const { error: errMat } = await sb
            .from('materiais')
            .update({ quantidade_atual: novaQtd })
            .eq('id', materialId);

        if (errMat) throw errMat;

        // Atualizar cache
        material.quantidade_atual = novaQtd;

        mostrarToast(`${tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
        limparFormulario('form-movimentacao');
        document.getElementById('mov-data').value = hojeISO();
        await carregarMovimentacoes();

    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao registrar movimentação', 'erro');
    } finally {
        toggleLoading(false);
    }
}

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

        renderizarMovimentacoes(data || []);
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao filtrar', 'erro');
    } finally {
        toggleLoading(false);
    }
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
        documento: m.documento_referencia || '',
        motivo: m.motivo || ''
    }));

    const colunas = [
        { titulo: 'Data', campo: 'data_movimentacao', formato: 'data' },
        { titulo: 'Tipo', campo: 'tipo' },
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Material', campo: 'material' },
        { titulo: 'Quantidade', campo: 'quantidade' },
        { titulo: 'Unidade', campo: 'unidade' },
        { titulo: 'Responsável', campo: 'responsavel' },
        { titulo: 'Documento', campo: 'documento' },
        { titulo: 'Motivo', campo: 'motivo' }
    ];

    exportarExcel(dadosExport, 'movimentacoes_estoque', colunas);
}
