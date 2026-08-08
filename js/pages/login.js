// ===== LOGIN =====

document.addEventListener('DOMContentLoaded', () => {
    // Se já estiver logado, redireciona
    if (estaLogado()) {
        window.location.href = '../index.html';
        return;
    }

    document.getElementById('form-login').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-senha').value;

        toggleLoading(true);
        const resultado = await login(email, senha);
        toggleLoading(false);

        if (resultado.sucesso) {
            mostrarToast(`Bem-vindo, ${resultado.usuario.nome}!`);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        } else {
            mostrarToast(resultado.mensagem, 'erro');
        }
    });
});
