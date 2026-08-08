// ===== FUNÇÕES UTILITÁRIAS =====

// Formata data para DD/MM/AAAA
function formatarData(data) {
    if (!data) return '';
    // Se for string no formato YYYY-MM-DD, extrair diretamente
    if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(data);
    if (isNaN(d.getTime())) {
        // Tentar extrair de string ISO
        const match = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        return data;
    }
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

// Converte DD/MM/AAAA para AAAA-MM-DD (ISO)
function parseDataBR(dataBR) {
    if (!dataBR) return null;
    const [dia, mes, ano] = dataBR.split('/');
    return `${ano}-${mes}-${dia}`;
}

// Formata data atual para input date
function hojeISO() {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
}

// Formata data atual para DD/MM/AAAA
function hojeBR() {
    return formatarData(new Date());
}

// Mostra mensagem de toast
function mostrarToast(mensagem, tipo = 'sucesso') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirmação de exclusão
async function confirmarExclusao(mensagem = 'Tem certeza que deseja excluir?') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-confirm">
                <h3>⚠️ Confirmação</h3>
                <p>${mensagem}</p>
                <div class="modal-actions">
                    <button class="btn btn-danger" id="btn-confirmar-sim">Sim, excluir</button>
                    <button class="btn btn-secondary" id="btn-confirmar-nao">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-confirmar-sim').onclick = () => {
            overlay.remove();
            resolve(true);
        };
        document.getElementById('btn-confirmar-nao').onclick = () => {
            overlay.remove();
            resolve(false);
        };
    });
}

// Exportar para Excel (CSV com BOM para acentuação)
function exportarExcel(dados, nomeArquivo, colunas) {
    function gerarXLSX() {
        const wb = XLSX.utils.book_new();
        const aoa = [];

        // Cabeçalho
        aoa.push(colunas.map(c => c.titulo));

        // Dados
        dados.forEach(item => {
            aoa.push(colunas.map(c => {
                let valor = item[c.campo];
                if (valor === null || valor === undefined) valor = '';
                if (c.formato === 'data') valor = formatarData(valor);
                return valor;
            }));
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, 'Dados');

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo + '.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();

        mostrarToast(`Arquivo "${nomeArquivo}.xlsx" exportado com sucesso!`);
    }

    if (typeof XLSX !== 'undefined') {
        gerarXLSX();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
        script.onload = gerarXLSX;
        script.onerror = () => {
            mostrarToast('Erro ao carregar biblioteca de exportação. Tente novamente.', 'erro');
        };
        document.head.appendChild(script);
    }
}
// Carrega select com opções
function carregarSelect(selectId, dados, valueField, textField, placeholder = 'Selecione...') {
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

// Valida formulário
function validarFormulario(formId) {
    const form = document.getElementById(formId);
    const requireds = form.querySelectorAll('[required]');
    let valido = true;

    requireds.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('erro');
            valido = false;
        } else {
            field.classList.remove('erro');
        }
    });

    if (!valido) mostrarToast('Preencha todos os campos obrigatórios!', 'erro');
    return valido;
}

// Limpa formulário
function limparFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
    form.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));
}

// Mostra/esconde loading
function toggleLoading(mostrar) {
    let loading = document.getElementById('loading-global');
    if (!loading) {
        loading = document.createElement('div');
        loading.id = 'loading-global';
        loading.className = 'loading-overlay';
        loading.innerHTML = '<div class="spinner"></div><p>Carregando...</p>';
        document.body.appendChild(loading);
    }
    loading.style.display = mostrar ? 'flex' : 'none';
}

// ===== CONTROLE DE ACESSO =====

// Páginas que requerem login e perfil
const PAGINAS_RESTRITAS = {
    'locais.html': 'almoxarife',
    'materiais.html': 'almoxarife',
    'movimentacoes.html': 'almoxarife',
    'reserva.html': 'almoxarife',
    'usuarios.html': 'admin'
};

// Páginas públicas (não precisam de login)
const PAGINAS_PUBLICAS = ['index.html', 'estoque.html', 'compras.html'];

function verificarAcesso() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    const user = usuarioLogado();

    // Se for página restrita
    if (PAGINAS_RESTRITAS[page]) {
        const perfilNecessario = PAGINAS_RESTRITAS[page];

        if (!user) {
            mostrarToast('Faça login para acessar esta página', 'erro');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
            return false;
        }

        if (!temPerfil(perfilNecessario)) {
            mostrarToast('Você não tem permissão para acessar esta página', 'erro');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
            return false;
        }
    }

    return true;
}

// Renderiza menu dinâmico baseado no usuário logado
function renderizarMenu() {
    const user = usuarioLogado();
    const path = window.location.pathname;
    const isRoot = !path.includes('/pages/');
    const prefix = isRoot ? 'pages/' : '';
    const rootPrefix = isRoot ? '' : '../';

    const menuHTML = `
        <aside class="sidebar">
            <div class="sidebar-header">
                <h1>📦 Controle de Materiais</h1>
                <p>Sistema de Gestão de Estoque</p>
            </div>
            <ul class="nav-menu">
                <li class="nav-item">
                    <a href="${rootPrefix}index.html" class="nav-link">
                        <span class="nav-icon">📊</span> Dashboard
                    </a>
                </li>
                ${user && (user.perfil === 'almoxarife' || user.perfil === 'admin') ? `
                <li class="nav-item">
                    <a href="${prefix}locais.html" class="nav-link">
                        <span class="nav-icon">🏭</span> Locais & Sub-locais
                    </a>
                </li>
                <li class="nav-item">
                    <a href="${prefix}materiais.html" class="nav-link">
                        <span class="nav-icon">📋</span> Materiais
                    </a>
                </li>
                <li class="nav-item">
                    <a href="${prefix}movimentacoes.html" class="nav-link">
                        <span class="nav-icon">🔄</span> Recebimento / Retirada
                    </a>
                </li>
                ` : ''}
                <li class="nav-item">
                    <a href="${prefix}reserva.html" class="nav-link">
                        <span class="nav-icon">📝</span> Reserva de Materiais
                    </a>
                </li>
                <li class="nav-item">
                    <a href="${prefix}estoque.html" class="nav-link">
                        <span class="nav-icon">📦</span> Controle de Estoque
                    </a>
                </li>
                <li class="nav-item">
                    <a href="${prefix}compras.html" class="nav-link">
                        <span class="nav-icon">🛒</span> Compras Necessárias
                    </a>
                </li>
                ${user && user.perfil === 'admin' ? `
                <li class="nav-item">
                    <a href="${prefix}usuarios.html" class="nav-link">
                        <span class="nav-icon">👤</span> Usuários
                    </a>
                </li>
                ` : ''}
            </ul>
            <div style="padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: auto;">
                ${user ? `
                <div style="color: #94a3b8; font-size: 0.8rem; padding: 0 16px 8px;">
                    👤 ${user.nome}<br>
                    <span style="text-transform: uppercase; font-size: 0.7rem;">${user.perfil}</span>
                </div>
                <button onclick="logout()" class="btn btn-danger" style="width: 100%;">🚪 Sair</button>
                ` : `
                <a href="${prefix}login.html" class="btn btn-primary" style="width: 100%; text-decoration: none;">🔐 Entrar</a>
                `}
            </div>
        </aside>
    `;

    // Inserir menu no container
    const container = document.querySelector('.app-container');
    if (container) {
        // Remover sidebar antiga se existir
        const oldSidebar = container.querySelector('.sidebar');
        if (oldSidebar) oldSidebar.remove();

        container.insertAdjacentHTML('afterbegin', menuHTML);
    }

    ativarMenuAtual();
}

// Navegação ativa no menu
function ativarMenuAtual() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href')?.includes(page)) {
            link.classList.add('active');
        }
    });
}
