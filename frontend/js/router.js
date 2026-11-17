// Router berbasis hash: #/materi/m2 → halaman "materi" dengan parameter ["m2"].
import * as beranda from './pages/beranda.js';
import * as materi from './pages/materi.js';
import * as eksplorasi from './pages/eksplorasi.js';
import * as kuis from './pages/kuis.js';
import * as latihan from './pages/latihan.js';
import * as progres from './pages/progres.js';
import * as tutor from './pages/tutor.js';

const routes = { beranda, materi, eksplorasi, kuis, latihan, progres, tutor };
// Menu mana yang menyala untuk tiap halaman
const NAV_FOR = { latihan: 'kuis' };
// Halaman yang menampilkan tombol bulat "Tanya Tutor" (HP tidak punya menu Tutor di bawah)
const FAB_ON = new Set(['kuis', 'latihan', 'materi', 'eksplorasi']);

let view = null;
let cleanup = null;
let started = false;

function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || 'beranda', params: parts.slice(1) };
}

export function render() {
  if (!view) return;
  const { name, params } = parse();
  const page = routes[name] || routes.beranda;
  const navName = routes[name] ? (NAV_FOR[name] || name) : 'beranda';

  if (typeof cleanup === 'function') cleanup();
  view.replaceChildren();
  const wrapper = document.createElement('div');
  wrapper.className = 'page';
  view.append(wrapper);
  cleanup = page.render(wrapper, params);
  // Di halaman soal cerita, tutor sudah ada di dalam latihan, jadi tombol bulat tidak perlu.
  if (FAB_ON.has(name) && !(name === 'latihan' && params.length)) {
    const fab = document.createElement('a');
    fab.className = 'tutor-fab';
    fab.href = '#/tutor';
    fab.setAttribute('aria-label', 'Tanya Kak Tutor');
    fab.textContent = '🧭';
    view.append(fab);
  }

  document.querySelectorAll('[data-nav] [data-route]').forEach((a) => {
    const active = a.dataset.route === navName;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  view.focus({ preventScroll: true });
}

export function startRouter(container) {
  view = container;
  if (!started) {
    window.addEventListener('hashchange', render);
    started = true;
  }
  if (!location.hash) history.replaceState(null, '', '#/beranda');
  render();
}

export function stopRouter() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  if (view) view.replaceChildren();
}

export function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
