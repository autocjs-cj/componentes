// ===== LOCAIS, SITES E SUB-LOCAIS =====

let sitesCache = [];
let locaisCache = [];
let sublocaisCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();

    document.getElementById('form-site').addEventListener('submit', salvarSite);
    document.getElementById('form-local').addEventListener('submit', salvarLocal);
    document.getElementById('form-sublocal').addEventListener('submit', salvarSublocal);
});

async function carregarDados() {
    toggleLoading(true);
    try {
        // Carregar sites
        const { data: sites, error: errSites } = await sb
            .from('sites')
            .select('*')
            .eq('ativo', true)
            .order('nome');

        if (errSites) throw errSites;
        sitesCache = sites || [];
        renderizarSites();

        // Carregar locais com site
        const { data: locais, error: errLocais } = await sb
            .from('locais')
            .select('*, sites(nome)')
            .eq('ativo', true)
            .order('nome');

        if (errLocais) throw errLocais;
        locaisCache = locais || [];
        renderizarLocais();
        carregarSelect('sublocal-local-id', locaisCache, 'id', 'nome');

        // Carregar sublocais
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

// ===== SITES =====

function renderizarSites() {
    const tbody = document.getElementById('tabela-sites');
    if (!sitesCache.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum site cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = sitesCache.map(s => {
        const qtdLocais = locaisCache.filter(l => l.site_id === s.id).length;
        return `
        <tr>
            <td><strong>${s.nome}</strong></td>
            <td><span class="badge badge-info">${qtdLocais} locais</span></td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="editarSite('${s.id}')" title="Editar">✏️</button>
                    <button class="btn-acao excluir" onclick="excluirSite('${s.id}')" title="Excluir">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function abrirModalSite(id = null) {
    document.getElementById('titulo-modal-site').textContent = id ? '✏️ Editar Site' : '🏢 Novo Site';
    document.getElementById('site-id').value = id || '';
    document.getElementById('site-nome').value = id ? sitesCache.find(s => s.id === id)?.nome || '' : '';
    document.getElementById('modal-site').classList.remove('hidden');
}

function fecharModalSite() {
    document.getElementById('modal-site').classList.add('hidden');
    limparFormulario('form-site');
}

async function salvarSite(e) {
    e.preventDefault();
    if (!validarFormulario('form-site')) return;

    toggleLoading(true);
    const id = document.getElementById('site-id').value;
    const dados = {
        nome: document.getElementById('site-nome').value.trim()
    };

    try {
        if (id) {
            const { error } = await sb.from('sites').update(dados).eq('id', id);
            if (error) throw error;
            mostrarToast('Site atualizado com sucesso!');
        } else {
            const { error } = await sb.from('sites').insert(dados);
            if (error) throw error;
            mostrarToast('Site cadastrado com sucesso!');
        }
        fecharModalSite();
        await carregarDados();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao salvar site', 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function editarSite(id) {
    abrirModalSite(id);
}

async function excluirSite(id) {
    if (!await confirmarExclusao('Excluir este site também desvinculará os locais. Deseja continuar?')) return;

    toggleLoading(true);
    try {
        const { error } = await sb.from('sites').update({ ativo: false }).eq('id', id);
        if (error) throw error;
        mostrarToast('Site excluído com sucesso!');
        await carregarDados();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao excluir site', 'erro');
    } finally {
        toggleLoading(false);
    }
}

// ===== LOCAIS =====

function renderizarLocais() {
    const tbody = document.getElementById('tabela-locais');
    if (!locaisCache.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum local cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = locaisCache.map(l => {
        const qtdSub = sublocaisCache.filter(s => s.local_id === l.id).length;
        return `
        <tr>
            <td><span class="badge badge-info">${l.sites?.nome || 'N/A'}</span></td>
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

    // Carregar sites no select
    const selectSite = document.getElementById('local-site-id');
    selectSite.innerHTML = '<option value="">Selecione um site...</option>';
    sitesCache.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.nome;
        selectSite.appendChild(opt);
    });

    if (id) {
        const l = locaisCache.find(x => x.id === id);
        document.getElementById('local-site-id').value = l?.site_id || '';
        document.getElementById('local-nome').value = l?.nome || '';
    } else {
        document.getElementById('local-site-id').value = '';
        document.getElementById('local-nome').value = '';
    }
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
        site_id: document.getElementById('local-site-id').value,
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