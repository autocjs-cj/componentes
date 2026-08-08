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


// ===== MODAL DETALHES DO MATERIAL =====

let materialModalId = null;

function abrirModalMaterial(id) {
    materialModalId = id;
    const m = materiaisCache.find(x => x.id === id);
    if (!m) return;

    const status = m.quantidade_atual <= m.estoque_minimo ? 'CRITICO' :
                   m.quantidade_atual <= m.estoque_minimo * 1.5 ? 'BAIXO' : 'NORMAL';
    const badgeClass = status === 'CRITICO' ? 'badge-danger' :
                       status === 'BAIXO' ? 'badge-warning' : 'badge-success';
    const disponivel = m.quantidade_atual - (m.quantidade_reservada || 0);

    document.getElementById('titulo-modal-material').textContent = `📋 ${m.nome}`;
    document.getElementById('conteudo-modal-material').innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label><strong>Código SAP</strong></label>
                <p>${m.codigo}</p>
            </div>
            <div class="form-group">
                <label><strong>Nome</strong></label>
                <p>${m.nome}</p>
            </div>
            <div class="form-group full-width">
                <label><strong>Descrição</strong></label>
                <p>${m.descricao || '<em style="color:var(--secondary)">Sem descrição</em>'}</p>
            </div>
            <div class="form-group">
                <label><strong>Unidade</strong></label>
                <p>${m.unidade_medida}</p>
            </div>
            <div class="form-group">
                <label><strong>Local / Sub-local</strong></label>
                <p>${m.sublocais?.locais?.nome || '-'} / ${m.sublocais?.nome || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Qtd Atual</strong></label>
                <p><strong>${m.quantidade_atual}</strong> ${m.unidade_medida}</p>
            </div>
            <div class="form-group">
                <label><strong>Reservado</strong></label>
                <p>${m.quantidade_reservada || 0} ${m.unidade_medida}</p>
            </div>
            <div class="form-group">
                <label><strong>Disponível</strong></label>
                <p><strong>${disponivel}</strong> ${m.unidade_medida}</p>
            </div>
            <div class="form-group">
                <label><strong>Estoque Mínimo</strong></label>
                <p>${m.estoque_minimo}</p>
            </div>
            <div class="form-group">
                <label><strong>Estoque Máximo</strong></label>
                <p>${m.estoque_maximo}</p>
            </div>
            <div class="form-group">
                <label><strong>Limite Compra</strong></label>
                <p>${m.limite_compra || '-'}</p>
            </div>
            <div class="form-group">
                <label><strong>Status</strong></label>
                <p><span class="badge ${badgeClass}">${status}</span></p>
            </div>
        </div>
    `;

    document.getElementById('modal-material').classList.remove('hidden');
}

function fecharModalMaterial() {
    document.getElementById('modal-material').classList.add('hidden');
    materialModalId = null;
}

function editarMaterialDoModal() {
    if (!materialModalId) return;
    fecharModalMaterial();
    editarMaterial(materialModalId);
}

function duplicarMaterialDoModal() {
    if (!materialModalId) return;
    fecharModalMaterial();
    duplicarMaterial(materialModalId);
}

async function excluirMaterialDoModal() {
    if (!materialModalId) return;
    fecharModalMaterial();
    await excluirMaterial(materialModalId);
}
