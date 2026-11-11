// Materi bertahap (satu kartu = satu ide) + ringkasan + tandai selesai.
import { record } from '../outbox.js';
import { state, subscribe } from '../state.js';
import { h, toast } from '../ui.js';
import { formulaBox, renderVisual } from '../components/visuals.js';
import { parseNumber } from '../core/checker.js';

const stepMemory = {};          // langkah terakhir per modul (selama aplikasi terbuka)
const warmupDone = new Set();   // pemanasan yang sudah dikerjakan sesi ini

export function render(root, params) {
  const modules = state.content.modules;
  const doneSet = () => new Set(state.progress?.modules_done || []);
  const module = modules.find((m) => m.id === params[0]) ||
    modules.find((m) => !doneSet().has(m.id)) || modules[0];
  let step = stepMemory[module.id] || 0;

  // ---------- kartu langkah ----------
  const stepCard = h('section', { class: 'card step-card', 'aria-live': 'polite' });

  const drawStep = () => {
    stepMemory[module.id] = step;
    const data = module.steps[step];
    const last = step === module.steps.length - 1;
    const visualBox = h('div', { class: 'visual-box' }, renderVisual(data.visual));
    stepCard.replaceChildren(
      h('div', { class: 'step-meta' },
        h('span', { class: 'eyebrow', style: { margin: 0 } }, `Langkah ${step + 1} dari ${module.steps.length}`),
        h('div', { class: 'step-dots', 'aria-hidden': 'true' },
          module.steps.map((_, i) => h('span', { class: i <= step ? 'on' : '' })))),
      visualBox,
      h('h2', {}, data.title),
      h('div', { class: 'step-text' }, data.text.map((t) => h('p', {}, t))),
      h('div', { class: 'step-nav' },
        h('button', { class: 'btn btn-ghost', type: 'button', disabled: step === 0, onclick: () => { step -= 1; drawStep(); } }, '‹ Kembali'),
        h('button', {
          class: 'btn btn-soft', type: 'button',
          onclick: () => visualBox.replaceChildren(renderVisual(data.visual)),
        }, '↻ Ulangi'),
        last
          ? h('button', { class: 'btn btn-purple', type: 'button', onclick: () => summary.scrollIntoView({ behavior: 'smooth' }) }, 'Lihat ringkasan ↓')
          : h('button', { class: 'btn btn-purple', type: 'button', onclick: () => { step += 1; drawStep(); } }, 'Lanjut ›')));
  };

  // ---------- ringkasan & tombol selesai ----------
  const finishBtn = h('button', { class: 'btn btn-primary', type: 'button' });
  const updateFinish = () => {
    const done = doneSet().has(module.id);
    finishBtn.textContent = done ? '✓ Materi sudah selesai' : 'Tandai materi selesai ✓';
    finishBtn.disabled = false;
  };
  finishBtn.addEventListener('click', async () => {
    if (doneSet().has(module.id)) { toast('Materi ini sudah kamu selesaikan.'); return; }
    finishBtn.disabled = true;
    await record('lesson_done', { module_id: module.id }, 'Materi selesai!');
    updateFinish();
  });
  updateFinish();

  const index = modules.indexOf(module);
  const nextModule = modules[index + 1];
  const summary = h('section', { class: 'card' },
    module.properties ? [
      h('h2', {}, 'Sifat-sifat persegi'),
      h('div', { class: 'grid-2 stack-sm' }, module.properties.map((p, i) =>
        h('div', { class: 'property-card' },
          h('div', { class: 'p-num' }, String(i + 1)), h('b', {}, p.title), h('span', {}, p.desc)))),
    ] : null,
    h('h2', { style: { marginTop: module.properties ? '20px' : 0 } }, 'Rumus penting'),
    h('div', { class: 'grid-2 stack-sm' }, module.formulas.map(formulaBox)),
    h('div', { class: 'example-box' }, h('b', {}, '💡 Contoh sederhana'), module.example),
    h('div', { class: 'btn-row' },
      finishBtn,
      nextModule
        ? h('a', { class: 'btn btn-ghost', href: `#/materi/${nextModule.id}` }, `Modul berikutnya: ${nextModule.short} ›`)
        : h('a', { class: 'btn btn-ghost', href: '#/kuis' }, 'Lanjut ke kuis ›')));

  const aside = h('aside', {},
    h('div', { class: 'card summary-panel' },
      h('span', { class: 'eyebrow' }, 'Ringkasan'),
      h('h3', {}, 'Ingat 3 hal ini'),
      h('ol', {}, module.remember.map((r) => h('li', {}, r))),
      h('div', { class: 'tip-box' }, h('b', {}, '🏆 Tips belajar'), h('p', {}, module.tip))));

  const tabs = h('nav', { class: 'module-tabs', 'aria-label': 'Daftar modul' });
  const drawTabs = () => {
    const done = doneSet();
    tabs.replaceChildren(...modules.map((m) => h('a', {
      class: `module-tab ${m.id === module.id ? 'active' : ''}`,
      href: `#/materi/${m.id}`,
      'aria-current': m.id === module.id ? 'page' : null,
    }, `${m.number} ${m.short}`, done.has(m.id) ? h('span', { class: 'done', 'aria-label': 'selesai' }, '✓') : null)));
  };
  drawTabs();

  root.replaceChildren(
    h('div', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, `Modul ${module.number} · ${module.eyebrow}`),
      h('h1', {}, module.title),
      h('p', {}, module.subtitle)),
    tabs,
    h('div', { class: 'with-aside' },
      h('div', {}, module.warmup ? warmupCard(module) : null, stepCard, summary),
      aside));
  drawStep();

  return subscribe(() => { updateFinish(); drawTabs(); });
}

/** Pemanasan prasyarat (F4): soal kilat sebelum materi. */
function warmupCard(module) {
  const card = h('section', { class: 'warmup' });
  if (warmupDone.has(module.id)) return null;
  const inputs = module.warmup.map((w, i) => h('input', {
    class: 'num-input', id: `warm-${i}`, inputmode: 'decimal', autocomplete: 'off', 'aria-label': w.q,
  }));
  const msg = h('p', { class: 'small', 'aria-live': 'polite' });
  const check = async () => {
    let correct = 0;
    module.warmup.forEach((w, i) => {
      const ok = parseNumber(inputs[i].value) === w.a;
      inputs[i].style.borderColor = ok ? '#17a77b' : '#e0821f';
      if (ok) correct += 1;
    });
    if (correct === module.warmup.length) {
      warmupDone.add(module.id);
      msg.textContent = '✓ Semua benar! Kamu siap belajar.';
      await record('warmup_done', { module_id: module.id }, 'Pemanasan selesai!');
      setTimeout(() => card.remove(), 1500);
    } else {
      msg.textContent = `${correct} dari ${module.warmup.length} benar. Perbaiki yang berwarna oranye.`;
    }
  };
  card.append(
    h('b', {}, '🔥 Pemanasan dulu'),
    h('p', { class: 'small muted', style: { margin: '2px 0 0' } }, 'Soal kilat untuk mengingat bekal yang dibutuhkan.'),
    ...module.warmup.map((w, i) => h('div', { class: 'warmup-row' }, h('label', { for: `warm-${i}` }, w.q), inputs[i])),
    h('div', { class: 'btn-row', style: { marginTop: '12px' } },
      h('button', { class: 'btn btn-purple', type: 'button', onclick: check }, 'Cek'),
      h('button', { class: 'link-button', type: 'button', onclick: () => { warmupDone.add(module.id); card.remove(); } }, 'Lewati')),
    msg);
  return card;
}
