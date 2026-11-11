// Titik masuk aplikasi: cek login → tampilkan Login atau aplikasi.
import * as auth from './auth.js';
import { api, onSessionExpired } from './api.js';
import { loadContent } from './content.js';
import { initInstall } from './install.js';
import { flush, initOutbox, pendingCount, stopOutbox } from './outbox.js';
import { startRouter, stopRouter } from './router.js';
import { cacheProgress, cachedProgress, emptyProgress, setState, state, subscribe } from './state.js';
import { logoSvg } from './ui.js';
import { renderLogin } from './pages/login.js';
import { setLogoutHandler } from './pages/progres.js';

const $ = (id) => document.getElementById(id);

function show(which) {
  $('splash').hidden = which !== 'splash';
  $('login-root').hidden = which !== 'login';
  $('app').hidden = which !== 'app';
  if (which !== 'login') $('login-root').replaceChildren();
}

function showLogin(opts = {}) {
  stopRouter();
  stopOutbox();
  show('login');
  renderLogin($('login-root'), { ...opts, onLoggedIn: afterLogin });
}

async function afterLogin() {
  const user = await auth.currentUser();
  if (!user) throw new Error('Login belum berhasil. Coba lagi.');
  await enterApp(user);
}

let signOutHooked = false;

async function enterApp(user) {
  if (!signOutHooked) {
    signOutHooked = true;
    // Keluar dari tab lain / sesi dicabut → kembali ke layar login
    auth.onSignedOut(() => { if (state.user) showLogin(); }).catch(() => {});
  }
  setState({ user, progress: cachedProgress(user.key) || emptyProgress() });
  initOutbox(user.key);
  show('app');
  startRouter($('view'));
  await syncWithServer();
}

/** Ambil profil & progres terbaru dari server, lalu kirim antrean offline. */
async function syncWithServer() {
  try {
    const me = await api('/me');
    setState({ user: { ...state.user, name: me.name || state.user.name } });
    if (pendingCount()) await flush();
    const progress = await api('/progress');
    setState({ progress });
    cacheProgress(state.user.key, progress);
  } catch (e) {
    // Offline: tetap pakai progres tersimpan di perangkat.
  }
}

async function logout() {
  await auth.logout().catch(() => {});
  setState({ user: null, progress: null });
  showLogin();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* PWA tidak tersedia */ });
  });
}

async function boot() {
  document.querySelectorAll('[data-logo]').forEach((el) => el.append(logoSvg()));
  registerServiceWorker();
  initInstall($('install-btn'));
  setLogoutHandler(logout);
  onSessionExpired(() => showLogin({ message: 'Sesi berakhir. Silakan masuk lagi.' }));
  subscribe((s) => { $('xp-total').textContent = s.progress?.xp ?? 0; });

  try {
    setState({ content: await loadContent() });
  } catch (e) {
    $('splash-msg').textContent = 'Konten belum bisa dimuat. Periksa koneksi internet lalu muat ulang.';
    return;
  }

  const params = new URLSearchParams(location.search);
  const resetMode = params.has('reset');
  const oauthError = params.get('error_description');

  let user = null;
  try {
    user = await auth.currentUser();   // juga menukar ?code= dari Google/email menjadi sesi
  } catch (e) {
    showLogin({ message: auth.friendlyError(e) });
    return;
  } finally {
    // Bersihkan ?code=...&reset=1 dari alamat agar tidak terproses ulang.
    if (location.search) history.replaceState(null, '', `/${location.hash || '#/beranda'}`);
  }

  if (resetMode && user) {
    showLogin({ mode: 'newPassword' });
    return;
  }
  if (!user) {
    showLogin({ message: oauthError ? auth.friendlyError(oauthError) : undefined });
    return;
  }
  await enterApp(user);
}

boot();
