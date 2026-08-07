// ===== CONFIGURAÇÃO SUPABASE =====
const SB_URL = 'https://dfbjmyrtrmgnihshxhwl.supabase.co';
const SB_KEY = 'sb_publishable_xfP9bf4Dx0rlTejSnd3RZA_CZaCiECB';
const sb = window.supabase.createClient(SB_URL, SB_KEY);

// Exporta para uso global
window.sb = sb;
