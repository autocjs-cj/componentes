// ===== MATERIAIS =====

let materiaisCache = [];
let locaisCache = [];
let sublocaisCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    await carregarLocaisSublocais();
    await carregarMateriais();

    const buscarInput = document.getElementById('buscar-material');
    if (buscarInput) {
        buscarInput.addEventListener('input', buscarMaterial);
    }

    const modalLocal = document.getElementById('modal-material-local');
    if (modalLocal) {
        modalLocal.addEventListener('change', filtrarSublocaisModal);
    }

    const chkMangueira = document.getElementById('modal-material-eh-mangueira');
    if (chkMangueira) {
        chkMangueira.addEventListener('change', toggleCamposMangueira);
    }
});

function toggleCamposMangueira() {
    const chk = document.getElementById('modal-material-eh-mangueira');
    const campos = document.getElementById('campos-mangueira');
    if (campos) {
        campos.style.display = chk.checked ? 'block' : 'none';
    }
}

async function carregarLocaisSublocais() {
    try {
        const { data: locais } = await sb.from('locais').select('*, sites(nome)').eq('ativo', true).order('nome');
        locaisCache = locais || [];

        const { data: sublocais } = await sb.from('sublocais').select('*, locais(nome)').eq('ativo', true).order('nome');
        sublocaisCache = sublocais || [];
    } catch (erro) {
        console.error(erro);
    }
}

async function carregarMateriais() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('*, quantidade_reservada, sublocais(nome, locais(nome, sites(nome)))')
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
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum material cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(m => {
        const status = m.quantidade_atual <= m.estoque_minimo ? 'CRITICO' :
                       m.quantidade_atual <= m.estoque_minimo * 1.5 ? 'BAIXO' : 'NORMAL';
        const badgeClass = status === 'CRITICO' ? 'badge-danger' : 
                          status === 'BAIXO' ? 'badge-warning' : 'badge-success';
        const badgeMangueira = m.eh_mangueira_spci 
            ? '<span class="badge badge-info" style="margin-left:4px;">🚒 MANGUEIRA</span>' : '';
        return `
        <tr class="${status.toLowerCase()}">
            <td><strong>${m.codigo}</strong>${badgeMangueira}</td>
            <td>${m.nome}</td>
            <td>${m.sublocais?.locais?.sites?.nome || m.sublocais?.locais?.nome || '-'}</td>
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
                    <button class="btn-acao editar" onclick="abrirModalMaterial('${m.id}')" title="Editar">✏️</button>
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
        sublocal_nome: m.sublocais?.nome || '-',
        eh_mangueira_spci: m.eh_mangueira_spci ? 'SIM' : 'NAO',
        diametro: m.diametro || ''
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
        { titulo: 'Sub-local', campo: 'sublocal_nome' },
        { titulo: 'Mangueira SPCI', campo: 'eh_mangueira_spci' },
        { titulo: 'Diâmetro', campo: 'diametro' }
    ];

    exportarExcel(dadosExport, 'materiais_estoque', colunasExport);
}

// ===== MODAL MATERIAL =====

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
    document.getElementById('modal-material-eh-mangueira').checked = false;
    document.getElementById('modal-material-diametro').value = '';
    document.getElementById('modal-info-estoque').classList.add('hidden');

    toggleCamposMangueira();

    carregarSelectLocais('modal-material-local', locaisCache, 'Selecione um local...');
    carregarSelectModal('modal-material-sublocal', [], 'id', 'nome', 'Selecione um sub-local...');

    ['modal-material-codigo', 'modal-material-nome', 'modal-material-descricao',
     'modal-material-unidade', 'modal-material-local', 'modal-material-sublocal',
     'modal-material-estoque-min', 'modal-material-estoque-max', 'modal-material-limite-compra',
     'modal-material-eh-mangueira', 'modal-material-diametro']
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
    document.getElementById('modal-material-eh-mangueira').checked = m.eh_mangueira_spci || false;
    document.getElementById('modal-material-diametro').value = m.diametro || '';

    document.getElementById('modal-info-atual').textContent = m.quantidade_atual;
    document.getElementById('modal-info-reservada').textContent = m.quantidade_reservada || 0;
    document.getElementById('modal-info-disponivel').textContent = m.quantidade_atual - (m.quantidade_reservada || 0);
    document.getElementById('modal-info-estoque').classList.remove('hidden');

    // Info de mangueira
    const infoMangueira = document.getElementById('modal-info-mangueira');
    if (infoMangueira) {
        if (m.eh_mangueira_spci) {
            infoMangueira.classList.remove('hidden');
            document.getElementById('modal-info-aplicada').textContent = m.qtd_aplicada || 0;
            document.getElementById('modal-info-teste-necessario').textContent = m.qtd_teste_necessario || 0;
            document.getElementById('modal-info-em-teste').textContent = m.qtd_em_teste || 0;
            document.getElementById('modal-info-reprovada').textContent = m.qtd_reprovada || 0;
            document.getElementById('modal-info-descartada').textContent = m.qtd_descartada || 0;
        } else {
            infoMangueira.classList.add('hidden');
        }
    }

    toggleCamposMangueira();

    const localId = m.sublocais ? sublocaisCache.find(s => s.id === m.sublocal_id)?.local_id : '';
    carregarSelectLocais('modal-material-local', locaisCache, 'Selecione um local...');
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

    const ehMangueira = document.getElementById('modal-material-eh-mangueira').checked;
    const diametro = ehMangueira ? document.getElementById('modal-material-diametro').value.trim() : null;

    if (ehMangueira && !diametro) {
        mostrarToast('Preencha o diâmetro da mangueira', 'erro');
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
        sublocal_id: document.getElementById('modal-material-sublocal').value || null,
        eh_mangueira_spci: ehMangueira,
        diametro: diametro || null
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

function carregarSelectLocais(selectId, dados, placeholder) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>`;
    dados.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.sites?.nome ? `${item.sites.nome} — ${item.nome}` : item.nome;
        select.appendChild(opt);
    });
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
