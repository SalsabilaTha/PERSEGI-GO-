// Memuat pustaka supabase-js (versi dikunci) dan membuat klien Supabase.

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

let clientPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.crossOrigin = 'anonymous';
    tag.onload = resolve;
    tag.onerror = () => reject(new Error('Pustaka login gagal dimuat. Periksa koneksi internet.'));
    document.head.append(tag);
  });
}

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = (async () => {
      if (!window.supabase) await loadScript(SUPABASE_JS);
      const { supabaseUrl, supabaseAnonKey } = window.APP_CONFIG;
      return window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'pkce',          // kode login lewat ?code=, aman untuk PWA
          persistSession: true,      // sesi diingat, tidak perlu login ulang
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    })();
  }
  return clientPromise;
}
