// ===== MATERIAIS =====

let materiaisCache = [];
let locaisCache = [];
let sublocaisCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    ativarMenuAtual();
    await carregarLocaisSublocais();
    await carregarMateriais();

    document.getElementById('form-material').addEventListener('submit', salvarMaterial);
    document.getElementById('material-local').addEventListener('change', filtrarSublocais);
    document.getElementById('buscar-material').addEventListener('input', buscarMaterial);
});

async function carregarLocaisSublocais() {
    try {
        const { data: locais } = await sb.from('locais').select('*').eq('ativo', true).order('nome');
        locaisCache = locais || [];
        carregarSelect('material-local', locaisCache, 'id', 'nome', 'Selecione um local...');

        const { data: sublocais } = await sb.from('sublocais').select('*, locais(nome)').eq('ativo', true).order('nome');
        sublocaisCache = sublocais || [];
    } catch (erro) {
        console.error(erro);
    }
}

function filtrarSublocais() {
    const localId = document.getElementById('material-local').value;
    const filtrados = localId ? sublocaisCache.filter(s => s.local_id === localId) : sublocaisCache;
    carregarSelect('material-sublocal', filtrados, 'id', 'nome', 'Selecione um sub-local...');
}

async function carregarMateriais() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('*, sublocais(nome, locais(nome))')
            .eq('ativo', true)
            .order('nome');

        if (error) throw error;
        materiaisCache = data || [];
        renderizarMateriais();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar materiais', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function renderizarMateriais(lista = materiaisCache) {
    const tbody = document.getElementById('tabela-materiais');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Nenhum material cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(m => {
        const status = m.quantidade_atual <= m.estoque_minimo ? 'CRITICO' :
                       m.quantidade_atual <= m.estoque_minimo * 1.5 ? 'BAIXO' : 'NORMAL';
        const badgeClass = status === 'CRITICO' ? 'badge-danger' : 
                          status === 'BAIXO' ? 'badge-warning' : 'badge-success';
        return `
        <tr class="${status.toLowerCase()}">
            <td><strong>${m.codigo}</strong></td>
            <td>${m.nome}</td>
            <td>${m.sublocais?.locais?.nome || '-'}</td>
            <td>${m.sublocais?.nome || '-'}</td>
            <td><strong>${m.quantidade_atual}</strong> ${m.unidade_medida}</td>
            <td>${m.estoque_minimo}</td>
            <td>${m.estoque_maximo}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="editarMaterial('${m.id}')" title="Editar">✏️</button>
                    <button class="btn-acao excluir" onclick="excluirMaterial('${m.id}')" title="Excluir">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function buscarMaterial() {
    const termo = document.getElementById('buscar-material').value.toLowerCase();
    const filtrados = materiaisCache.filter(m => 
        m.nome.toLowerCase().includes(termo) || 
        m.codigo.toLowerCase().includes(termo)
    );
    renderizarMateriais(filtrados);
}

async function salvarMaterial(e) {
    e.preventDefault();
    if (!validarFormulario('form-material')) return;

    toggleLoading(true);
    const id = document.getElementById('material-id').value;
    const dados = {
        codigo: document.getElementById('material-codigo').value.trim().toUpperCase(),
        nome: document.getElementById('material-nome').value.trim(),
        descricao: document.getElementById('material-descricao').value.trim() || null,
        unidade_medida: document.getElementById('material-unidade').value,
        estoque_minimo: parseInt(document.getElementById('material-estoque-min').value) || 0,
        estoque_maximo: parseInt(document.getElementById('material-estoque-max').value) || 999999,
        limite_compra: parseInt(document.getElementById('material-limite-compra').value) || 0,
        sublocal_id: document.getElementById('material-sublocal').value || null
    };

    try {
        if (id) {
            const { error } = await sb.from('materiais').update(dados).eq('id', id);
            if (error) throw error;
            mostrarToast('Material atualizado com sucesso!');
        } else {
            const { error } = await sb.from('materiais').insert(dados);
            if (error) throw error;
            mostrarToast('Material cadastrado com sucesso!');
        }
        limparFormulario('form-material');
        await carregarMateriais();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao salvar material: ' + (erro.message || 'Verifique o código'), 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function editarMaterial(id) {
    const m = materiaisCache.find(x => x.id === id);
    if (!m) return;

    document.getElementById('material-id').value = m.id;
    document.getElementById('material-codigo').value = m.codigo;
    document.getElementById('material-nome').value = m.nome;
    document.getElementById('material-descricao').value = m.descricao || '';
    document.getElementById('material-unidade').value = m.unidade_medida;
    document.getElementById('material-estoque-min').value = m.estoque_minimo;
    document.getElementById('material-estoque-max').value = m.estoque_maximo;
    document.getElementById('material-limite-compra').value = m.limite_compra;

    // Selecionar local e sublocal
    if (m.sublocais) {
        const localId = sublocaisCache.find(s => s.id === m.sublocal_id)?.local_id;
        document.getElementById('material-local').value = localId || '';
        filtrarSublocais();
        document.getElementById('material-sublocal').value = m.sublocal_id || '';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirMaterial(id) {
    if (!await confirmarExclusao()) return;

    toggleLoading(true);
    try {
        const { error } = await sb.from('materiais').update({ ativo: false }).eq('id', id);
        if (error) throw error;
        mostrarToast('Material excluído com sucesso!');
        await carregarMateriais();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao excluir material', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function exportarMateriais() {
    const colunas = [
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Nome', campo: 'nome' },
        { titulo: 'Descrição', campo: 'descricao' },
        { titulo: 'Unidade', campo: 'unidade_medida' },
        { titulo: 'Quantidade Atual', campo: 'quantidade_atual' },
        { titulo: 'Estoque Mínimo', campo: 'estoque_minimo' },
        { titulo: 'Estoque Máximo', campo: 'estoque_maximo' },
        { titulo: 'Limite Compra', campo: 'limite_compra' },
        { titulo: 'Local', campo: 'sublocais' },
        { titulo: 'Sub-local', campo: 'sublocais' }
    ];

    // Preparar dados para exportação
    const dadosExport = materiaisCache.map(m => ({
        ...m,
        sublocais: m.sublocais?.locais?.nome || '-',
        sublocal_nome: m.sublocais?.nome || '-'
    }));

    const colunasExport = [
        { titulo: 'Código', campo: 'codigo' },
        { titulo: 'Nome', campo: 'nome' },
        { titulo: 'Descrição', campo: 'descricao' },
        { titulo: 'Unidade', campo: 'unidade_medida' },
        { titulo: 'Qtd Atual', campo: 'quantidade_atual' },
        { titulo: 'Estoque Min', campo: 'estoque_minimo' },
        { titulo: 'Estoque Max', campo: 'estoque_maximo' },
        { titulo: 'Limite Compra', campo: 'limite_compra' },
        { titulo: 'Local', campo: 'sublocais' },
        { titulo: 'Sub-local', campo: 'sublocal_nome' }
    ];

    exportarExcel(dadosExport, 'materiais_estoque', colunasExport);
}
