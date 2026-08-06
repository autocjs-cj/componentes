/* ============================================================
   CONTROLE DE MATERIAIS - APLICAÇÃO PRINCIPAL v2.0
   ACESSO PÚBLICO PARA CONSULTA + LOGIN PARA EDIÇÃO
   ============================================================ */

// ============================================================
// CONFIGURAÇÃO SUPABASE
// ============================================================
// SUBSTITUA ESTES VALORES PELAS SUAS CREDENCIAIS DO SUPABASE
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
let currentUser = null;
let userProfile = null;
let materiaisData = [];
let locaisData = [];
let subLocaisData = [];
let estoqueData = [];
let movimentacoesData = [];
let currentPage = 'dashboard';

// Níveis de acesso e suas permissões
const PERMISSOES = {
    admin:     ['cadastrar','editar','excluir','visualizar','exportar','receber','retirar'],
    gerente:   ['cadastrar','editar','visualizar','exportar','receber','retirar'],
    operador:  ['cadastrar','visualizar','receber','retirar'],
    consulta:  ['visualizar']
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    updateCurrentDate();
    initNavigation();
    initEventListeners();
    initAuthModal();

    // Verificar sessão existente (silenciosamente)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        await loadUserProfile(session.user);
    } else {
        setPublicMode();
    }

    // Carregar dados públicos (sempre disponíveis)
    showPage('dashboard');

    // Listener de mudanças de auth
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
            setPublicMode();
            showPage(currentPage);
        }
    });
}

function updateCurrentDate() {
    const el = document.getElementById('current-date');
    if (el) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        el.textContent = new Date().toLocaleDateString('pt-BR', options);
    }
}

// ============================================================
// MODO PÚBLICO (SEM LOGIN)
// ============================================================
function setPublicMode() {
    currentUser = null;
    userProfile = null;

    // Sidebar
    document.getElementById('user-info-public').classList.remove('hidden');
    document.getElementById('user-info-logged').classList.add('hidden');
    document.getElementById('login-sidebar-btn').classList.remove('hidden');
    document.getElementById('logout-sidebar-btn').classList.add('hidden');

    // Badge
    const badge = document.getElementById('access-badge');
    badge.textContent = 'Modo Consulta';
    badge.className = 'badge badge-info';

    // Esconder controles de admin
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));

    // Esconder botões de ação
    document.querySelectorAll('.add-btn').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.col-acoes').forEach(el => el.classList.add('hidden'));

    // Esconder formulário de movimentação
    const cardMov = document.getElementById('card-registrar-mov');
    if (cardMov) cardMov.classList.add('hidden');

    // Recarregar tabela atual para remover colunas de ação
    refreshCurrentPage();
}

// ============================================================
// MODO AUTENTICADO (COM LOGIN)
// ============================================================
async function loadUserProfile(user) {
    currentUser = user;

    const { data: profile, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Erro ao carregar perfil:', error);
        showToast('Erro ao carregar perfil. Modo consulta ativado.', 'error');
        setPublicMode();
        return;
    }

    userProfile = profile;

    // Sidebar
    document.getElementById('user-info-public').classList.add('hidden');
    document.getElementById('user-info-logged').classList.remove('hidden');
    document.getElementById('login-sidebar-btn').classList.add('hidden');
    document.getElementById('logout-sidebar-btn').classList.remove('hidden');

    document.getElementById('user-name').textContent = profile.nome || profile.email;
    document.getElementById('user-role').textContent = profile.nivel_acesso;

    // Badge
    const badge = document.getElementById('access-badge');
    const nivel = profile.nivel_acesso;
    badge.textContent = 'Logado: ' + nivel.charAt(0).toUpperCase() + nivel.slice(1);
    badge.className = 'badge badge-success';

    // Mostrar controles baseado no nível
    updateUIBasedOnPermissions();

    // Recarregar página atual
    refreshCurrentPage();

    showToast('Bem-vindo, ' + (profile.nome || profile.email) + '!');
}

function updateUIBasedOnPermissions() {
    if (!userProfile) return;

    const nivel = userProfile.nivel_acesso;
    const funcs = PERMISSOES[nivel] || [];

    // Admin: mostrar menu usuários
    if (nivel === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    // Cadastrar: mostrar botões "Novo"
    if (funcs.includes('cadastrar')) {
        document.querySelectorAll('.add-btn').forEach(el => el.classList.remove('hidden'));
    }

    // Editar/Excluir: mostrar colunas de ação
    if (funcs.includes('editar') || funcs.includes('excluir')) {
        document.querySelectorAll('.col-acoes').forEach(el => el.classList.remove('hidden'));
    }

    // Receber/Retirar: mostrar formulário de movimentação
    if (funcs.includes('receber') || funcs.includes('retirar')) {
        const cardMov = document.getElementById('card-registrar-mov');
        if (cardMov) cardMov.classList.remove('hidden');
    }
}

function refreshCurrentPage() {
    switch(currentPage) {
        case 'dashboard': loadDashboardData(); break;
        case 'materiais': loadMateriais(); break;
        case 'locais': loadLocais(); break;
        case 'estoque': loadEstoque(); break;
        case 'movimentacoes': loadMovimentacoesPage(); break;
        case 'relatorios': break;
        case 'usuarios': loadUsuarios(); break;
    }
}

// ============================================================
// AUTENTICAÇÃO - MODAL
// ============================================================
function initAuthModal() {
    // Abrir modal
    document.getElementById('login-sidebar-btn').addEventListener('click', () => {
        document.getElementById('auth-modal').classList.add('show');
    });

    // Fechar modal
    document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);
    document.getElementById('auth-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('auth-modal')) closeAuthModal();
    });

    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('auth-tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        errorEl.classList.remove('show');

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            errorEl.textContent = error.message;
            errorEl.classList.add('show');
        } else {
            closeAuthModal();
            document.getElementById('login-form').reset();
        }
    });

    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');
        const successEl = document.getElementById('register-success');

        errorEl.classList.remove('show');
        successEl.classList.remove('show');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { nome: name, nivel_acesso: 'consulta' }
            }
        });

        if (error) {
            errorEl.textContent = error.message;
            errorEl.classList.add('show');
        } else {
            successEl.textContent = 'Cadastro realizado! Verifique seu e-mail para confirmar.';
            successEl.classList.add('show');
            document.getElementById('register-form').reset();
        }
    });

    // Logout
    document.getElementById('logout-sidebar-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        showToast('Você saiu do sistema. Modo consulta ativado.');
    });
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('show');
    document.getElementById('login-error').classList.remove('show');
    document.getElementById('register-error').classList.remove('show');
    document.getElementById('register-success').classList.remove('show');
}

// ============================================================
// NAVEGAÇÃO
// ============================================================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                showPage(page);
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

function showPage(pageId) {
    currentPage = pageId;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    document.getElementById('page-title').textContent = getPageTitle(pageId);

    switch(pageId) {
        case 'dashboard': loadDashboardData(); break;
        case 'materiais': loadMateriais(); break;
        case 'locais': loadLocais(); break;
        case 'estoque': loadEstoque(); break;
        case 'movimentacoes': loadMovimentacoesPage(); break;
        case 'relatorios': break;
        case 'usuarios': loadUsuarios(); break;
    }
}

function getPageTitle(pageId) {
    const titles = {
        dashboard: 'Dashboard',
        materiais: 'Cadastro de Materiais',
        locais: 'Locais e Sub-locais',
        estoque: 'Controle de Estoque',
        movimentacoes: 'Movimentações',
        relatorios: 'Relatórios e Exportações',
        usuarios: 'Gerenciamento de Usuários'
    };
    return titles[pageId] || 'Controle de Materiais';
}

// ============================================================
// VERIFICAÇÃO DE PERMISSÃO
// ============================================================
function temPermissao(acao) {
    if (!userProfile) return false;
    const funcs = PERMISSOES[userProfile.nivel_acesso] || [];
    return funcs.includes(acao);
}

function requerLogin(acao) {
    if (!currentUser) {
        showToast('Faça login para ' + acao, 'error');
        document.getElementById('auth-modal').classList.add('show');
        return false;
    }
    if (!temPermissao(acao)) {
        showToast('Você não tem permissão para ' + acao, 'error');
        return false;
    }
    return true;
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboardData() {
    const { count: totalMateriais } = await supabase.from('material').select('*', { count: 'exact', head: true });

    const { data: controle } = await supabase.from('controle_materiais').select('status');
    const estoqueOk = controle?.filter(c => c.status === 'Dentro do Intervalo').length || 0;
    const abaixoMinimo = controle?.filter(c => c.status === 'Abaixo do mínimo').length || 0;
    const acimaMaximo = controle?.filter(c => c.status === 'Acima do máximo').length || 0;

    document.getElementById('stat-total-materiais').textContent = totalMateriais || 0;
    document.getElementById('stat-estoque-ok').textContent = estoqueOk;
    document.getElementById('stat-abaixo-minimo').textContent = abaixoMinimo;
    document.getElementById('stat-acima-maximo').textContent = acimaMaximo;

    const { data: alertas } = await supabase
        .from('controle_materiais')
        .select(`
            id,
            estoque_atual,
            limite_solicitacao,
            status,
            material:material_id (descricao),
            local:local_armazenamento_id (descricao)
        `)
        .lt('estoque_atual', 'limite_solicitacao')
        .order('estoque_atual', { ascending: true })
        .limit(10);

    const alertasBody = document.querySelector('#dashboard-alertas tbody');
    alertasBody.innerHTML = '';

    if (alertas && alertas.length > 0) {
        alertas.forEach(a => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${a.material?.descricao || 'N/A'}</td>
                <td>${a.local?.descricao || 'N/A'}</td>
                <td>${a.estoque_atual}</td>
                <td>${a.limite_solicitacao}</td>
                <td><span class="badge badge-danger">${a.status}</span></td>
            `;
            alertasBody.appendChild(row);
        });
    } else {
        alertasBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum material abaixo do limite</td></tr>';
    }

    const { data: movs } = await supabase
        .from('movimentacao')
        .select(`
            id,
            tipo,
            quantidade,
            data_movimentacao,
            responsavel,
            material:material_id (descricao)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    const movsBody = document.querySelector('#dashboard-movimentacoes tbody');
    movsBody.innerHTML = '';

    if (movs && movs.length > 0) {
        movs.forEach(m => {
            const row = document.createElement('tr');
            const badgeClass = m.tipo === 'entrada' ? 'badge-success' : 'badge-warning';
            row.innerHTML = `
                <td>${formatDate(m.data_movimentacao)}</td>
                <td>${m.material?.descricao || 'N/A'}</td>
                <td><span class="badge ${badgeClass}">${m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                <td>${m.quantidade}</td>
                <td>${m.responsavel || '-'}</td>
            `;
            movsBody.appendChild(row);
        });
    } else {
        movsBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma movimentação registrada</td></tr>';
    }
}

// ============================================================
// MATERIAIS
// ============================================================
async function loadMateriais(filters = {}) {
    let query = supabase
        .from('material')
        .select(`
            *,
            local:local_armazenamento_id (descricao)
        `)
        .order('id', { ascending: false });

    if (filters.om) query = query.ilike('om', `%${filters.om}%`);
    if (filters.descricao) query = query.ilike('descricao', `%${filters.descricao}%`);
    if (filters.dataEntrada) query = query.gte('data_entrada', filters.dataEntrada);
    if (filters.dataSaida) query = query.gte('data_saida', filters.dataSaida);
    if (filters.local) query = query.eq('id_local', filters.local);

    const { data, error } = await query;

    if (error) {
        showToast('Erro ao carregar materiais', 'error');
        return;
    }

    materiaisData = data || [];
    renderMateriaisTable(materiaisData);
    loadLocaisSelect();
}

function renderMateriaisTable(data) {
    const tbody = document.querySelector('#table-materiais tbody');
    tbody.innerHTML = '';
    const podeEditar = temPermissao('editar') || temPermissao('excluir');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum material encontrado</td></tr>';
        return;
    }

    data.forEach(m => {
        const row = document.createElement('tr');
        let acoes = '';
        if (podeEditar) {
            acoes = `
                <td class="actions">
                    ${temPermissao('editar') ? `<button class="btn btn-primary btn-sm" onclick="editMaterial(${m.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${temPermissao('excluir') ? `<button class="btn btn-danger btn-sm" onclick="deleteMaterial(${m.id})"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            `;
        }

        row.innerHTML = `
            <td>${m.id}</td>
            <td>${m.om}</td>
            <td>${m.descricao}</td>
            <td>${m.codigo_sap || '-'}</td>
            <td>${m.local?.descricao || '-'}</td>
            <td>${m.quantidade}</td>
            <td>${formatDate(m.data_entrada)}</td>
            <td>${formatDate(m.data_saida)}</td>
            <td>${m.recebedor || '-'}</td>
            ${podeEditar ? acoes : ''}
        `;
        tbody.appendChild(row);
    });
}

async function loadLocaisSelect() {
    const { data } = await supabase.from('local_armazenamento').select('*').order('descricao');
    const select = document.getElementById('filter-local');
    const movSelect = document.getElementById('mov-material');

    if (select) {
        select.innerHTML = '<option value="">Todos os locais</option>';
        (data || []).forEach(l => {
            select.innerHTML += `<option value="${l.id}">${l.descricao}</option>`;
        });
    }

    if (movSelect) {
        movSelect.innerHTML = '<option value="">Selecione...</option>';
        materiaisData.forEach(m => {
            movSelect.innerHTML += `<option value="${m.id}">${m.descricao} (OM: ${m.om})</option>`;
        });
    }
}

// ============================================================
// LOCAIS E SUB-LOCAIS
// ============================================================
async function loadLocais() {
    const { data: subLocais } = await supabase.from('sub_local').select('*').order('id');
    subLocaisData = subLocais || [];
    const podeEditar = temPermissao('editar') || temPermissao('excluir');

    const subBody = document.querySelector('#table-sublocais tbody');
    subBody.innerHTML = '';

    if (subLocaisData.length === 0) {
        subBody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum sub-local cadastrado</td></tr>';
    } else {
        subLocaisData.forEach(s => {
            const row = document.createElement('tr');
            let acoes = '';
            if (podeEditar) {
                acoes = `
                    <td class="actions">
                        ${temPermissao('editar') ? `<button class="btn btn-primary btn-sm" onclick="editSubLocal(${s.id})"><i class="fas fa-edit"></i></button>` : ''}
                        ${temPermissao('excluir') ? `<button class="btn btn-danger btn-sm" onclick="deleteSubLocal(${s.id})"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                `;
            }
            row.innerHTML = `
                <td>${s.id}</td>
                <td>${s.descricao}</td>
                ${podeEditar ? acoes : ''}
            `;
            subBody.appendChild(row);
        });
    }

    const { data: locais } = await supabase
        .from('local_armazenamento')
        .select(`*, sub_local:sub_local_id (descricao)`)
        .order('id');

    locaisData = locais || [];

    const locBody = document.querySelector('#table-locais tbody');
    locBody.innerHTML = '';

    if (locaisData.length === 0) {
        locBody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum local cadastrado</td></tr>';
    } else {
        locaisData.forEach(l => {
            const row = document.createElement('tr');
            let acoes = '';
            if (podeEditar) {
                acoes = `
                    <td class="actions">
                        ${temPermissao('editar') ? `<button class="btn btn-primary btn-sm" onclick="editLocal(${l.id})"><i class="fas fa-edit"></i></button>` : ''}
                        ${temPermissao('excluir') ? `<button class="btn btn-danger btn-sm" onclick="deleteLocal(${l.id})"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                `;
            }
            row.innerHTML = `
                <td>${l.id}</td>
                <td>${l.descricao}</td>
                <td>${l.sub_local?.descricao || '-'}</td>
                ${podeEditar ? acoes : ''}
            `;
            locBody.appendChild(row);
        });
    }
}

// ============================================================
// ESTOQUE
// ============================================================
async function loadEstoque(statusFilter = '') {
    let query = supabase
        .from('controle_materiais')
        .select(`
            *,
            material:material_id (descricao, om),
            local:local_armazenamento_id (descricao)
        `)
        .order('id');

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data, error } = await query;

    if (error) {
        showToast('Erro ao carregar estoque', 'error');
        return;
    }

    estoqueData = data || [];
    renderEstoqueTable(estoqueData);
}

function renderEstoqueTable(data) {
    const tbody = document.querySelector('#table-estoque tbody');
    tbody.innerHTML = '';
    const podeEditar = temPermissao('editar');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Nenhum registro encontrado</td></tr>';
        return;
    }

    data.forEach(e => {
        let badgeClass = 'badge-info';
        if (e.status === 'Abaixo do mínimo') badgeClass = 'badge-danger';
        else if (e.status === 'Dentro do Intervalo') badgeClass = 'badge-success';
        else if (e.status === 'Acima do máximo') badgeClass = 'badge-warning';

        let acoes = '';
        if (podeEditar) {
            acoes = `<td class="actions"><button class="btn btn-primary btn-sm" onclick="editEstoque(${e.id})"><i class="fas fa-edit"></i></button></td>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${e.material?.descricao || 'N/A'}</td>
            <td>${e.local?.descricao || '-'}</td>
            <td>${e.estoque_minimo}</td>
            <td>${e.estoque_maximo}</td>
            <td>${e.limite_solicitacao}</td>
            <td>${e.entrada}</td>
            <td>${e.saida}</td>
            <td><strong>${e.estoque_atual}</strong></td>
            <td><span class="badge ${badgeClass}">${e.status}</span></td>
            ${podeEditar ? acoes : ''}
        `;
        tbody.appendChild(row);
    });
}

// ============================================================
// MOVIMENTAÇÕES
// ============================================================
async function loadMovimentacoesPage() {
    await loadMateriais();

    const dataInput = document.getElementById('mov-data');
    if (dataInput) dataInput.valueAsDate = new Date();

    const { data } = await supabase
        .from('movimentacao')
        .select(`*, material:material_id (descricao)`)
        .order('created_at', { ascending: false })
        .limit(50);

    movimentacoesData = data || [];

    const tbody = document.querySelector('#table-movimentacoes tbody');
    tbody.innerHTML = '';

    if (movimentacoesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma movimentação registrada</td></tr>';
        return;
    }

    movimentacoesData.forEach(m => {
        const badgeClass = m.tipo === 'entrada' ? 'badge-success' : 'badge-warning';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(m.data_movimentacao)}</td>
            <td>${m.material?.descricao || 'N/A'}</td>
            <td><span class="badge ${badgeClass}">${m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
            <td>${m.quantidade}</td>
            <td>${m.responsavel || '-'}</td>
            <td>${m.observacao || '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================================
// USUÁRIOS (ADMIN)
// ============================================================
async function loadUsuarios() {
    if (userProfile?.nivel_acesso !== 'admin') {
        showToast('Acesso negado', 'error');
        return;
    }

    const { data, error } = await supabase.from('perfis').select('*').order('nome');

    if (error) {
        showToast('Erro ao carregar usuários', 'error');
        return;
    }

    const tbody = document.querySelector('#table-usuarios tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum usuário encontrado</td></tr>';
        return;
    }

    data.forEach(u => {
        const row = document.createElement('tr');
        const funcs = u.funcionalidades ? u.funcionalidades.join(', ') : '-';
        row.innerHTML = `
            <td>${u.nome}</td>
            <td>${u.email}</td>
            <td><span class="badge badge-info">${u.nivel_acesso}</span></td>
            <td>${funcs}</td>
            <td>${u.ativo ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>'}</td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" onclick="editUsuario('${u.id}')"><i class="fas fa-edit"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function initEventListeners() {
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);

    document.getElementById('btn-filter-material').addEventListener('click', () => {
        const filters = {
            om: document.getElementById('filter-om').value,
            descricao: document.getElementById('filter-descricao').value,
            dataEntrada: document.getElementById('filter-data-entrada').value,
            dataSaida: document.getElementById('filter-data-saida').value,
            local: document.getElementById('filter-local').value
        };
        loadMateriais(filters);
    });

    document.getElementById('btn-clear-filter-material').addEventListener('click', () => {
        document.getElementById('filter-om').value = '';
        document.getElementById('filter-descricao').value = '';
        document.getElementById('filter-data-entrada').value = '';
        document.getElementById('filter-data-saida').value = '';
        document.getElementById('filter-local').value = '';
        loadMateriais();
    });

    document.getElementById('btn-filter-estoque').addEventListener('click', () => {
        const status = document.getElementById('filter-estoque-status').value;
        loadEstoque(status);
    });

    document.getElementById('btn-add-material').addEventListener('click', () => {
        if (!requerLogin('cadastrar')) return;
        openMaterialModal();
    });
    document.getElementById('btn-add-sublocal').addEventListener('click', () => {
        if (!requerLogin('cadastrar')) return;
        openSubLocalModal();
    });
    document.getElementById('btn-add-local').addEventListener('click', () => {
        if (!requerLogin('cadastrar')) return;
        openLocalModal();
    });

    document.getElementById('form-movimentacao').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!requerLogin('receber')) return;

        const materialId = document.getElementById('mov-material').value;
        const tipo = document.getElementById('mov-tipo').value;
        const quantidade = parseFloat(document.getElementById('mov-quantidade').value);
        const data = document.getElementById('mov-data').value;
        const responsavel = document.getElementById('mov-responsavel').value;
        const observacao = document.getElementById('mov-observacao').value;

        if (!materialId) {
            showToast('Selecione um material', 'error');
            return;
        }

        const { error } = await supabase.rpc('registrar_movimentacao', {
            p_id_material: parseInt(materialId),
            p_tipo: tipo,
            p_quantidade: quantidade,
            p_responsavel: responsavel,
            p_observacao: observacao
        });

        if (error) {
            showToast('Erro ao registrar movimentação: ' + error.message, 'error');
            return;
        }

        showToast('Movimentação registrada com sucesso!');
        document.getElementById('form-movimentacao').reset();
        document.getElementById('mov-data').valueAsDate = new Date();
        loadMovimentacoesPage();
        loadDashboardData();
    });

    document.getElementById('btn-export-estoque').addEventListener('click', exportEstoque);
    document.getElementById('btn-export-compra').addEventListener('click', exportNecessidadeCompra);
}

// ============================================================
// MODAIS CRUD
// ============================================================
async function openMaterialModal(material = null) {
    const isEdit = !!material;
    const locais = await supabase.from('local_armazenamento').select('*').order('descricao');

    const localOptions = (locais.data || []).map(l => 
        `<option value="${l.id}" ${material?.id_local === l.id ? 'selected' : ''}>${l.descricao}</option>`
    ).join('');

    const html = `
        <form id="form-material">
            <div class="form-row">
                <div class="form-group">
                    <label>OM (12 dígitos)</label>
                    <input type="number" id="mat-om" value="${material?.om || ''}" required>
                </div>
                <div class="form-group">
                    <label>Local de Armazenamento</label>
                    <select id="mat-local" required>
                        <option value="">Selecione...</option>
                        ${localOptions}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Descrição</label>
                <input type="text" id="mat-descricao" value="${material?.descricao || ''}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Pedido/Reserva</label>
                    <input type="text" id="mat-pedido" value="${material?.pedido_reserva || ''}">
                </div>
                <div class="form-group">
                    <label>Código SAP</label>
                    <input type="text" id="mat-sap" value="${material?.codigo_sap || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Quantidade</label>
                    <input type="number" id="mat-quantidade" value="${material?.quantidade || 0}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Data Entrada</label>
                    <input type="date" id="mat-data-entrada" value="${material?.data_entrada || ''}">
                </div>
                <div class="form-group">
                    <label>Data Saída</label>
                    <input type="date" id="mat-data-saida" value="${material?.data_saida || ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Local Aplicação</label>
                    <input type="text" id="mat-aplicacao" value="${material?.local_aplicacao || ''}">
                </div>
                <div class="form-group">
                    <label>Recebedor</label>
                    <input type="text" id="mat-recebedor" value="${material?.recebedor || ''}">
                </div>
            </div>
            <input type="hidden" id="mat-id" value="${material?.id || ''}">
        </form>
    `;

    openModal(isEdit ? 'Editar Material' : 'Novo Material', html, async () => {
        const data = {
            om: document.getElementById('mat-om').value,
            id_local: document.getElementById('mat-local').value || null,
            descricao: document.getElementById('mat-descricao').value,
            pedido_reserva: document.getElementById('mat-pedido').value,
            codigo_sap: document.getElementById('mat-sap').value,
            quantidade: parseFloat(document.getElementById('mat-quantidade').value) || 0,
            data_entrada: document.getElementById('mat-data-entrada').value || null,
            data_saida: document.getElementById('mat-data-saida').value || null,
            local_aplicacao: document.getElementById('mat-aplicacao').value,
            recebedor: document.getElementById('mat-recebedor').value
        };

        const id = document.getElementById('mat-id').value;

        let result;
        if (id) {
            result = await supabase.from('material').update(data).eq('id', id);
        } else {
            result = await supabase.from('material').insert([data]);
        }

        if (result.error) {
            showToast('Erro: ' + result.error.message, 'error');
            return false;
        }

        showToast(isEdit ? 'Material atualizado!' : 'Material cadastrado!');
        loadMateriais();
        return true;
    });
}

async function editMaterial(id) {
    if (!requerLogin('editar')) return;
    const { data } = await supabase.from('material').select('*').eq('id', id).single();
    if (data) openMaterialModal(data);
}

async function deleteMaterial(id) {
    if (!requerLogin('excluir')) return;
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    const { error } = await supabase.from('material').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Material excluído!');
        loadMateriais();
    }
}

function openSubLocalModal(subLocal = null) {
    const html = `
        <form id="form-sublocal">
            <div class="form-group">
                <label>Descrição</label>
                <input type="text" id="sublocal-descricao" value="${subLocal?.descricao || ''}" required>
            </div>
            <input type="hidden" id="sublocal-id" value="${subLocal?.id || ''}">
        </form>
    `;

    openModal(subLocal ? 'Editar Sub-local' : 'Novo Sub-local', html, async () => {
        const descricao = document.getElementById('sublocal-descricao').value;
        const id = document.getElementById('sublocal-id').value;

        let result;
        if (id) {
            result = await supabase.from('sub_local').update({ descricao }).eq('id', id);
        } else {
            result = await supabase.from('sub_local').insert([{ descricao }]);
        }

        if (result.error) {
            showToast('Erro: ' + result.error.message, 'error');
            return false;
        }

        showToast(subLocal ? 'Sub-local atualizado!' : 'Sub-local cadastrado!');
        loadLocais();
        return true;
    });
}

async function editSubLocal(id) {
    if (!requerLogin('editar')) return;
    const { data } = await supabase.from('sub_local').select('*').eq('id', id).single();
    if (data) openSubLocalModal(data);
}

async function deleteSubLocal(id) {
    if (!requerLogin('excluir')) return;
    if (!confirm('Tem certeza que deseja excluir este sub-local?')) return;

    const { error } = await supabase.from('sub_local').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Sub-local excluído!');
        loadLocais();
    }
}

async function openLocalModal(local = null) {
    const subLocais = await supabase.from('sub_local').select('*').order('descricao');

    const subOptions = (subLocais.data || []).map(s => 
        `<option value="${s.id}" ${local?.id_sub_local === s.id ? 'selected' : ''}>${s.descricao}</option>`
    ).join('');

    const html = `
        <form id="form-local">
            <div class="form-group">
                <label>Descrição</label>
                <input type="text" id="local-descricao" value="${local?.descricao || ''}" required>
            </div>
            <div class="form-group">
                <label>Sub-local</label>
                <select id="local-sublocal">
                    <option value="">Selecione...</option>
                    ${subOptions}
                </select>
            </div>
            <input type="hidden" id="local-id" value="${local?.id || ''}">
        </form>
    `;

    openModal(local ? 'Editar Local' : 'Novo Local', html, async () => {
        const data = {
            descricao: document.getElementById('local-descricao').value,
            id_sub_local: document.getElementById('local-sublocal').value || null
        };
        const id = document.getElementById('local-id').value;

        let result;
        if (id) {
            result = await supabase.from('local_armazenamento').update(data).eq('id', id);
        } else {
            result = await supabase.from('local_armazenamento').insert([data]);
        }

        if (result.error) {
            showToast('Erro: ' + result.error.message, 'error');
            return false;
        }

        showToast(local ? 'Local atualizado!' : 'Local cadastrado!');
        loadLocais();
        return true;
    });
}

async function editLocal(id) {
    if (!requerLogin('editar')) return;
    const { data } = await supabase.from('local_armazenamento').select('*').eq('id', id).single();
    if (data) openLocalModal(data);
}

async function deleteLocal(id) {
    if (!requerLogin('excluir')) return;
    if (!confirm('Tem certeza que deseja excluir este local?')) return;

    const { error } = await supabase.from('local_armazenamento').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Local excluído!');
        loadLocais();
    }
}

async function editEstoque(id) {
    if (!requerLogin('editar')) return;
    const { data } = await supabase.from('controle_materiais').select('*').eq('id', id).single();
    if (!data) return;

    const html = `
        <form id="form-estoque">
            <div class="form-row">
                <div class="form-group">
                    <label>Estoque Mínimo</label>
                    <input type="number" id="est-min" value="${data.estoque_minimo}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Estoque Máximo</label>
                    <input type="number" id="est-max" value="${data.estoque_maximo}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Limite Solicitação</label>
                    <input type="number" id="est-limite" value="${data.limite_solicitacao}" step="0.01">
                </div>
            </div>
        </form>
    `;

    openModal('Editar Controle de Estoque', html, async () => {
        const updateData = {
            estoque_minimo: parseFloat(document.getElementById('est-min').value) || 0,
            estoque_maximo: parseFloat(document.getElementById('est-max').value) || 0,
            limite_solicitacao: parseFloat(document.getElementById('est-limite').value) || 0
        };

        const { error } = await supabase.from('controle_materiais').update(updateData).eq('id', id);

        if (error) {
            showToast('Erro: ' + error.message, 'error');
            return false;
        }

        showToast('Controle de estoque atualizado!');
        loadEstoque();
        return true;
    });
}

async function editUsuario(id) {
    if (!requerLogin('editar')) return;
    const { data } = await supabase.from('perfis').select('*').eq('id', id).single();
    if (!data) return;

    const html = `
        <form id="form-usuario">
            <div class="form-group">
                <label>Nome</label>
                <input type="text" id="user-nome" value="${data.nome}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Nível de Acesso</label>
                    <select id="user-nivel">
                        <option value="admin" ${data.nivel_acesso === 'admin' ? 'selected' : ''}>Administrador</option>
                        <option value="gerente" ${data.nivel_acesso === 'gerente' ? 'selected' : ''}>Gerente</option>
                        <option value="operador" ${data.nivel_acesso === 'operador' ? 'selected' : ''}>Operador</option>
                        <option value="consulta" ${data.nivel_acesso === 'consulta' ? 'selected' : ''}>Consulta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="user-ativo">
                        <option value="true" ${data.ativo ? 'selected' : ''}>Ativo</option>
                        <option value="false" ${!data.ativo ? 'selected' : ''}>Inativo</option>
                    </select>
                </div>
            </div>
        </form>
    `;

    openModal('Editar Usuário', html, async () => {
        const updateData = {
            nome: document.getElementById('user-nome').value,
            nivel_acesso: document.getElementById('user-nivel').value,
            ativo: document.getElementById('user-ativo').value === 'true'
        };

        const { error } = await supabase.from('perfis').update(updateData).eq('id', id);

        if (error) {
            showToast('Erro: ' + error.message, 'error');
            return false;
        }

        showToast('Usuário atualizado!');
        loadUsuarios();
        return true;
    });
}

// ============================================================
// EXPORTAÇÃO EXCEL
// ============================================================
async function exportEstoque() {
    const { data } = await supabase
        .from('controle_materiais')
        .select(`
            *,
            material:material_id (descricao, om, codigo_sap),
            local:local_armazenamento_id (descricao)
        `)
        .order('id');

    if (!data || data.length === 0) {
        showToast('Nenhum dado para exportar', 'error');
        return;
    }

    const exportData = data.map(e => ({
        'Material': e.material?.descricao || '',
        'OM': e.material?.om || '',
        'Código SAP': e.material?.codigo_sap || '',
        'Local': e.local?.descricao || '',
        'Estoque Mínimo': e.estoque_minimo,
        'Estoque Máximo': e.estoque_maximo,
        'Limite Solicitação': e.limite_solicitacao,
        'Entrada': e.entrada,
        'Saída': e.saida,
        'Estoque Atual': e.estoque_atual,
        'Status': e.status,
        'Data Entrada': formatDate(e.data_entrada),
        'Data Saída': formatDate(e.data_saida)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
    XLSX.writeFile(wb, `Estoque_${formatDateFile(new Date())}.xlsx`);
    showToast('Estoque exportado com sucesso!');
}

async function exportNecessidadeCompra() {
    const { data } = await supabase
        .from('controle_materiais')
        .select(`
            *,
            material:material_id (descricao, om, codigo_sap),
            local:local_armazenamento_id (descricao)
        `)
        .lt('estoque_atual', 'limite_solicitacao')
        .order('estoque_atual', { ascending: true });

    if (!data || data.length === 0) {
        showToast('Nenhum material necessita compra no momento', 'error');
        return;
    }

    const exportData = data.map(e => ({
        'Material': e.material?.descricao || '',
        'OM': e.material?.om || '',
        'Código SAP': e.material?.codigo_sap || '',
        'Local': e.local?.descricao || '',
        'Estoque Atual': e.estoque_atual,
        'Limite Solicitação': e.limite_solicitacao,
        'Quantidade Necessária': Math.max(0, e.limite_solicitacao - e.estoque_atual),
        'Status': e.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Necessidade de Compra');
    XLSX.writeFile(wb, `Necessidade_Compra_${formatDateFile(new Date())}.xlsx`);
    showToast('Necessidade de compra exportada com sucesso!');
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function openModal(title, bodyHtml, onSave) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal').classList.add('show');

    const saveBtn = document.getElementById('modal-save');
    saveBtn.onclick = async () => {
        const success = await onSave();
        if (success !== false) {
            closeModal();
        }
    };
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const icon = toast.querySelector('i');

    msgEl.textContent = message;

    if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        icon.style.color = 'var(--danger)';
    } else {
        icon.className = 'fas fa-check-circle';
        icon.style.color = 'var(--success)';
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
}

function formatDateFile(date) {
    return date.toISOString().split('T')[0];
}

// Fechar modal ao clicar fora
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) {
        closeModal();
    }
});
