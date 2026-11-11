// Antrean aktivitas: dicatat di perangkat dulu, lalu dikirim ke server.
// Jika offline, aktivitas tidak hilang dan dikirim otomatis saat online.
import { api } from './api.js';
import { state, setState, cacheProgress } from './state.js';
import { newId, toast } from './ui.js';

let userKey = null;
let timer = null;
let flushing = null;

const storageKey = () => `persegi.outbox.${userKey}`;

function read() {
  try { return JSON.parse(localStorage.getItem(storageKey())) || []; } catch (e) { return []; }
}
function write(items) {
  try { localStorage.setItem(storageKey(), JSON.stringify(items)); } catch (e) { /* penuh/privat */ }
}

export function initOutbox(key) {
  userKey = key;
  clearInterval(timer);
  timer = setInterval(() => { if (read().length) flush(); }, 30000);
}

export function stopOutbox() {
  clearInterval(timer);
  userKey = null;
}

export function pendingCount() {
  return userKey ? read().length : 0;
}

window.addEventListener('online', () => { setState({ online: true }); if (userKey) flush(); });
window.addEventListener('offline', () => setState({ online: false }));

function badgeName(id) {
  return state.content?.badges.find((b) => b.id === id)?.name || id;
}

/** Kirim semua antrean. Mengembalikan respons server atau null bila gagal. */
export function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    const items = read();
    if (!items.length || !userKey) return null;
    try {
      const data = await api('/activities', { method: 'POST', body: { activities: items.slice(0, 50) } });
      const handled = new Set([
        ...data.results.map((r) => r.client_id),
        ...data.rejected.map((r) => r.client_id),
      ]);
      write(read().filter((i) => !handled.has(i.client_id)));
      setState({ progress: data.progress });
      cacheProgress(userKey, data.progress);
      if (data.new_badges?.length) {
        setTimeout(() => toast(`🏅 Lencana baru: ${data.new_badges.map(badgeName).join(', ')}`), 2600);
      }
      return data;
    } catch (e) {
      return null;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/**
 * Catat aktivitas. label = awal pesan toast, contoh "Materi selesai!".
 * Mengembalikan { xp, score, offline }.
 */
export async function record(type, payload, label = '') {
  const item = { client_id: newId(), type, payload, created_at: new Date().toISOString() };
  write([...read(), item]);
  const data = await flush();
  const result = data?.results.find((r) => r.client_id === item.client_id);
  if (!result) {
    if (label) toast(`${label} Tersimpan di perangkat, akan dikirim saat online.`);
    return { offline: true };
  }
  if (label) toast(result.xp > 0 ? `${label} +${result.xp} XP 🎉` : label);
  return { xp: result.xp, score: result.score, offline: false };
}
