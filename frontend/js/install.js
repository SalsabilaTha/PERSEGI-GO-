// Tombol "Pasang aplikasi" (PWA) untuk Android/desktop dan petunjuk untuk iPhone.
import { h, openSheet, toast } from './ui.js';

let deferredPrompt = null;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function initInstall(button) {
  const update = () => { button.hidden = isStandalone(); };
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();     // simpan dulu, tampilkan saat tombol ditekan
    deferredPrompt = event;
    update();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    update();
    toast('PERSEGI GO! berhasil dipasang! 🎉');
  });
  button.addEventListener('click', promptInstall);
  update();
}

export async function promptInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    return;
  }
  showInstallHelp();
}

export function showInstallHelp() {
  if (isIOS()) {
    openSheet(
      h('h2', {}, 'Pasang di iPhone / iPad'),
      h('ol', {},
        h('li', {}, 'Buka aplikasi ini di ', h('b', {}, 'Safari'), '.'),
        h('li', {}, 'Ketuk tombol ', h('b', {}, 'Bagikan'), ' (kotak dengan panah ke atas).'),
        h('li', {}, 'Pilih ', h('b', {}, 'Tambah ke Layar Utama'), ' (Add to Home Screen).'),
        h('li', {}, 'Ketuk ', h('b', {}, 'Tambah'), '. Ikon PERSEGI GO! muncul di layar utama.')),
    );
    return;
  }
  openSheet(
    h('h2', {}, 'Pasang aplikasi'),
    h('ol', {},
      h('li', {}, 'Buka aplikasi ini di ', h('b', {}, 'Chrome'), ' atau ', h('b', {}, 'Edge'), '.'),
      h('li', {}, 'Ketuk menu ', h('b', {}, '⋮'), ' di pojok kanan atas.'),
      h('li', {}, 'Pilih ', h('b', {}, 'Instal aplikasi'), ' atau ', h('b', {}, 'Tambahkan ke layar utama'), '.')),
    h('p', { class: 'small muted' }, 'Pemasangan membutuhkan alamat https (setelah aplikasi di-deploy).'),
  );
}
