// ===== CONTROLE DE ESTOQUE =====

let estoqueCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarEstoque();

    document.getElementById('buscar-estoque').addEventListener('input', buscarEstoque);
});

async function carregarEstoque() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('*, quantidade_reservada, sublocais(nome, locais(nome))')
            .eq('ativo', true)
            .order('nome');

        if (error) throw error;
        estoqueCache = data || [];
        renderizarEstoque();
        atualizarCards();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar estoque', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function calcularStatus(m) {
    if (m.quantidade_atual <= m.estoque_minimo) return 'CRITICO';
    if (m.quantidade_atual <= m.estoque_minimo * 1.5) return 'BAIXO';
    return 'NORMAL';
}

function atualizarCards() {
    const normal = estoqueCache.filter(m => calcularStatus(m) === 'NORMAL').length;
    const baixo = estoqueCache.filter(m => calcularStatus(m) === 'BAIXO').length;
    const critico = estoqueCache.filter(m => calcularStatus(m) === 'CRITICO').length;

    document.getElementById('estoque-normal').textContent = normal;
    document.getElementById('estoque-baixo').textContent = baixo;
    document.getElementById('estoque-critico').textContent = critico;
}

function renderizarEstoque(lista = estoqueCache) {
    const tbody = document.getElementById('tabela-estoque');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Nenhum material em estoque</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(m => {
        const status = calcularStatus(m);
        const badgeClass = status === 'CRITICO' ? 'badge-danger' : 
                          status === 'BAIXO' ? 'badge-warning' : 'badge-success';
        return `
        <tr class="${status.toLowerCase()}">
            <td><strong>${m.codigo}</strong></td>
            <td>${m.nome}</td>
            <td>${m.sublocais?.locais?.nome || '-'}</td>
            <td>${m.sublocais?.nome || '-'}</td>
            <td><strong>${m.quantidade_atual}</strong> ${m.unidade_medida}</td>
            <td>${m.quantidade_reservada || 0}</td>
            <td><strong>${m.quantidade_atual - (m.quantidade_reservada || 0)}</strong> ${m.unidade_medida}</td>
            <td>${m.estoque_minimo}</td>
            <td>${m.estoque_maximo}</td>
            <td>${m.limite_compra}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
        </tr>
    `}).join('');
}

function buscarEstoque() {
    const termo = document.getElementById('buscar-estoque').value.toLowerCase();
    const filtrados = estoqueCache.filter(m => 
        m.nome.toLowerCase().includes(termo) || 
        m.codigo.toLowerCase().includes(termo) ||
        (m.sublocais?.locais?.nome || '').toLowerCase().includes(termo)
    );
    renderizarEstoque(filtrados);
}

function filtrarEstoque() {
    const statusFiltro = document.getElementById('filtro-status').value;
    let filtrados = estoqueCache;

    if (statusFiltro) {
        filtrados = estoqueCache.filter(m => calcularStatus(m) === statusFiltro);
    }

    const termo = document.getElementById('buscar-estoque').value.toLowerCase();
    if (termo) {
        filtrados = filtrados.filter(m => 
            m.nome.toLowerCase().includes(termo) || 
            m.codigo.toLowerCase().includes(termo)
        );
    }

    renderizarEstoque(filtrados);
}

function exportarEstoque() {
    const dadosExport = estoqueCache.map(m => ({
        codigo: m.codigo,
        nome: m.nome,
        descricao: m.descricao || '',
        local: m.sublocais?.locais?.nome || '-',
        sublocal: m.sublocais?.nome || '-',
        quantidade_atual: m.quantidade_atual,
        quantidade_reservada: m.quantidade_reservada || 0,
        disponivel: m.quantidade_atual - (m.quantidade_reservada || 0),
        unidade: m.unidade_medida,
        estoque_minimo: m.estoque_minimo,
        estoque_maximo: m.estoque_maximo,
        limite_compra: m.limite_compra,
        status: calcularStatus(m)
    }));

    const colunas = [
        { titulo: 'Código SAP', campo: 'codigo' },
        { titulo: 'Nome', campo: 'nome' },
        { titulo: 'Descrição', campo: 'descricao' },
        { titulo: 'Local', campo: 'local' },
        { titulo: 'Sub-local', campo: 'sublocal' },
        { titulo: 'Qtd Atual', campo: 'quantidade_atual' },
        { titulo: 'Reservado', campo: 'quantidade_reservada' },
        { titulo: 'Disponível', campo: 'disponivel' },
        { titulo: 'Unidade', campo: 'unidade' },
        { titulo: 'Estoque Min', campo: 'estoque_minimo' },
        { titulo: 'Estoque Max', campo: 'estoque_maximo' },
        { titulo: 'Limite Compra', campo: 'limite_compra' },
        { titulo: 'Status', campo: 'status' }
    ];

    exportarExcel(dadosExport, 'posicao_estoque', colunas);
}
