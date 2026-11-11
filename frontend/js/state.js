// Penyimpanan keadaan aplikasi di memori + pemberitahuan perubahan.

const listeners = new Set();

export const state = {
  user: null,        // { email, name, provider }
  progress: null,    // dari /api/progress
  content: null,     // { modules, quiz, problems, badges }
  online: navigator.onLine,
};

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const emptyProgress = () => ({
  xp: 0,
  level: { number: 1, name: 'PEMULA' },
  modules_done: [],
  total_modules: 6,
  quizzes: 0,
  best_quiz_percent: null,
  solved_problems: [],
  total_problems: 15,
  badges: [],
});

// Simpan salinan progres terakhir di perangkat agar tampil saat offline.
const CACHE_KEY = 'persegi.progressCache';

export function cacheProgress(uidKey, progress) {
  try { localStorage.setItem(`${CACHE_KEY}.${uidKey}`, JSON.stringify(progress)); } catch (e) { /* abaikan */ }
}

export function cachedProgress(uidKey) {
  try { return JSON.parse(localStorage.getItem(`${CACHE_KEY}.${uidKey}`)); } catch (e) { return null; }
}
