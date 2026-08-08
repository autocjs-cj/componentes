// ===== CONFIGURAÇÃO SUPABASE =====
const SB_URL = 'https://dfbjmyrtrmgnihshxhwl.supabase.co';
const SB_KEY = 'sb_publishable_xfP9bf4Dx0rlTejSnd3RZA_CZaCiECB';
const sb = window.supabase.createClient(SB_URL, SB_KEY);

// Exporta para uso global
window.sb = sb;

// ===== SISTEMA DE AUTENTICAÇÃO =====
const AUTH_KEY = 'cm_user';

function hashSenha(senha) {
    // Hash simples para não armazenar senha em texto puro
    let hash = 0;
    for (let i = 0; i < senha.length; i++) {
        const char = senha.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return String(hash);
}

async function login(email, senha) {
    const { data, error } = await sb
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('ativo', true)
        .single();

    if (error || !data) return { sucesso: false, mensagem: 'Usuário não encontrado' };

    if (data.senha !== hashSenha(senha) && data.senha !== senha) {
        return { sucesso: false, mensagem: 'Senha incorreta' };
    }

    const usuario = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        perfil: data.perfil
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(usuario));
    return { sucesso: true, usuario };
}

function logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '../pages/login.html';
}

function usuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
        return null;
    }
}

function temPerfil(perfil) {
    const user = usuarioLogado();
    if (!user) return false;
    if (perfil === 'almoxarife') return user.perfil === 'almoxarife' || user.perfil === 'admin';
    if (perfil === 'admin') return user.perfil === 'admin';
    return false;
}

function estaLogado() {
    return !!usuarioLogado();
}

window.hashSenha = hashSenha;
window.login = login;
window.logout = logout;
window.usuarioLogado = usuarioLogado;
window.temPerfil = temPerfil;
window.estaLogado = estaLogado;
