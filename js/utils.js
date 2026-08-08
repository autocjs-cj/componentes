// ===== FUNÇÕES UTILITÁRIAS =====

// Formata data para DD/MM/AAAA
function formatarData(data) {
    if (!data) return '';
    if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [ano, mes, dia] = data.split('-');
        return `${dia}/${mes}/${ano}`;
    }
    const d = new Date(data);
    if (isNaN(d.getTime())) {
        const match = String(data).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        return data;
    }
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
}

function parseDataBR(dataBR) {
    if (!dataBR) return null;
    const [dia, mes, ano] = dataBR.split('/');
    return `${ano}-${mes}-${dia}`;
}

function hojeISO() {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
}

function hojeBR() {
    return formatarData(new Date());
}

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

function exportarExcel(dados, nomeArquivo, colunas) {
    let csv = '\uFEFF';
    csv += colunas.map(c => `"${c.titulo}"`).join(';') + '\n';
    dados.forEach(item => {
        csv += colunas.map(c => {
            let valor = item[c.campo];
            if (valor === null || valor === undefined) valor = '';
            if (c.formato === 'data') valor = formatarData(valor);
            return `"${String(valor).replace(/"/g, '""')}"`;
        }).join(';') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    mostrarToast(`Arquivo "${nomeArquivo}.csv" exportado com sucesso!`);
}

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

function limparFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
    form.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));
}

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

function verificarAcessoPagina() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    const user = usuarioLogado();

    const restricoes = {
        'locais.html': 'almoxarife',
        'materiais.html': 'almoxarife',
        'movimentacoes.html': 'almoxarife',
        'usuarios.html': 'admin'
    };

    if (restricoes[page]) {
        const perfilNecessario = restricoes[page];
        if (!user) {
            mostrarToast('Faça login para acessar esta página', 'erro');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return false;
        }
        if (!temPerfil(perfilNecessario)) {
            mostrarToast('Você não tem permissão para acessar esta página', 'erro');
            setTimeout(() => window.location.href = '../index.html', 1500);
            return false;
        }
    }
    return true;
}

// Verifica acesso antes de navegar (para links em páginas públicas)
function verificarLink(perfilNecessario, destino) {
    const user = usuarioLogado();
    if (!user) {
        mostrarToast('Faça login para acessar esta página', 'erro');
        setTimeout(() => window.location.href = 'pages/login.html', 1500);
        return false;
    }
    if (!temPerfil(perfilNecessario)) {
        mostrarToast('Você não tem permissão para acessar esta página', 'erro');
        return false;
    }
    window.location.href = destino;
    return true;
}

// Configura o menu baseado no usuário logado
function configurarMenu() {
    const user = usuarioLogado();

    // Mostrar/esconder itens restritos
    document.querySelectorAll('[data-restrito]').forEach(el => {
        const perfil = el.getAttribute('data-restrito');
        if (user && temPerfil(perfil)) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    // Atualizar área de login/logout
    const authArea = document.getElementById('auth-area');
    if (authArea) {
        if (user) {
            authArea.innerHTML = `
                <div class="user-info">
                    👤 <strong>${user.nome}</strong><br>
                    <span style="text-transform: uppercase; font-size: 0.7rem;">${user.perfil}</span>
                </div>
                <button onclick="logout()" class="btn btn-danger" style="width: 100%;">🚪 Sair</button>
            `;
        } else {
            const isRoot = !window.location.pathname.includes('/pages/');
            const loginLink = isRoot ? 'pages/login.html' : 'login.html';
            authArea.innerHTML = `<a href="${loginLink}" class="btn btn-primary" style="width: 100%; text-decoration: none;">🔐 Entrar</a>`;
        }
    }

    ativarMenuAtual();
}

// Navegação ativa no menu
function ativarMenuAtual() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.includes(page)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
