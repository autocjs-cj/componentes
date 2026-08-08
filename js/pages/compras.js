// ===== COMPRAS NECESSÁRIAS =====

let comprasCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    ativarMenuAtual();
    await carregarCompras();
});

async function carregarCompras() {
    toggleLoading(true);
    try {
        // Buscar todos os materiais ativos e filtrar no cliente
        const { data, error } = await sb
            .from('materiais')
            .select('*, sublocais(nome, locais(nome))')
            .eq('ativo', true)
            .order('nome');

        if (error) throw error;

        // NOVA REGRA: quantidade_atual <= limite_compra
        const materiais = (data || []).filter(m => m.quantidade_atual <= m.limite_compra);

        comprasCache = materiais;
        renderizarCompras();
        atualizarCards();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar lista de compras', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function calcularSugerido(m) {
    // Sugerido = estoque máximo - atual, respeitando o limite de compra
    let sugerido = m.estoque_maximo - m.quantidade_atual;
    if (m.limite_compra > 0 && sugerido > m.limite_compra) {
        sugerido = m.limite_compra;
    }
    return sugerido > 0 ? sugerido : 0;
}

function atualizarCards() {
    const total = comprasCache.length;
    const sugerido = comprasCache.reduce((acc, m) => acc + calcularSugerido(m), 0);

    document.getElementById('total-compras').textContent = total;
    document.getElementById('total-sugerido').textContent = sugerido;
}

function renderizarCompras() {
    const tbody = document.getElementById('tabela-compras');
    if (!comprasCache.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">🎉 Nenhum material necessita de compra no momento!</td></tr>';
        return;
    }
    tbody.innerHTML = comprasCache.map(m => {
        const sugerido = calcularSugerido(m);
        return `
        <tr class="critico">
            <td><strong>${m.codigo}</strong></td>
            <td>${m.nome}</td>
            <td>${m.sublocais?.locais?.nome || '-'}</td>
            <td>${m.sublocais?.nome || '-'}</td>
            <td><strong>${m.quantidade_atual}</strong></td>
            <td>${m.estoque_minimo}</td>
            <td>${m.estoque_maximo}</td>
            <td><strong style="color: var(--danger);">${sugerido}</strong></td>
            <td>${m.limite_compra || '-'}</td>
            <td>${m.unidade_medida}</td>
        </tr>
    `}).join('');
}

function exportarCompras() {
    const dadosExport = comprasCache.map(m => ({
        codigo: m.codigo,
        nome: m.nome,
        local: m.sublocais?.locais?.nome || '-',
        sublocal: m.sublocais?.nome || '-',
        quantidade_atual: m.quantidade_atual,
        estoque_minimo: m.estoque_minimo,
        estoque_maximo: m.estoque_maximo,
        quantidade_sugerida: calcularSugerido(m),
        limite_compra: m.limite_compra,
        unidade_medida: m.unidade_medida
    }));

    const colunas = [
        { titulo: 'Código SAP', campo: 'codigo' },
        { titulo: 'Material', campo: 'nome' },
        { titulo: 'Local', campo: 'local' },
        { titulo: 'Sub-local', campo: 'sublocal' },
        { titulo: 'Qtd Atual', campo: 'quantidade_atual' },
        { titulo: 'Estoque Min', campo: 'estoque_minimo' },
        { titulo: 'Estoque Max', campo: 'estoque_maximo' },
        { titulo: 'Qtd Sugerida', campo: 'quantidade_sugerida' },
        { titulo: 'Limite Compra', campo: 'limite_compra' },
        { titulo: 'Unidade', campo: 'unidade_medida' }
    ];

    exportarExcel(dadosExport, 'materiais_para_compra', colunas);
}
