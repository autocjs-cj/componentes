// ===== DASHBOARD =====

document.addEventListener('DOMContentLoaded', async () => {
    await carregarDashboard();
});

async function carregarDashboard() {
    toggleLoading(true);
    try {
        // Total de materiais
        const { count: countMateriais } = await sb
            .from('materiais')
            .select('*', { count: 'exact', head: true })
            .eq('ativo', true);
        document.getElementById('total-materiais').textContent = countMateriais || 0;

        // Total de locais
        const { count: countLocais } = await sb
            .from('locais')
            .select('*', { count: 'exact', head: true })
            .eq('ativo', true);
        document.getElementById('total-locais').textContent = countLocais || 0;

        // Buscar todos os materiais ativos
        const { data: todosMateriais, error: errMat } = await sb
            .from('materiais')
            .select('*, quantidade_reservada, sublocais(nome, locais(nome))')
            .eq('ativo', true);

        if (errMat) throw errMat;

        // Estoque crítico: quantidade_atual <= estoque_minimo
        const materiaisCriticos = (todosMateriais || []).filter(m => (m.quantidade_atual - (m.quantidade_reservada || 0)) <= m.estoque_minimo);
        document.getElementById('total-criticos').textContent = materiaisCriticos.length;

        // NOVA REGRA - Compras necessárias: quantidade_atual <= limite_compra
        const materiaisCompra = (todosMateriais || []).filter(m => (m.quantidade_atual - (m.quantidade_reservada || 0)) <= m.limite_compra);
        document.getElementById('total-compras').textContent = materiaisCompra.length;

        // Últimas movimentações
        const { data: movimentacoes, error: errMov } = await sb
            .from('movimentacoes')
            .select('*, materiais(nome, codigo)')
            .order('created_at', { ascending: false })
            .limit(10);

        if (errMov) throw errMov;

        renderizarMovimentacoes(movimentacoes || []);
        renderizarCriticos(materiaisCriticos);

    } catch (erro) {
        console.error('Erro ao carregar dashboard:', erro);
        mostrarToast('Erro ao carregar dashboard', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function renderizarMovimentacoes(dados) {
    const tbody = document.getElementById('tabela-movimentacoes');
    if (!dados.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma movimentação registrada</td></tr>';
        return;
    }
    tbody.innerHTML = dados.map(m => `
        <tr>
            <td>${formatarData(m.data_movimentacao)}</td>
            <td><span class="badge badge-${m.tipo === 'ENTRADA' ? 'success' : 'danger'}">${m.tipo}</span></td>
            <td>${m.materiais?.nome || 'N/A'} (${m.materiais?.codigo || ''})</td>
            <td>${m.quantidade}</td>
            <td>${m.responsavel || '-'}</td>
        </tr>
    `).join('');
}

function renderizarCriticos(dados) {
    const tbody = document.getElementById('tabela-criticos');
    if (!dados.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum material com estoque crítico</td></tr>';
        return;
    }
    tbody.innerHTML = dados.slice(0, 10).map(m => `
        <tr class="critico">
            <td>${m.codigo}</td>
            <td>${m.nome}</td>
            <td><strong>${m.quantidade_atual}</strong> <small style="color:var(--secondary)">(Disp: ${m.quantidade_atual - (m.quantidade_reservada || 0)})</small></td>
            <td>${m.estoque_minimo}</td>
            <td><span class="badge badge-danger">CRÍTICO</span></td>
        </tr>
    `).join('');
}
