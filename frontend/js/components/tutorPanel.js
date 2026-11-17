// Panel percakapan "Kak Tutor" (Tutor AI berbasis RMT).
// Tutor membimbing dengan pertanyaan, tidak memberi jawaban akhir. Bila AI/offline tidak
// tersedia, server (atau fungsi offlineReply) memberi petunjuk bawaan.
import { api } from '../api.js';
import { h } from '../ui.js';

const PRIVACY_KEY = 'persegi.tutorPrivacySeen';

/**
 * @param {{
 *   mode: 'hint'|'chat',
 *   problemId?: string,
 *   context?: () => object,        // konteks tambahan (stage, error_code, hint_level, ...)
 *   chips?: string[],              // pertanyaan cepat
 *   intro?: string,
 *   offlineReply?: () => string,
 *   onAsk?: () => void,            // dipanggil setiap siswa bertanya (untuk menghitung)
 *   tall?: boolean,
 * }} opts
 */
export function createTutorPanel(opts) {
  const history = [];          // [{role, content}] dikirim ke server (maks 8 terakhir)
  let busy = false;
  let loaded = false;

  const list = h('div', { class: 'tutor-messages', role: 'log', 'aria-live': 'polite' });
  const input = h('input', {
    class: 'text-input', type: 'text', maxlength: 500, autocomplete: 'off',
    placeholder: 'Tulis pertanyaan atau cara berpikirmu…', 'aria-label': 'Pertanyaan untuk Tutor',
  });
  const send = h('button', { class: 'btn btn-purple', type: 'submit' }, 'Kirim');
  const form = h('form', { class: 'tutor-form' }, input, send);
  const chips = h('div', { class: 'tutor-chips' });

  const bubble = (role, text, extra = '') => {
    const el = h('div', { class: `tutor-msg ${role} ${extra}` },
      role === 'assistant' ? h('span', { class: 'who' }, '🧭 Kak Tutor') : null,
      h('div', {}, text));
    list.append(el);
    list.scrollTop = list.scrollHeight;
    return el;
  };

  async function ask(text, override = {}) {
    const message = String(text || '').trim();
    if (busy || (!message && opts.mode !== 'hint')) return;
    busy = true;
    send.disabled = true;
    const shown = message || 'Aku butuh bantuan di tahap ini.';
    bubble('user', shown);
    const thinking = bubble('assistant', 'Kak Tutor sedang berpikir…', 'thinking');
    opts.onAsk?.();
    try {
      if (!navigator.onLine) throw new Error('offline');
      const body = {
        mode: opts.mode,
        message: shown,
        problem_id: opts.problemId,
        history: history.slice(-8),
        ...(opts.context ? opts.context() : {}),
        ...override,
      };
      const res = await api('/tutor', { method: 'POST', body });
      thinking.remove();
      bubble('assistant', res.reply, res.source === 'fallback' ? 'fallback' : '');
      history.push({ role: 'user', content: shown }, { role: 'assistant', content: res.reply });
    } catch (e) {
      thinking.remove();
      const text = e?.status === 429 ? e.message
        : opts.offlineReply ? `(Offline) ${opts.offlineReply()}`
          : 'Tutor belum bisa dihubungi. Periksa koneksi internet lalu coba lagi.';
      bubble('assistant', text, 'fallback');
    } finally {
      busy = false;
      send.disabled = false;
      input.focus({ preventScroll: true });
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    ask(text);
  });
  (opts.chips || []).forEach((c) => chips.append(
    h('button', { class: 'chip-btn', type: 'button', onclick: () => ask(c) }, c)));

  let privacy = null;
  try {
    if (!localStorage.getItem(PRIVACY_KEY)) {
      privacy = h('p', { class: 'tutor-privacy small' },
        'ℹ️ Percakapan diproses layanan AI Google Gemini dan disimpan untuk penelitian ',
        h('b', {}, 'tanpa nama dan email'), '. Jangan menulis data pribadi di sini. ',
        h('button', {
          class: 'link-button', type: 'button',
          onclick: () => { try { localStorage.setItem(PRIVACY_KEY, '1'); } catch (e) { /* abaikan */ } privacy.remove(); },
        }, 'Mengerti'));
    }
  } catch (e) { /* localStorage tidak tersedia */ }

  const el = h('section', { class: `tutor-panel ${opts.tall ? 'tall' : ''}`, 'aria-label': 'Kak Tutor' },
    h('div', { class: 'tutor-head' },
      h('div', { class: 'tutor-avatar', 'aria-hidden': 'true' }, '🧭'),
      h('div', {}, h('b', {}, 'Kak Tutor'),
        h('div', { class: 'small muted' },
          window.APP_CONFIG?.aiEnabled ? 'Pembimbing berpikir · tidak memberi jawaban akhir' : 'Mode petunjuk bawaan (AI belum diaktifkan)'))),
    privacy,
    opts.intro ? h('div', { class: 'tutor-msg assistant' }, h('span', { class: 'who' }, '🧭 Kak Tutor'), h('div', {}, opts.intro)) : null,
    list, chips, form);

  async function loadHistory() {
    if (loaded) return;
    loaded = true;
    try {
      const q = opts.problemId ? `?problem_id=${encodeURIComponent(opts.problemId)}` : '';
      const data = await api(`/tutor/history${q}`);
      data.items.forEach((m) => {
        bubble(m.role, m.content);
        history.push({ role: m.role, content: m.content });
      });
    } catch (e) { /* offline: mulai kosong */ }
  }

  return { el, ask, loadHistory, focus: () => input.focus() };
}
