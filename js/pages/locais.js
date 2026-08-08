// ===== LOCAIS E SUB-LOCAIS =====

let locaisCache = [];
let sublocaisCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();

    document.getElementById('form-local').addEventListener('submit', salvarLocal);
    document.getElementById('form-sublocal').addEventListener('submit', salvarSublocal);
});

async function carregarDados() {
    toggleLoading(true);
    try {
        const { data: locais, error: errLocais } = await sb
            .from('locais')
            .select('*')
            .eq('ativo', true)
            .order('nome');

        if (errLocais) throw errLocais;
        locaisCache = locais || [];
        renderizarLocais();
        carregarSelect('sublocal-local-id', locaisCache, 'id', 'nome');

        const { data: sublocais, error: errSub } = await sb
            .from('sublocais')
            .select('*, locais(nome)')
            .eq('ativo', true)
            .order('nome');

        if (errSub) throw errSub;
        sublocaisCache = sublocais || [];
        renderizarSublocais();

    } catch (erro) {
        console.error('Erro:', erro);
        mostrarToast('Erro ao carregar dados', 'erro');
    } finally {
        toggleLoading(false);
    }
}

// ===== LOCAIS =====
function renderizarLocais() {
    const tbody = document.getElementById('tabela-locais');
    if (!locaisCache.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum local cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = locaisCache.map(l => {
        const qtdSub = sublocaisCache.filter(s => s.local_id === l.id).length;
        return `
        <tr>
            <td><strong>${l.nome}</strong></td>
            <td><span class="badge badge-info">${qtdSub} sub-locais</span></td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="editarLocal('${l.id}')" title="Editar">✏️</button>
                    <button class="btn-acao excluir" onclick="excluirLocal('${l.id}')" title="Excluir">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function abrirModalLocal(id = null) {
    document.getElementById('titulo-modal-local').textContent = id ? '✏️ Editar Local' : '📍 Novo Local';
    document.getElementById('local-id').value = id || '';
    document.getElementById('local-nome').value = id ? locaisCache.find(l => l.id === id)?.nome || '' : '';
    document.getElementById('modal-local').classList.remove('hidden');
}

function fecharModalLocal() {
    document.getElementById('modal-local').classList.add('hidden');
    limparFormulario('form-local');
}

async function salvarLocal(e) {
    e.preventDefault();
    if (!validarFormulario('form-local')) return;

    toggleLoading(true);
    const id = document.getElementById('local-id').value;
    const dados = {
        nome: document.getElementById('local-nome').value.trim()
    };

    try {
        if (id) {
            const { error } = await sb.from('locais').update(dados).eq('id', id);
            if (error) throw error;
            mostrarToast('Local atualizado com sucesso!');
        } else {
            const { error } = await sb.from('locais').insert(dados);
            if (error) throw error;
            mostrarToast('Local cadastrado com sucesso!');
        }
        fecharModalLocal();
        await carregarDados();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao salvar local', 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function editarLocal(id) {
    abrirModalLocal(id);
}

async function excluirLocal(id) {
    if (!await confirmarExclusao('Excluir este local também removerá todos os sub-locais vinculados. Deseja continuar?')) return;

    toggleLoading(true);
    try {
        const { error } = await sb.from('locais').update({ ativo: false }).eq('id', id);
        if (error) throw error;
        mostrarToast('Local excluído com sucesso!');
        await carregarDados();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao excluir local', 'erro');
    } finally {
        toggleLoading(false);
    }
}

// ===== SUB-LOCAIS =====
function renderizarSublocais() {
    const tbody = document.getElementById('tabela-sublocais');
    if (!sublocaisCache.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum sub-local cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = sublocaisCache.map(s => `
        <tr>
            <td><span class="badge badge-info">${s.locais?.nome || 'N/A'}</span></td>
            <td><strong>${s.nome}</strong></td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="editarSublocal('${s.id}')" title="Editar">✏️</button>
                    <button class="btn-acao excluir" onclick="excluirSublocal('${s.id}')" title="Excluir">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function abrirModalSublocal(id = null) {
    document.getElementById('titulo-modal-sublocal').textContent = id ? '✏️ Editar Sub-local' : '📂 Novo Sub-local';
    document.getElementById('sublocal-id').value = id || '';
    if (id) {
        const s = sublocaisCache.find(x => x.id === id);
        document.getElementById('sublocal-local-id').value = s?.local_id || '';
        document.getElementById('sublocal-nome').value = s?.nome || '';
    } else {
        limparFormulario('form-sublocal');
    }
    document.getElementById('modal-sublocal').classList.remove('hidden');
}

function fecharModalSublocal() {
    document.getElementById('modal-sublocal').classList.add('hidden');
    limparFormulario('form-sublocal');
}

async function salvarSublocal(e) {
    e.preventDefault();
    if (!validarFormulario('form-sublocal')) return;

    toggleLoading(true);
    const id = document.getElementById('sublocal-id').value;
    const dados = {
        local_id: document.getElementById('sublocal-local-id').value,
        nome: document.getElementById('sublocal-nome').value.trim()
    };

    try {
        if (id) {
            const { error } = await sb.from('sublocais').update(dados).eq('id', id);
            if (error) throw error;
            mostrarToast('Sub-local atualizado com sucesso!');
        } else {
            const { error } = await sb.from('sublocais').insert(dados);
            if (error) throw error;
            mostrarToast('Sub-local cadastrado com sucesso!');
        }
        fecharModalSublocal();
        await carregarDados();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao salvar sub-local', 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function editarSublocal(id) {
    abrirModalSublocal(id);
}

async function excluirSublocal(id) {
    if (!await confirmarExclusao()) return;

    toggleLoading(true);
    try {
        const { error } = await sb.from('sublocais').update({ ativo: false }).eq('id', id);
        if (error) throw error;
        mostrarToast('Sub-local excluído com sucesso!');
        await carregarDados();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao excluir sub-local', 'erro');
    } finally {
        toggleLoading(false);
    }
}
