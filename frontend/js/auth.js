// Login: Supabase Auth (Google & email). Ada juga "mode uji" lokal saat Supabase belum diatur.
import { getSupabase } from './supabaseClient.js';

const DEV_KEY = 'persegi.devSession';

export const isDevMode = () => window.APP_CONFIG?.mode === 'dev';

const ERROR_TEXT = [
  [/invalid login credentials/i, 'Email atau kata sandi salah.'],
  [/email not confirmed/i, 'Email belum diverifikasi. Buka tautan yang dikirim ke emailmu.'],
  [/already registered|already been registered/i, 'Email ini sudah terdaftar. Silakan masuk.'],
  [/password should be at least|weak password/i, 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.'],
  [/rate limit|too many/i, 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.'],
  [/failed to fetch|network/i, 'Tidak ada koneksi internet. Coba lagi saat online.'],
  [/invalid email|unable to validate email/i, 'Format email tidak valid.'],
];

export function friendlyError(err) {
  const msg = String(err?.message || err || '');
  for (const [pattern, text] of ERROR_TEXT) if (pattern.test(msg)) return text;
  return msg || 'Terjadi kesalahan. Coba lagi.';
}

function decodeJwt(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch (e) { return null; }
}

function readDevSession() {
  try {
    const data = JSON.parse(localStorage.getItem(DEV_KEY));
    const claims = data && decodeJwt(data.token);
    if (!claims || claims.exp * 1000 < Date.now()) return null;
    return { token: data.token, user: { ...data.user, provider: 'dev', key: claims.sub } };
  } catch (e) { return null; }
}

/** Pengguna yang sedang login, atau null. */
export async function currentUser() {
  if (isDevMode()) return readDevSession()?.user || null;
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const u = data.session?.user;
  if (!u) return null;
  return {
    email: u.email,
    name: u.user_metadata?.name || u.user_metadata?.full_name || '',
    provider: u.app_metadata?.provider || 'email',
    key: u.id,
  };
}

export async function getToken() {
  if (isDevMode()) return readDevSession()?.token || null;
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();   // otomatis diperbarui bila hampir habis
  return data.session?.access_token || null;
}

export async function refreshToken() {
  if (isDevMode()) return null;
  const sb = await getSupabase();
  const { data } = await sb.auth.refreshSession();
  return data.session?.access_token || null;
}

export async function loginGoogle() {
  const sb = await getSupabase();
  // Redirect (bukan popup) agar berjalan di aplikasi terpasang & iPhone.
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/`, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw new Error(friendlyError(error));
}

export async function loginEmail(email, password) {
  const sb = await getSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyError(error));
}

/** Mengembalikan true bila perlu verifikasi email dulu. */
export async function signUp(name, email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { name }, emailRedirectTo: `${location.origin}/` },
  });
  if (error) throw new Error(friendlyError(error));
  // Supabase tidak memberi error untuk email terdaftar (demi privasi); identities kosong.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Email ini sudah terdaftar. Silakan masuk.');
  }
  return !data.session;
}

export async function resetPassword(email) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/?reset=1`,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function updatePassword(password) {
  const sb = await getSupabase();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(friendlyError(error));
}

export async function devLogin(name, email) {
  const res = await fetch('/api/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal masuk.');
  localStorage.setItem(DEV_KEY, JSON.stringify({ token: data.access_token, user: data.user }));
}

export async function logout() {
  if (isDevMode()) {
    localStorage.removeItem(DEV_KEY);
    return;
  }
  const sb = await getSupabase();
  await sb.auth.signOut({ scope: 'local' });
}

export async function onSignedOut(callback) {
  if (isDevMode()) return;
  const sb = await getSupabase();
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') callback(); });
}
