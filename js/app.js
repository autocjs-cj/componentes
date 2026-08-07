/* ============================================================
   CONTROLE DE MATERIAIS - APLICAÇÃO PRINCIPAL v2.1
   ACESSO PÚBLICO PARA CONSULTA + LOGIN PARA EDIÇÃO
   ============================================================ */

// ============================================================
// CONFIGURAÇÃO SUPABASE - SUBSTITUA AQUI!
// ============================================================
const SUPABASE_URL = 'https://jjhspljcyuupjharujvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaHNwbGpjeXV1cGpoYXJ1anZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNDY5MDIsImV4cCI6MjEwMTYyMjkwMn0.Xvu6nHKH_0U7PhNZICNuRmRAz6FZCFBYfMya38GftlU';


let supabaseClient = null;
try {
    supabaseClient = window.supabaseClient.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[OK] Supabase client criado');
} catch (e) {
    console.error('[ERRO] Falha ao criar Supabase client:', e);
}

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
    console.log('[OK] DOM carregado, iniciando app...');
    initApp();
});

async function initApp() {
    try {
        updateCurrentDate();
        initNavigation();
        initEventListeners();
        initAuthModal();

        // Verificar sessão existente
        let session = null;
        if (supabaseClient) {
            try {
                const { data } = await supabaseClient.auth.getSession();
                session = data?.session;
                console.log('[OK] Sessão verificada:', session ? 'Logado' : 'Não logado');
            } catch (e) {
                console.warn('[AVISO] Erro ao verificar sessão:', e);
            }
        }

        if (session) {
            await loadUserProfile(session.user);
        } else {
            setPublicMode();
        }

        // Carregar página inicial
        showPage('dashboard');

        // Listener de mudanças de auth
        if (supabaseClient) {
            supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('[OK] Auth state changed:', event);
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
    } catch (err) {
        console.error('[ERRO] initApp falhou:', err);
        setPublicMode();
        showPage('dashboard');
    }
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
    console.log('[OK] Modo público ativado');
    currentUser = null;
    userProfile = null;

    const userInfoPublic = document.getElementById('user-info-public');
    const userInfoLogged = document.getElementById('user-info-logged');
    const loginBtn = document.getElementById('login-sidebar-btn');
    const logoutBtn = document.getElementById('logout-sidebar-btn');
    const accessBadge = document.getElementById('access-badge');

    if (userInfoPublic) userInfoPublic.classList.remove('hidden');
    if (userInfoLogged) userInfoLogged.classList.add('hidden');
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');

    if (accessBadge) {
        accessBadge.textContent = 'Modo Consulta';
        accessBadge.className = 'badge badge-info';
    }

    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.add-btn').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.col-acoes').forEach(el => el.classList.add('hidden'));

    const cardMov = document.getElementById('card-registrar-mov');
    if (cardMov) cardMov.classList.add('hidden');

    refreshCurrentPage();
}

// ============================================================
// MODO AUTENTICADO (COM LOGIN)
// ============================================================
async function loadUserProfile(user) {
    console.log('[OK] Carregando perfil do usuário...');
    currentUser = user;

    if (!supabaseClient) {
        setPublicMode();
        return;
    }

    try {
        const { data: profile, error } = await supabaseClient
            .from('perfis')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.warn('[AVISO] Perfil não encontrado, usando modo consulta');
            userProfile = { nome: user.email, nivel_acesso: 'consulta', funcionalidades: ['visualizar'] };
        } else {
            userProfile = profile;
        }
    } catch (e) {
        console.warn('[AVISO] Erro ao carregar perfil:', e);
        userProfile = { nome: user.email, nivel_acesso: 'consulta', funcionalidades: ['visualizar'] };
    }

    const userInfoPublic = document.getElementById('user-info-public');
    const userInfoLogged = document.getElementById('user-info-logged');
    const loginBtn = document.getElementById('login-sidebar-btn');
    const logoutBtn = document.getElementById('logout-sidebar-btn');
    const accessBadge = document.getElementById('access-badge');
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');

    if (userInfoPublic) userInfoPublic.classList.add('hidden');
    if (userInfoLogged) userInfoLogged.classList.remove('hidden');
    if (loginBtn) loginBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');

    if (userNameEl) userNameEl.textContent = userProfile.nome || userProfile.email || 'Usuário';
    if (userRoleEl) userRoleEl.textContent = userProfile.nivel_acesso || 'consulta';

    if (accessBadge) {
        const nivel = userProfile.nivel_acesso || 'consulta';
        accessBadge.textContent = 'Logado: ' + nivel.charAt(0).toUpperCase() + nivel.slice(1);
        accessBadge.className = 'badge badge-success';
    }

    updateUIBasedOnPermissions();
    refreshCurrentPage();
    showToast('Bem-vindo, ' + (userProfile.nome || userProfile.email) + '!');
}

function updateUIBasedOnPermissions() {
    if (!userProfile) return;

    const nivel = userProfile.nivel_acesso || 'consulta';
    const funcs = PERMISSOES[nivel] || [];

    if (nivel === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    if (funcs.includes('cadastrar')) {
        document.querySelectorAll('.add-btn').forEach(el => el.classList.remove('hidden'));
    }

    if (funcs.includes('editar') || funcs.includes('excluir')) {
        document.querySelectorAll('.col-acoes').forEach(el => el.classList.remove('hidden'));
    }

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
    console.log('[OK] Inicializando modal de auth...');

    const loginBtn = document.getElementById('login-sidebar-btn');
    const closeBtn = document.getElementById('auth-modal-close');
    const authModal = document.getElementById('auth-modal');

    if (!loginBtn) { console.error('[ERRO] Botão login-sidebar-btn não encontrado'); return; }
    if (!authModal) { console.error('[ERRO] Modal auth-modal não encontrado'); return; }

    // Abrir modal
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[OK] Abrindo modal de login...');
        authModal.classList.add('show');
    });

    // Fechar modal
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAuthModal();
        });
    }

    // Fechar ao clicar fora
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            closeAuthModal();
        }
    });

    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabContent = document.getElementById('auth-tab-' + tab.dataset.tab);
            if (tabContent) tabContent.classList.add('active');
        });
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');

            if (errorEl) errorEl.classList.remove('show');

            if (!supabaseClient) {
                if (errorEl) { errorEl.textContent = 'Supabase não configurado. Verifique as credenciais.'; errorEl.classList.add('show'); }
                return;
            }

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (error) {
                if (errorEl) { errorEl.textContent = error.message; errorEl.classList.add('show'); }
            } else {
                closeAuthModal();
                loginForm.reset();
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const errorEl = document.getElementById('register-error');
            const successEl = document.getElementById('register-success');

            if (errorEl) errorEl.classList.remove('show');
            if (successEl) successEl.classList.remove('show');

            if (!supabaseClient) {
                if (errorEl) { errorEl.textContent = 'Supabase não configurado.'; errorEl.classList.add('show'); }
                return;
            }

            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { nome: name, nivel_acesso: 'consulta' }
                }
            });

            if (error) {
                if (errorEl) { errorEl.textContent = error.message; errorEl.classList.add('show'); }
            } else {
                if (successEl) {
                    successEl.textContent = 'Cadastro realizado! Verifique seu e-mail para confirmar.';
                    successEl.classList.add('show');
                }
                registerForm.reset();
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-sidebar-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (supabaseClient) await supabaseClient.auth.signOut();
            showToast('Você saiu do sistema. Modo consulta ativado.');
        });
    }

    console.log('[OK] Modal de auth inicializado com sucesso');
}

function closeAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.classList.remove('show');

    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const registerSuccess = document.getElementById('register-success');

    if (loginError) loginError.classList.remove('show');
    if (registerError) registerError.classList.remove('show');
    if (registerSuccess) registerSuccess.classList.remove('show');
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
    const pageEl = document.getElementById('page-' + pageId);
    if (pageEl) pageEl.classList.add('active');

    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = getPageTitle(pageId);

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
// PERMISSÕES
// ============================================================
function temPermissao(acao) {
    if (!userProfile) return false;
    const funcs = PERMISSOES[userProfile.nivel_acesso] || [];
    return funcs.includes(acao);
}

function requerLogin(acao) {
    if (!currentUser) {
        showToast('Faça login para ' + acao, 'error');
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.add('show');
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
    if (!supabaseClient) return;

    try {
        const { count: totalMateriais } = await supabaseClient.from('material').select('*', { count: 'exact', head: true });
        const { data: controle } = await supabaseClient.from('controle_materiais').select('status');

        const estoqueOk = controle?.filter(c => c.status === 'Dentro do Intervalo').length || 0;
        const abaixoMinimo = controle?.filter(c => c.status === 'Abaixo do mínimo').length || 0;
        const acimaMaximo = controle?.filter(c => c.status === 'Acima do máximo').length || 0;

        const statTotal = document.getElementById('stat-total-materiais');
        const statOk = document.getElementById('stat-estoque-ok');
        const statMin = document.getElementById('stat-abaixo-minimo');
        const statMax = document.getElementById('stat-acima-maximo');

        if (statTotal) statTotal.textContent = totalMateriais || 0;
        if (statOk) statOk.textContent = estoqueOk;
        if (statMin) statMin.textContent = abaixoMinimo;
        if (statMax) statMax.textContent = acimaMaximo;

        // Alertas
        const { data: alertas } = await supabaseClient
            .from('controle_materiais')
            .select(`
                id, estoque_atual, limite_solicitacao, status,
                material:material_id (descricao),
                local:local_armazenamento_id (descricao)
            `)
            .lt('estoque_atual', 'limite_solicitacao')
            .order('estoque_atual', { ascending: true })
            .limit(10);

        const alertasBody = document.querySelector('#dashboard-alertas tbody');
        if (alertasBody) {
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
        }

        // Movimentações
        const { data: movs } = await supabaseClient
            .from('movimentacao')
            .select(`
                id, tipo, quantidade, data_movimentacao, responsavel,
                material:material_id (descricao)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        const movsBody = document.querySelector('#dashboard-movimentacoes tbody');
        if (movsBody) {
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
    } catch (e) {
        console.error('[ERRO] loadDashboardData:', e);
    }
}

// ============================================================
// MATERIAIS
// ============================================================
async function loadMateriais(filters = {}) {
    if (!supabaseClient) return;

    try {
        let query = supabaseClient
            .from('material')
            .select(`*, local:local_armazenamento_id (descricao)`)
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
    } catch (e) {
        console.error('[ERRO] loadMateriais:', e);
    }
}

function renderMateriaisTable(data) {
    const tbody = document.querySelector('#table-materiais tbody');
    if (!tbody) return;

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
    if (!supabaseClient) return;

    try {
        const { data } = await supabaseClient.from('local_armazenamento').select('*').order('descricao');
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
    } catch (e) {
        console.error('[ERRO] loadLocaisSelect:', e);
    }
}

// ============================================================
// LOCAIS
// ============================================================
async function loadLocais() {
    if (!supabaseClient) return;

    try {
        const { data: subLocais } = await supabaseClient.from('sub_local').select('*').order('id');
        subLocaisData = subLocais || [];
        const podeEditar = temPermissao('editar') || temPermissao('excluir');

        const subBody = document.querySelector('#table-sublocais tbody');
        if (subBody) {
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
                    row.innerHTML = `<td>${s.id}</td><td>${s.descricao}</td>${podeEditar ? acoes : ''}`;
                    subBody.appendChild(row);
                });
            }
        }

        const { data: locais } = await supabaseClient
            .from('local_armazenamento')
            .select(`*, sub_local:sub_local_id (descricao)`)
            .order('id');

        locaisData = locais || [];

        const locBody = document.querySelector('#table-locais tbody');
        if (locBody) {
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
                    row.innerHTML = `<td>${l.id}</td><td>${l.descricao}</td><td>${l.sub_local?.descricao || '-'}</td>${podeEditar ? acoes : ''}`;
                    locBody.appendChild(row);
                });
            }
        }
    } catch (e) {
        console.error('[ERRO] loadLocais:', e);
    }
}

// ============================================================
// ESTOQUE
// ============================================================
async function loadEstoque(statusFilter = '') {
    if (!supabaseClient) return;

    try {
        let query = supabaseClient
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
    } catch (e) {
        console.error('[ERRO] loadEstoque:', e);
    }
}

function renderEstoqueTable(data) {
    const tbody = document.querySelector('#table-estoque tbody');
    if (!tbody) return;

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
    if (!supabaseClient) return;

    try {
        await loadMateriais();

        const dataInput = document.getElementById('mov-data');
        if (dataInput) dataInput.valueAsDate = new Date();

        const { data } = await supabaseClient
            .from('movimentacao')
            .select(`*, material:material_id (descricao)`)
            .order('created_at', { ascending: false })
            .limit(50);

        movimentacoesData = data || [];

        const tbody = document.querySelector('#table-movimentacoes tbody');
        if (tbody) {
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
    } catch (e) {
        console.error('[ERRO] loadMovimentacoesPage:', e);
    }
}

// ============================================================
// USUÁRIOS
// ============================================================
async function loadUsuarios() {
    if (!supabaseClient) return;
    if (userProfile?.nivel_acesso !== 'admin') {
        showToast('Acesso negado', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('perfis').select('*').order('nome');

        if (error) {
            showToast('Erro ao carregar usuários', 'error');
            return;
        }

        const tbody = document.querySelector('#table-usuarios tbody');
        if (!tbody) return;

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
    } catch (e) {
        console.error('[ERRO] loadUsuarios:', e);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function initEventListeners() {
    // Modal genérico
    const modalClose = document.querySelector('#modal .modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalEl = document.getElementById('modal');

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCancel) modalCancel.addEventListener('click', closeModal);

    // Fechar modal genérico ao clicar fora
    if (modalEl) {
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) closeModal();
        });
    }

    // Filtros materiais
    const btnFilterMat = document.getElementById('btn-filter-material');
    if (btnFilterMat) {
        btnFilterMat.addEventListener('click', () => {
            const filters = {
                om: document.getElementById('filter-om')?.value || '',
                descricao: document.getElementById('filter-descricao')?.value || '',
                dataEntrada: document.getElementById('filter-data-entrada')?.value || '',
                dataSaida: document.getElementById('filter-data-saida')?.value || '',
                local: document.getElementById('filter-local')?.value || ''
            };
            loadMateriais(filters);
        });
    }

    const btnClearFilter = document.getElementById('btn-clear-filter-material');
    if (btnClearFilter) {
        btnClearFilter.addEventListener('click', () => {
            const fOm = document.getElementById('filter-om');
            const fDesc = document.getElementById('filter-descricao');
            const fDtEnt = document.getElementById('filter-data-entrada');
            const fDtSai = document.getElementById('filter-data-saida');
            const fLocal = document.getElementById('filter-local');

            if (fOm) fOm.value = '';
            if (fDesc) fDesc.value = '';
            if (fDtEnt) fDtEnt.value = '';
            if (fDtSai) fDtSai.value = '';
            if (fLocal) fLocal.value = '';
            loadMateriais();
        });
    }

    // Filtro estoque
    const btnFilterEst = document.getElementById('btn-filter-estoque');
    if (btnFilterEst) {
        btnFilterEst.addEventListener('click', () => {
            const status = document.getElementById('filter-estoque-status')?.value || '';
            loadEstoque(status);
        });
    }

    // Botões add
    const btnAddMat = document.getElementById('btn-add-material');
    if (btnAddMat) {
        btnAddMat.addEventListener('click', () => {
            if (!requerLogin('cadastrar')) return;
            openMaterialModal();
        });
    }

    const btnAddSub = document.getElementById('btn-add-sublocal');
    if (btnAddSub) {
        btnAddSub.addEventListener('click', () => {
            if (!requerLogin('cadastrar')) return;
            openSubLocalModal();
        });
    }

    const btnAddLoc = document.getElementById('btn-add-local');
    if (btnAddLoc) {
        btnAddLoc.addEventListener('click', () => {
            if (!requerLogin('cadastrar')) return;
            openLocalModal();
        });
    }

    // Movimentação
    const formMov = document.getElementById('form-movimentacao');
    if (formMov) {
        formMov.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!requerLogin('receber')) return;

            const materialId = document.getElementById('mov-material')?.value;
            const tipo = document.getElementById('mov-tipo')?.value;
            const quantidade = parseFloat(document.getElementById('mov-quantidade')?.value || 0);
            const data = document.getElementById('mov-data')?.value;
            const responsavel = document.getElementById('mov-responsavel')?.value;
            const observacao = document.getElementById('mov-observacao')?.value;

            if (!materialId) {
                showToast('Selecione um material', 'error');
                return;
            }

            if (!supabaseClient) return;

            const { error } = await supabaseClient.rpc('registrar_movimentacao', {
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
            formMov.reset();
            const dtInput = document.getElementById('mov-data');
            if (dtInput) dtInput.valueAsDate = new Date();
            loadMovimentacoesPage();
            loadDashboardData();
        });
    }

    // Exportações
    const btnExportEst = document.getElementById('btn-export-estoque');
    if (btnExportEst) btnExportEst.addEventListener('click', exportEstoque);

    const btnExportComp = document.getElementById('btn-export-compra');
    if (btnExportComp) btnExportComp.addEventListener('click', exportNecessidadeCompra);
}

// ============================================================
// MODAIS CRUD
// ============================================================
async function openMaterialModal(material = null) {
    if (!supabaseClient) return;
    const isEdit = !!material;

    try {
        const { data: locais } = await supabaseClient.from('local_armazenamento').select('*').order('descricao');

        const localOptions = (locais || []).map(l => 
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
                result = await supabaseClient.from('material').update(data).eq('id', id);
            } else {
                result = await supabaseClient.from('material').insert([data]);
            }

            if (result.error) {
                showToast('Erro: ' + result.error.message, 'error');
                return false;
            }

            showToast(isEdit ? 'Material atualizado!' : 'Material cadastrado!');
            loadMateriais();
            return true;
        });
    } catch (e) {
        console.error('[ERRO] openMaterialModal:', e);
    }
}

async function editMaterial(id) {
    if (!requerLogin('editar')) return;
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('material').select('*').eq('id', id).single();
    if (data) openMaterialModal(data);
}

async function deleteMaterial(id) {
    if (!requerLogin('excluir')) return;
    if (!supabaseClient) return;
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    const { error } = await supabaseClient.from('material').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Material excluído!');
        loadMateriais();
    }
}

function openSubLocalModal(subLocal = null) {
    if (!supabaseClient) return;
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
            result = await supabaseClient.from('sub_local').update({ descricao }).eq('id', id);
        } else {
            result = await supabaseClient.from('sub_local').insert([{ descricao }]);
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
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('sub_local').select('*').eq('id', id).single();
    if (data) openSubLocalModal(data);
}

async function deleteSubLocal(id) {
    if (!requerLogin('excluir')) return;
    if (!supabaseClient) return;
    if (!confirm('Tem certeza que deseja excluir este sub-local?')) return;

    const { error } = await supabaseClient.from('sub_local').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Sub-local excluído!');
        loadLocais();
    }
}

async function openLocalModal(local = null) {
    if (!supabaseClient) return;

    try {
        const { data: subLocais } = await supabaseClient.from('sub_local').select('*').order('descricao');

        const subOptions = (subLocais || []).map(s => 
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
                result = await supabaseClient.from('local_armazenamento').update(data).eq('id', id);
            } else {
                result = await supabaseClient.from('local_armazenamento').insert([data]);
            }

            if (result.error) {
                showToast('Erro: ' + result.error.message, 'error');
                return false;
            }

            showToast(local ? 'Local atualizado!' : 'Local cadastrado!');
            loadLocais();
            return true;
        });
    } catch (e) {
        console.error('[ERRO] openLocalModal:', e);
    }
}

async function editLocal(id) {
    if (!requerLogin('editar')) return;
    if (!supabaseClient) return;
    const { data } = await supabaseClient.from('local_armazenamento').select('*').eq('id', id).single();
    if (data) openLocalModal(data);
}

async function deleteLocal(id) {
    if (!requerLogin('excluir')) return;
    if (!supabaseClient) return;
    if (!confirm('Tem certeza que deseja excluir este local?')) return;

    const { error } = await supabaseClient.from('local_armazenamento').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Local excluído!');
        loadLocais();
    }
}

async function editEstoque(id) {
    if (!requerLogin('editar')) return;
    if (!supabaseClient) return;

    try {
        const { data } = await supabaseClient.from('controle_materiais').select('*').eq('id', id).single();
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

            const { error } = await supabaseClient.from('controle_materiais').update(updateData).eq('id', id);

            if (error) {
                showToast('Erro: ' + error.message, 'error');
                return false;
            }

            showToast('Controle de estoque atualizado!');
            loadEstoque();
            return true;
        });
    } catch (e) {
        console.error('[ERRO] editEstoque:', e);
    }
}

async function editUsuario(id) {
    if (!requerLogin('editar')) return;
    if (!supabaseClient) return;

    try {
        const { data } = await supabaseClient.from('perfis').select('*').eq('id', id).single();
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

            const { error } = await supabaseClient.from('perfis').update(updateData).eq('id', id);

            if (error) {
                showToast('Erro: ' + error.message, 'error');
                return false;
            }

            showToast('Usuário atualizado!');
            loadUsuarios();
            return true;
        });
    } catch (e) {
        console.error('[ERRO] editUsuario:', e);
    }
}

// ============================================================
// EXPORTAÇÃO EXCEL
// ============================================================
async function exportEstoque() {
    if (!supabaseClient) { showToast('Supabase não configurado', 'error'); return; }

    try {
        const { data } = await supabaseClient
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
    } catch (e) {
        console.error('[ERRO] exportEstoque:', e);
        showToast('Erro ao exportar', 'error');
    }
}

async function exportNecessidadeCompra() {
    if (!supabaseClient) { showToast('Supabase não configurado', 'error'); return; }

    try {
        const { data } = await supabaseClient
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
    } catch (e) {
        console.error('[ERRO] exportNecessidadeCompra:', e);
        showToast('Erro ao exportar', 'error');
    }
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function openModal(title, bodyHtml, onSave) {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalEl = document.getElementById('modal');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = bodyHtml;
    if (modalEl) modalEl.classList.add('show');

    const saveBtn = document.getElementById('modal-save');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const success = await onSave();
            if (success !== false) {
                closeModal();
            }
        };
    }
}

function closeModal() {
    const modalEl = document.getElementById('modal');
    if (modalEl) modalEl.classList.remove('show');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    const icon = toast.querySelector('i');
    msgEl.textContent = message;

    if (type === 'error') {
        if (icon) { icon.className = 'fas fa-exclamation-circle'; icon.style.color = 'var(--danger)'; }
    } else {
        if (icon) { icon.className = 'fas fa-check-circle'; icon.style.color = 'var(--success)'; }
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
