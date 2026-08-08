// ===== MATERIAIS =====

let materiaisCache = [];
let locaisCache = [];
let sublocaisCache = [];

document.addEventListener('DOMContentLoaded', async () => {
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
            .select('*, quantidade_reservada, sublocais(nome, locais(nome))')
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
        tbody.innerHTML = '<tr><td colspan="12" class="text-center">Nenhum material cadastrado</td></tr>';
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
            <td>${m.descricao || '-'}</td>
            <td>${m.sublocais?.locais?.nome || '-'}</td>
            <td>${m.sublocais?.nome || '-'}</td>
            <td><strong>${m.quantidade_atual}</strong> ${m.unidade_medida}</td>
            <td>${m.quantidade_reservada || 0}</td>
            <td><strong>${m.quantidade_atual - (m.quantidade_reservada || 0)}</strong></td>
            <td>${m.estoque_minimo}</td>
            <td>${m.estoque_maximo}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="abrirModalMaterial('${m.id}')" title="Ver detalhes">👁️</button>
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

async function duplicarMaterial(id) {
    const m = materiaisCache.find(x => x.id === id);
    if (!m) return;

    // Limpa o formulário e preenche com os dados do material original
    limparFormulario('form-material');
    document.getElementById('material-id').value = '';
    document.getElementById('material-codigo').value = m.codigo + '-COPY';
    document.getElementById('material-nome').value = m.nome + ' (Cópia)';
    document.getElementById('material-descricao').value = m.descricao || '';
    document.getElementById('material-unidade').value = m.unidade_medida;
    document.getElementById('material-estoque-min').value = m.estoque_minimo;
    document.getElementById('material-estoque-max').value = m.estoque_maximo;
    document.getElementById('material-limite-compra').value = m.limite_compra;

    if (m.sublocais) {
        const localId = sublocaisCache.find(s => s.id === m.sublocal_id)?.local_id;
        document.getElementById('material-local').value = localId || '';
        filtrarSublocais();
        document.getElementById('material-sublocal').value = m.sublocal_id || '';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarToast('Material duplicado no formulário. Edite o código e salve!');
}

function exportarMateriais() {
    const dadosExport = materiaisCache.map(m => ({
        codigo: m.codigo,
        nome: m.nome,
        descricao: m.descricao || '',
        unidade_medida: m.unidade_medida,
        quantidade_atual: m.quantidade_atual,
        quantidade_reservada: m.quantidade_reservada || 0,
        disponivel: m.quantidade_atual - (m.quantidade_reservada || 0),
        estoque_minimo: m.estoque_minimo,
        estoque_maximo: m.estoque_maximo,
        limite_compra: m.limite_compra,
        local: m.sublocais?.locais?.nome || '-',
        sublocal_nome: m.sublocais?.nome || '-'
    }));

    const colunasExport = [
        { titulo: 'Código SAP', campo: 'codigo' },
        { titulo: 'Nome', campo: 'nome' },
        { titulo: 'Descrição', campo: 'descricao' },
        { titulo: 'Unidade', campo: 'unidade_medida' },
        { titulo: 'Qtd Atual', campo: 'quantidade_atual' },
        { titulo: 'Reservado', campo: 'quantidade_reservada' },
        { titulo: 'Disponível', campo: 'disponivel' },
        { titulo: 'Estoque Min', campo: 'estoque_minimo' },
        { titulo: 'Estoque Max', campo: 'estoque_maximo' },
        { titulo: 'Limite Compra', campo: 'limite_compra' },
        { titulo: 'Local', campo: 'local' },
        { titulo: 'Sub-local', campo: 'sublocal_nome' }
    ];

    exportarExcel(dadosExport, 'materiais_estoque', colunasExport);
}




// ===== MODAL MATERIAL (estilo Locais) =====

function abrirModalNovoMaterial() {
    document.getElementById('modal-material-id').value = '';
    document.getElementById('modal-material-modo').value = 'novo';
    document.getElementById('titulo-modal-material').textContent = '📋 Novo Material';
    document.getElementById('modal-material-codigo').value = '';
    document.getElementById('modal-material-nome').value = '';
    document.getElementById('modal-material-descricao').value = '';
    document.getElementById('modal-material-unidade').value = 'UN';
    document.getElementById('modal-material-estoque-min').value = 0;
    document.getElementById('modal-material-estoque-max').value = 999999;
    document.getElementById('modal-material-limite-compra').value = 0;
    document.getElementById('modal-info-estoque').classList.add('hidden');

    carregarSelectModal('modal-material-local', locaisCache, 'id', 'nome', 'Selecione um local...');
    carregarSelectModal('modal-material-sublocal', [], 'id', 'nome', 'Selecione um sub-local...');

    // Habilitar todos os campos
    ['modal-material-codigo', 'modal-material-nome', 'modal-material-descricao',
     'modal-material-unidade', 'modal-material-local', 'modal-material-sublocal',
     'modal-material-estoque-min', 'modal-material-estoque-max', 'modal-material-limite-compra']
    .forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.removeAttribute('readonly'); el.removeAttribute('disabled'); }
    });

    document.getElementById('modal-material').classList.remove('hidden');
}

function abrirModalMaterial(id) {
    const m = materiaisCache.find(x => x.id === id);
    if (!m) return;

    document.getElementById('modal-material-id').value = m.id;
    document.getElementById('modal-material-modo').value = 'editar';
    document.getElementById('titulo-modal-material').textContent = '✏️ Editar Material';
    document.getElementById('modal-material-codigo').value = m.codigo;
    document.getElementById('modal-material-nome').value = m.nome;
    document.getElementById('modal-material-descricao').value = m.descricao || '';
    document.getElementById('modal-material-unidade').value = m.unidade_medida;
    document.getElementById('modal-material-estoque-min').value = m.estoque_minimo;
    document.getElementById('modal-material-estoque-max').value = m.estoque_maximo;
    document.getElementById('modal-material-limite-compra').value = m.limite_compra;

    document.getElementById('modal-info-atual').textContent = m.quantidade_atual;
    document.getElementById('modal-info-reservada').textContent = m.quantidade_reservada || 0;
    document.getElementById('modal-info-disponivel').textContent = m.quantidade_atual - (m.quantidade_reservada || 0);
    document.getElementById('modal-info-estoque').classList.remove('hidden');

    const localId = m.sublocais ? sublocaisCache.find(s => s.id === m.sublocal_id)?.local_id : '';
    carregarSelectModal('modal-material-local', locaisCache, 'id', 'nome', 'Selecione um local...');
    document.getElementById('modal-material-local').value = localId || '';
    filtrarSublocaisModal();
    document.getElementById('modal-material-sublocal').value = m.sublocal_id || '';

    document.getElementById('modal-material').classList.remove('hidden');
}

function fecharModalMaterial() {
    document.getElementById('modal-material').classList.add('hidden');
}

async function salvarMaterialDoModal() {
    const modo = document.getElementById('modal-material-modo').value;
    const id = document.getElementById('modal-material-id').value;

    const codigo = document.getElementById('modal-material-codigo').value.trim().toUpperCase();
    const nome = document.getElementById('modal-material-nome').value.trim();

    if (!codigo || !nome) {
        mostrarToast('Preencha Código SAP e Nome', 'erro');
        return;
    }

    const dados = {
        codigo: codigo,
        nome: nome,
        descricao: document.getElementById('modal-material-descricao').value.trim() || null,
        unidade_medida: document.getElementById('modal-material-unidade').value,
        estoque_minimo: parseInt(document.getElementById('modal-material-estoque-min').value) || 0,
        estoque_maximo: parseInt(document.getElementById('modal-material-estoque-max').value) || 999999,
        limite_compra: parseInt(document.getElementById('modal-material-limite-compra').value) || 0,
        sublocal_id: document.getElementById('modal-material-sublocal').value || null
    };

    toggleLoading(true);
    try {
        if (modo === 'editar' && id) {
            const { error } = await sb.from('materiais').update(dados).eq('id', id);
            if (error) throw error;
            mostrarToast('Material atualizado com sucesso!');
        } else {
            const { error } = await sb.from('materiais').insert(dados);
            if (error) throw error;
            mostrarToast('Material cadastrado com sucesso!');
        }
        fecharModalMaterial();
        await carregarMateriais();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao salvar: ' + (erro.message || 'Verifique o código'), 'erro');
    } finally {
        toggleLoading(false);
    }
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

function carregarSelectModal(selectId, dados, valueField, textField, placeholder) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    dados.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item[valueField];
        opt.textContent = item[textField];
        select.appendChild(opt);
    });
}

function filtrarSublocaisModal() {
    const localId = document.getElementById('modal-material-local').value;
    const filtrados = localId ? sublocaisCache.filter(s => s.local_id === localId) : [];
    carregarSelectModal('modal-material-sublocal', filtrados, 'id', 'nome', 'Selecione um sub-local...');
}

document.addEventListener('DOMContentLoaded', () => {
    const localSelect = document.getElementById('modal-material-local');
    if (localSelect) localSelect.addEventListener('change', filtrarSublocaisModal);
});
