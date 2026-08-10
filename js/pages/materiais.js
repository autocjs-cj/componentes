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
                    <button class="btn-acao" onclick="abrirModalVisualizarMaterial('${m.id}')" title="Visualizar" style="background:#e0e7ff;color:#4338ca;">👁️</button>
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


// ===== MODAL VISUALIZAR MATERIAL =====

let materialVisualizadoId = null;

function abrirModalVisualizarMaterial(id) {
    const m = materiaisCache.find(x => x.id === id);
    if (!m) return;

    materialVisualizadoId = id;

    const status = m.quantidade_atual <= m.estoque_minimo ? 'CRÍTICO' :
                   m.quantidade_atual <= m.estoque_minimo * 1.5 ? 'BAIXO' : 'NORMAL';
    const badgeClass = status === 'CRÍTICO' ? 'badge-danger' : 
                      status === 'BAIXO' ? 'badge-warning' : 'badge-success';

    const localCompleto = [
        m.sublocais?.locais?.sites?.nome,
        m.sublocais?.locais?.nome,
        m.sublocais?.nome
    ].filter(Boolean).join(' > ') || '-';

    let html = `
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;">
            <div style="background:#dbeafe;color:#1e40af;padding:10px 16px;border-radius:8px;font-size:1.1rem;font-weight:700;">
                ${m.codigo}
            </div>
            <div>
                <div style="font-size:1.1rem;font-weight:600;color:#1e293b;">${m.nome}</div>
                <div style="font-size:0.8rem;color:#64748b;">${m.descricao || 'Sem descrição'}</div>
            </div>
            <span class="badge ${badgeClass}" style="margin-left:auto;">${status}</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;">
                <div style="font-size:0.75rem;color:#64748b;">Unidade de Medida</div>
                <div style="font-weight:600;">${m.unidade_medida}</div>
            </div>
            <div style="background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;">
                <div style="font-size:0.75rem;color:#64748b;">Localização</div>
                <div style="font-weight:600;">${localCompleto}</div>
            </div>
        </div>

        <div style="background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">
            <div style="font-size:0.8rem;font-weight:600;color:#1e293b;margin-bottom:8px;">📊 Posição de Estoque</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;">
                <div>
                    <div style="font-size:1.2rem;font-weight:700;color:#2563eb;">${m.quantidade_atual}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Qtd Atual</div>
                </div>
                <div>
                    <div style="font-size:1.2rem;font-weight:700;color:#f59e0b;">${m.quantidade_reservada || 0}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Reservado</div>
                </div>
                <div>
                    <div style="font-size:1.2rem;font-weight:700;color:#22c55e;">${m.quantidade_atual - (m.quantidade_reservada || 0)}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Disponível</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">
                <div>
                    <div style="font-size:1rem;font-weight:600;">${m.estoque_minimo}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Mínimo</div>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:600;">${m.estoque_maximo}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Máximo</div>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:600;">${m.limite_compra}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Limite Compra</div>
                </div>
            </div>
        </div>
    `;

    if (m.eh_mangueira_spci) {
        html += `
        <div style="background:#eff6ff;padding:12px 14px;border-radius:8px;border:1px solid #dbeafe;margin-bottom:16px;">
            <div style="font-size:0.8rem;font-weight:600;color:#1e40af;margin-bottom:8px;">🚒 Status da Mangueira</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;">
                <div>
                    <div style="font-size:1rem;font-weight:700;color:#8b5cf6;">${m.qtd_aplicada || 0}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Aplicada</div>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:700;color:#f59e0b;">${m.qtd_teste_necessario || 0}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Teste Nec.</div>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:700;color:#3b82f6;">${m.qtd_em_teste || 0}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Em Teste</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;text-align:center;margin-top:10px;padding-top:10px;border-top:1px solid #dbeafe;">
                <div>
                    <div style="font-size:1rem;font-weight:700;color:#ef4444;">${m.qtd_reprovada || 0}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Reprovada</div>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:700;color:#6b7280;">${m.qtd_descartada || 0}</div>
                    <div style="font-size:0.7rem;color:#64748b;">Descartada</div>
                </div>
            </div>
            <div style="margin-top:8px;font-size:0.8rem;color:#1e40af;"><strong>Diâmetro:</strong> ${m.diametro || '-'}</div>
        </div>
        `;
    }

    document.getElementById('titulo-modal-visualizar').textContent = '📋 Detalhes do Material';
    document.getElementById('conteudo-modal-visualizar').innerHTML = html;
    document.getElementById('modal-visualizar-material').classList.remove('hidden');
}

function fecharModalVisualizarMaterial() {
    document.getElementById('modal-visualizar-material').classList.add('hidden');
    materialVisualizadoId = null;
}

function editarDoVisualizar() {
    if (!materialVisualizadoId) return;
    fecharModalVisualizarMaterial();
    abrirModalMaterial(materialVisualizadoId);
}

function duplicarDoVisualizar() {
    if (!materialVisualizadoId) return;
    const m = materiaisCache.find(x => x.id === materialVisualizadoId);
    if (!m) return;

    fecharModalVisualizarMaterial();

    // Abrir modal em modo novo com dados copiados
    document.getElementById('modal-material-id').value = '';
    document.getElementById('modal-material-modo').value = 'novo';
    document.getElementById('titulo-modal-material').textContent = '📋 Novo Material (Duplicado)';
    document.getElementById('modal-material-codigo').value = '';
    document.getElementById('modal-material-nome').value = m.nome + ' (Cópia)';
    document.getElementById('modal-material-descricao').value = m.descricao || '';
    document.getElementById('modal-material-unidade').value = m.unidade_medida;
    document.getElementById('modal-material-estoque-min').value = m.estoque_minimo;
    document.getElementById('modal-material-estoque-max').value = m.estoque_maximo;
    document.getElementById('modal-material-limite-compra').value = m.limite_compra;
    document.getElementById('modal-material-eh-mangueira').checked = m.eh_mangueira_spci || false;
    document.getElementById('modal-material-diametro').value = m.diametro || '';
    document.getElementById('modal-info-estoque').classList.add('hidden');

    toggleCamposMangueira();

    const localId = m.sublocais ? sublocaisCache.find(s => s.id === m.sublocal_id)?.local_id : '';
    carregarSelectLocais('modal-material-local', locaisCache, 'Selecione um local...');
    document.getElementById('modal-material-local').value = localId || '';
    filtrarSublocaisModal();
    document.getElementById('modal-material-sublocal').value = m.sublocal_id || '';

    document.getElementById('modal-material').classList.remove('hidden');
}

async function excluirDoVisualizar() {
    if (!materialVisualizadoId) return;
    if (!await confirmarExclusao('Tem certeza que deseja excluir este material?')) return;

    fecharModalVisualizarMaterial();
    await excluirMaterial(materialVisualizadoId);
}

window.abrirModalVisualizarMaterial = abrirModalVisualizarMaterial;
window.fecharModalVisualizarMaterial = fecharModalVisualizarMaterial;
window.editarDoVisualizar = editarDoVisualizar;
window.duplicarDoVisualizar = duplicarDoVisualizar;
window.excluirDoVisualizar = excluirDoVisualizar;
