// ===== CONFIGURAÇÃO SUPABASE =====
const SB_URL = 'https://dnlxrelguvereehhbugo.supabase.co';
const SB_KEY = 'sb_publishable_o7CcaPohS7zUmhFz5lZoVw_Z376ElS9';
const sb = window.supabase.createClient(SB_URL, SB_KEY);

// Exporta para uso global
window.sb = sb;
