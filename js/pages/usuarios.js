// ===== USUÁRIOS =====

let usuariosCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar acesso (apenas admin)
    if (!verificarAcesso()) return;

    // Mostrar info do usuário logado no sidebar
    const user = usuarioLogado();
    if (user) {
        document.getElementById('user-info-sidebar').innerHTML = 
            `👤 ${user.nome}<br><span style="text-transform: uppercase; font-size: 0.7rem;">${user.perfil}</span>`;
    }

    ativarMenuAtual();
    await carregarUsuarios();

    document.getElementById('form-usuario').addEventListener('submit', salvarUsuario);
});

async function carregarUsuarios() {
    toggleLoading(true);
    try {
        const { data, error } = await sb
            .from('usuarios')
            .select('*')
            .eq('ativo', true)
            .order('nome');

        if (error) throw error;
        usuariosCache = data || [];
        renderizarUsuarios();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao carregar usuários', 'erro');
    } finally {
        toggleLoading(false);
    }
}

function renderizarUsuarios() {
    const tbody = document.getElementById('tabela-usuarios');
    if (!usuariosCache.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum usuário cadastrado</td></tr>';
        return;
    }
    tbody.innerHTML = usuariosCache.map(u => {
        const perfilBadge = u.perfil === 'admin' 
            ? '<span class="badge badge-danger">Administrador</span>' 
            : '<span class="badge badge-info">Almoxarife</span>';
        return `
        <tr>
            <td><strong>${u.nome}</strong></td>
            <td>${perfilBadge}</td>
            <td>
                <div class="acoes">
                    <button class="btn-acao editar" onclick="abrirModalUsuario('${u.id}')" title="Editar">✏️</button>
                    <button class="btn-acao excluir" onclick="excluirUsuario('${u.id}')" title="Excluir">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

// ===== MODAL USUÁRIO =====

function abrirModalUsuario(id = null) {
    const titulo = document.getElementById('titulo-modal-usuario');
    const inputId = document.getElementById('usuario-id');
    const inputNome = document.getElementById('usuario-nome');
    const inputSenha = document.getElementById('usuario-senha');
    const inputPerfil = document.getElementById('usuario-perfil');

    if (id) {
        const u = usuariosCache.find(x => x.id === id);
        if (!u) return;

        titulo.textContent = '✏️ Editar Usuário';
        inputId.value = u.id;
        inputNome.value = u.nome;
        inputPerfil.value = u.perfil;
        inputSenha.value = '';
        inputSenha.required = false;
        inputSenha.placeholder = 'Deixe em branco para manter a senha atual';
    } else {
        titulo.textContent = '👤 Novo Usuário';
        inputId.value = '';
        inputNome.value = '';
        inputPerfil.value = '';
        inputSenha.value = '';
        inputSenha.required = true;
        inputSenha.placeholder = 'Mínimo 4 caracteres';
    }

    document.getElementById('modal-usuario').classList.remove('hidden');
}

function fecharModalUsuario() {
    document.getElementById('modal-usuario').classList.add('hidden');
    limparFormulario('form-usuario');
}

async function salvarUsuario(e) {
    e.preventDefault();
    if (!validarFormulario('form-usuario')) return;

    const id = document.getElementById('usuario-id').value;
    const senha = document.getElementById('usuario-senha').value;

    if (!id && senha.length < 4) {
        mostrarToast('A senha deve ter no mínimo 4 caracteres', 'erro');
        return;
    }

    if (id && senha && senha.length < 4) {
        mostrarToast('A senha deve ter no mínimo 4 caracteres', 'erro');
        return;
    }

    toggleLoading(true);
    const dados = {
        nome: document.getElementById('usuario-nome').value.trim(),
        perfil: document.getElementById('usuario-perfil').value
    };

    // Só envia senha se for preenchida (edição pode manter a mesma)
    if (senha) {
        dados.senha = hashSenha(senha);
    }

    try {
        if (id) {
            // Edição: remover senha se estiver vazia (manter atual)
            if (!senha) delete dados.senha;
            const { error } = await sb.from('usuarios').update(dados).eq('id', id);
            if (error) throw error;
            mostrarToast('Usuário atualizado com sucesso!');
        } else {
            const { error } = await sb.from('usuarios').insert(dados);
            if (error) throw error;
            mostrarToast('Usuário cadastrado com sucesso!');
        }
        fecharModalUsuario();
        await carregarUsuarios();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao salvar usuário: ' + (erro.message || 'Nome já cadastrado'), 'erro');
    } finally {
        toggleLoading(false);
    }
}

async function excluirUsuario(id) {
    if (!await confirmarExclusao()) return;

    // Não permitir excluir a si mesmo
    const user = usuarioLogado();
    if (user && user.id === id) {
        mostrarToast('Você não pode excluir seu próprio usuário', 'erro');
        return;
    }

    toggleLoading(true);
    try {
        const { error } = await sb.from('usuarios').update({ ativo: false }).eq('id', id);
        if (error) throw error;
        mostrarToast('Usuário excluído com sucesso!');
        await carregarUsuarios();
    } catch (erro) {
        console.error(erro);
        mostrarToast('Erro ao excluir usuário', 'erro');
    } finally {
        toggleLoading(false);
    }
}
