// ===== FUNÇÕES UTILITÁRIAS =====

// Formata data para DD/MM/AAAA
function formatarData(data) {
    if (!data) return '';
    const d = new Date(data);
    if (isNaN(d.getTime())) return data;
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
    let csv = '﻿'; // BOM para UTF-8

    // Cabeçalho
    csv += colunas.map(c => `"${c.titulo}"`).join(';') + '\n';

    // Dados
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
