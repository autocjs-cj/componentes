// ===== RESERVA DE MATERIAIS =====

let materiaisCache = [];
let reservasCache = [];
let reservaAtualId = null;

// Precisamos da quantidade_atual e quantidade_reservada dos materiais
// Vamos buscar com os campos necessários

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('reserva-data').value = hojeISO();
    await carregarMateriais();
    await carregarReservas();

    document.getElementById('form-reserva').addEventListener('submit', salvarReserva);
    document.getElementById('buscar-reserva').addEventListener('input', buscarReservas);
});

async function carregarMateriais() {
    try {
        const { data, error } = await sb
            .from('materiais')
            .select('id, codigo, nome, quantidade_atual, quantidade_reservada, unidade_medida')
            .eq('ativo', true)
            .order('nome');

        if (error) throw error;
        materiaisCache = data || [];
        atualizarSelectsMateriais();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar materiais', 'erro');
    }
}

function atualizarSelectsMateriais() {
    document.querySelectorAll('.reserva-material').forEach(select => {
        const valAtual = select.value;
        select.innerHTML = '<option value="">Selecione um material...</option>';
        materiaisCache.forEach(m => {
            const disponivel = m.quantidade_atual - (m.quantidade_reservada || 0);
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.nome} (${m.codigo}) — Disp: ${disponivel} ${m.unidade_medida}`;
            opt.dataset.disponivel = disponivel;
            opt.dataset.unidade = m.unidade_medida;
            select.appendChild(opt);
        });
        select.value = valAtual;
    });
}

function adicionarItemReserva() {
    const container = document.getElementById('itens-reserva-container');
    const row = document.createElement('div');
    row.className = 'form-grid item-reserva-row';
    row.innerHTML = `
        <div class="form-group">
            <label>Material <span class="required">*</span></label>
            <select class="reserva-material" required>
                <option value="">Selecione um material...</option>
            </select>
        </div>
        <div class="form-group">
            <label>Quantidade <span class="required">*</span></label>
            <input type="number" class="reserva-quantidade" min="1" required placeholder="Qtd">
        </div>
        <div class="form-group" style="display:flex;align-items:flex-end;">
            <button type="button" class="btn btn-danger btn-remover-item" onclick="removerItemReserva(this)">🗑️ Remover</button>
        </div>
    `;
    container.appendChild(row);
    atualizarSelectsMateriais();
}

function removerItemReserva(btn) {
    const rows = document.querySelectorAll('.item-reserva-row');
    if (rows.length <= 1) {
        mostrarToast('A reserva deve ter pelo menos um item', 'erro');
        return;
    }
    btn.closest('.item-reserva-row').remove();
}

async function salvarReserva(e) {
    e.preventDefault();

    const solicitante = document.getElementById('reserva-solicitante').value.trim();
    const documento = document.getElementById('reserva-documento').value.trim();
    const dataReserva = document.getElementById('reserva-data').value;
    const observacao = document.getElementById('reserva-observacao').value.trim();

    if (!solicitante || !documento || !dataReserva) {
        mostrarToast('Preencha todos os campos obrigatórios', 'erro');
        return;
    }

    // Coletar itens
    const rows = document.querySelectorAll('.item-reserva-row');
    const itens = [];
    for (const row of rows) {
        const materialId = row.querySelector('.reserva-material').value;
        const quantidade = parseInt(row.querySelector('.reserva-quantidade').value);

        if (!materialId || !quantidade || quantidade < 1) {
            mostrarToast('Preencha todos os itens corretamente', 'erro');
            return;
        }

        const material = materiaisCache.find(m => m.id === materialId);
        const disponivel = material.quantidade_atual - (material.quantidade_reservada || 0);

        if (quantidade > disponivel) {
            mostrarToast(`Quantidade excede o disponível para "${material.nome}". Disponível: ${disponivel} ${material.unidade_medida}`, 'erro');
            return;
        }

        itens.push({ material_id: materialId, quantidade: quantidade });
    }

    if (itens.length === 0) {
        mostrarToast('Adicione pelo menos um item à reserva', 'erro');
        return;
    }

    toggleLoading(true);
    try {
        // Inserir reserva
        const { data: reservaData, error: errReserva } = await sb
            .from('reservas')
            .insert({
                solicitante,
                documento,
                data_reserva: dataReserva,
                observacao,
                status: 'PENDENTE',
                usuario_id: usuarioLogado()?.id || null
            })
            .select()
            .single();

        if (errReserva) throw errReserva;

        // Inserir itens
        const itensInsert = itens.map(i => ({
            reserva_id: reservaData.id,
            material_id: i.material_id,
            quantidade: i.quantidade
        }));

        const { error: errItens } = await sb.from('reserva_itens').insert(itensInsert);
        if (errItens) throw errItens;

        // Bloquear estoque: incrementar quantidade_reservada
        for (const item of itens) {
            const material = materiaisCache.find(m => m.id === item.material_id);
            const novaReservada = (material.quantidade_reservada || 0) + item.quantidade;

            const { error: errUpdate } = await sb
                .from('materiais')
                .update({ quantidade_reservada: novaReservada })
                .eq('id', item.material_id);

            if (errUpdate) throw errUpdate;
        }

        mostrarToast('Reserva cadastrada com sucesso! Estoque bloqueado.');
        limparFormularioReserva();
        await carregarMateriais();
        await carregarReservas();

    } catch (erro) {
        console.error(erro);
        if (erro?.code === '42501' || erro?.message?.includes('row-level security')) {
            mostrarToast('Erro de permissão: execute o script SQL de atualização no Supabase (database.sql).', 'erro');
        } else {
            mostrarToast('Erro ao salvar reserva: ' + (erro.message || 'Tente novamente'), 'erro');
        }
    } finally {
        toggleLoading(false);
    }
}

function limparFormularioReserva() {
    document.getElementById('form-reserva').reset();
    document.getElementById('reserva-data').value = hojeISO();
    document.getElementById('reserva-id').value = '';
    document.getElementById('itens-reserva-container').innerHTML = `
        <div class="form-grid item-reserva-row">
            <div class="form-group">
                <label>Material <span class="required">*</span></label>
                <select class="reserva-material" required>
                    <option value="">Selecione um material...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Quantidade <span class="required">*</span></label>
                <input type="number" class="reserva-quantidade" min="1" required placeholder="Qtd">
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;">
                <button type="button" class="btn btn-danger btn-remover-item" onclick="removerItemReserva(this)">🗑️ Remover</button>
            </div>
        </div>
    `;
    atualizarSelectsMateriais();
}

// ===== LISTAGEM DE RESERVAS =====

async function carregarReservas() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('reservas')
            .select('*, reserva_itens(material_id, quantidade, materiais(nome, codigo, unidade_medida))')
            .order('created_at', { ascending: false });

        if (error) throw error;
        reservasCache = data || [];
        renderizarReservas();
        atualizarCards();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar reservas', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function atualizarCards() {
    const pendentes = reservasCache.filter(r => r.status === 'PENDENTE').length;
    const concluidas = reservasCache.filter(r => r.status === 'APROVADA').length;
    const itens = reservasCache.reduce((acc, r) => acc + (r.reserva_itens?.length || 0), 0);

    document.getElementById('total-reservas').textContent = pendentes;
    document.getElementById('total-concluidas').textContent = concluidas;
    document.getElementById('total-itens-reservados').textContent = itens;
}

function renderizarReservas(lista = reservasCache) {
    const tbody = document.getElementById('tabela-reservas');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma reserva cadastrada</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map((r, idx) => {
        const badgeClass = r.status === 'PENDENTE' ? 'badge-warning' :
                           r.status === 'APROVADA' ? 'badge-success' : 'badge-danger';
        const statusLabel = r.status === 'PENDENTE' ? 'PENDENTE' :
                            r.status === 'APROVADA' ? 'APROVADA' : 'CANCELADA';
        const qtdItens = r.reserva_itens?.reduce((acc, i) => acc + i.quantidade, 0) || 0;

        return `
        <tr>
            <td><strong>#${String(lista.length - idx).padStart(3, '0')}</strong></td>
            <td>${formatarData(r.data_reserva)}</td>
            <td>${r.solicitante}</td>
            <td>${r.documento}</td>
            <td>${r.reserva_itens?.length || 0} itens (${qtdItens} un)</td>
            <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="abrirModalReserva('${r.id}')" title="Ver detalhes">👁️</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

function buscarReservas() {
    const termo = document.getElementById('buscar-reserva').value.toLowerCase();
    const filtrados = reservasCache.filter(r =>
        r.solicitante.toLowerCase().includes(termo) ||
        r.documento.toLowerCase().includes(termo)
    );
    renderizarReservas(filtrados);
}

function filtrarReservas() {
    const status = document.getElementById('filtro-status-reserva').value;
    const termo = document.getElementById('buscar-reserva').value.toLowerCase();

    let filtrados = reservasCache;
    if (status) filtrados = filtrados.filter(r => r.status === status);
    if (termo) filtrados = filtrados.filter(r =>
        r.solicitante.toLowerCase().includes(termo) ||
        r.documento.toLowerCase().includes(termo)
    );
    renderizarReservas(filtrados);
}

// ===== MODAL DETALHES =====

async function abrirModalReserva(id) {
    reservaAtualId = id;
    const r = reservasCache.find(x => x.id === id);
    if (!r) return;

    const podeAprovar = temPerfil('almoxarife') && r.status === 'PENDENTE';

    document.getElementById('titulo-modal-reserva').textContent = `📋 Reserva #${r.documento}`;

    const itensHTML = (r.reserva_itens || []).map(i => `
        <tr>
            <td>${i.materiais?.codigo || '-'}</td>
            <td>${i.materiais?.nome || 'N/A'}</td>
            <td><strong>${i.quantidade}</strong> ${i.materiais?.unidade_medida || ''}</td>
        </tr>
    `).join('');

    document.getElementById('conteudo-modal-reserva').innerHTML = `
        <p><strong>Solicitante:</strong> ${r.solicitante}</p>
        <p><strong>OM / Pedido / Reserva:</strong> ${r.documento}</p>
        <p><strong>Data:</strong> ${formatarData(r.data_reserva)}</p>
        <p><strong>Status:</strong> <span class="badge badge-${r.status === 'PENDENTE' ? 'warning' : r.status === 'APROVADA' ? 'success' : 'danger'}">${r.status}</span></p>
        ${r.observacao ? `<p><strong>Observação:</strong> ${r.observacao}</p>` : ''}
        <h4 class="mt-2">📦 Itens Reservados</h4>
        <div class="table-container">
            <table>
                <thead><tr><th>Código</th><th>Material</th><th>Quantidade</th></tr></thead>
                <tbody>${itensHTML || '<tr><td colspan="3" class="text-center">Sem itens</td></tr>'}</tbody>
            </table>
        </div>
    `;

    document.getElementById('btn-aprovar-reserva').style.display = podeAprovar ? 'inline-flex' : 'none';
    document.getElementById('btn-cancelar-reserva').style.display = podeAprovar ? 'inline-flex' : 'none';

    document.getElementById('modal-reserva').classList.remove('hidden');
}

function fecharModalReserva() {
    document.getElementById('modal-reserva').classList.add('hidden');
    reservaAtualId = null;
}

async function aprovarReserva() {
    if (!reservaAtualId) return;
    const r = reservasCache.find(x => x.id === reservaAtualId);
    if (!r) return;

    if (!await confirmarExclusao('Aprovar a retirada desta reserva? O estoque será debitado permanentemente.')) return;

    toggleLoading(true);
    try {
        // 1. Criar movimentações de saída para cada item
        for (const item of r.reserva_itens || []) {
            const movData = {
                material_id: item.material_id,
                tipo: 'SAIDA',
                quantidade: item.quantidade,
                data_movimentacao: hojeISO(),
                responsavel: r.solicitante,
                documento_referencia: r.documento
            };
            const { error: errMov } = await sb.from('movimentacoes').insert(movData);
            if (errMov) throw errMov;

            // 2. Atualizar estoque: debitar quantidade_atual e liberar quantidade_reservada
            const material = materiaisCache.find(m => m.id === item.material_id);
            const novaQtd = material.quantidade_atual - item.quantidade;
            const novaReservada = Math.max(0, (material.quantidade_reservada || 0) - item.quantidade);

            const { error: errMat } = await sb
                .from('materiais')
                .update({
                    quantidade_atual: novaQtd,
                    quantidade_reservada: novaReservada
                })
                .eq('id', item.material_id);

            if (errMat) throw errMat;
        }

        // 3. Atualizar status da reserva
        const { error: errReserva } = await sb
            .from('reservas')
            .update({ status: 'APROVADA', data_aprovacao: new Date().toISOString() })
            .eq('id', reservaAtualId);

        if (errReserva) throw errReserva;

        mostrarToast('Reserva aprovada e retirada concluída com sucesso!');
        fecharModalReserva();
        await carregarMateriais();
        await carregarReservas();

    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao aprovar reserva: ' + (erro.message || 'Tente novamente'), 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function cancelarReserva() {
    if (!reservaAtualId) return;
    const r = reservasCache.find(x => x.id === reservaAtualId);
    if (!r) return;

    if (!await confirmarExclusao('Cancelar esta reserva? O estoque bloqueado será liberado.')) return;

    toggleLoading(true);
    try {
        // Liberar estoque reservado
        for (const item of r.reserva_itens || []) {
            const material = materiaisCache.find(m => m.id === item.material_id);
            const novaReservada = Math.max(0, (material.quantidade_reservada || 0) - item.quantidade);

            const { error: errMat } = await sb
                .from('materiais')
                .update({ quantidade_reservada: novaReservada })
                .eq('id', item.material_id);

            if (errMat) throw errMat;
        }

        const { error: errReserva } = await sb
            .from('reservas')
            .update({ status: 'CANCELADA' })
            .eq('id', reservaAtualId);

        if (errReserva) throw errReserva;

        mostrarToast('Reserva cancelada. Estoque liberado.');
        fecharModalReserva();
        await carregarMateriais();
        await carregarReservas();

    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao cancelar reserva', 'erro');
    } finally {
        toggleLoading(false);
    }
}

// ===== EXPORTAR =====

function exportarReservas() {
    const dadosExport = reservasCache.map(r => ({
        data_reserva: r.data_reserva,
        solicitante: r.solicitante,
        documento: r.documento,
        status: r.status,
        observacao: r.observacao || '',
        itens: (r.reserva_itens || []).map(i => `${i.materiais?.nome || 'N/A'}: ${i.quantidade} ${i.materiais?.unidade_medida || ''}`).join('; ')
    }));

    const colunas = [
        { titulo: 'Data', campo: 'data_reserva', formato: 'data' },
        { titulo: 'Solicitante', campo: 'solicitante' },
        { titulo: 'OM / Pedido / Reserva', campo: 'documento' },
        { titulo: 'Status', campo: 'status' },
        { titulo: 'Observação', campo: 'observacao' },
        { titulo: 'Itens', campo: 'itens' }
    ];

    exportarExcel(dadosExport, 'reservas_materiais', colunas);
}
