// Eksplorasi: simulasi slider (F3), Tebak Sisinya (F1), Kalkulator Persegi (F14).
import { h, formatNumber } from '../ui.js';
import { gridSvg, squareSvg } from '../components/visuals.js';
import { area, perimeter } from '../core/geometry.js';
import { parseNumber } from '../core/checker.js';

const TABS = [
  { id: 'simulasi', label: 'Simulasi' },
  { id: 'tebak', label: 'Tebak Sisinya' },
  { id: 'kalkulator', label: 'Kalkulator' },
];

export function render(root, params) {
  const tab = TABS.find((t) => t.id === params[0])?.id || 'simulasi';
  const body = { simulasi, tebak, kalkulator }[tab]();
  root.replaceChildren(
    h('div', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, 'Lab matematika · Interaktif'),
      h('h1', {}, 'Eksplorasi persegi'),
      h('p', {}, 'Geser ukuran sisi dan lihat bagaimana luas serta keliling berubah.')),
    h('div', { class: 'tabs', role: 'tablist' }, TABS.map((t) =>
      h('a', { class: `tab ${t.id === tab ? 'active' : ''}`, href: `#/eksplorasi/${t.id}`, role: 'tab', 'aria-selected': String(t.id === tab) }, t.label))),
    body);
}

function sliderControl({ id, label, min, max, value, unit, onChange }) {
  const range = h('input', { id, class: 'range', type: 'range', min, max, step: 1, value });
  const out = h('b', {}, `${value} ${unit}`);
  const set = (v) => {
    const n = Math.min(max, Math.max(min, v));
    range.value = n;
    out.textContent = `${n} ${unit}`;
    onChange(n);
  };
  range.addEventListener('input', () => set(Number(range.value)));
  return h('div', {},
    h('div', { class: 'slider-label' }, h('label', { for: id }, label), out),
    h('div', { class: 'slider-row' },
      h('button', { class: 'step-btn', type: 'button', 'aria-label': 'Kurangi', onclick: () => set(Number(range.value) - 1) }, '−'),
      range,
      h('button', { class: 'step-btn', type: 'button', 'aria-label': 'Tambah', onclick: () => set(Number(range.value) + 1) }, '+')),
    h('div', { class: 'progress-meta small' }, h('span', {}, `${min} ${unit}`), h('span', {}, `${max} ${unit}`)));
}

// ------------------------------------------------------------ Simulasi
function simulasi() {
  let side = 7;
  let highlight = 'area';
  const stage = h('div', { class: 'sim-stage' });
  const areaValue = h('div', { class: 's-value' });
  const areaNote = h('div', { class: 's-note' });
  const perValue = h('div', { class: 's-value' });
  const perNote = h('div', { class: 's-note' });
  const observe = h('p', { class: 'small muted', style: { margin: '4px 0 0' } });
  const hlButtons = [
    ['side', 'Sisi'], ['angle', 'Sudut'], ['perimeter', 'Keliling'], ['area', 'Luas'],
  ].map(([key, text]) => h('button', {
    type: 'button', 'aria-pressed': 'false',
    onclick: () => { highlight = key; update(); },
  }, text));

  const update = () => {
    const px = 50 + side * 11;
    stage.replaceChildren(squareSvg({
      side, unit: 'cm', highlight, labels: highlight === 'area' ? 'none' : 'value', px,
      inner: highlight === 'area' ? `${side} cm` : null,
    }));
    hlButtons.forEach((b, i) => {
      const on = ['side', 'angle', 'perimeter', 'area'][i] === highlight;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    areaValue.textContent = `${area(side)} cm²`;
    areaNote.textContent = `${side} × ${side}`;
    perValue.textContent = `${perimeter(side)} cm`;
    perNote.textContent = `4 × ${side}`;
    observe.textContent = `Saat sisi ${side} cm, luasnya ${area(side)} cm² sedangkan kelilingnya ${perimeter(side)} cm. ` +
      'Luas dihitung dengan mengalikan sisi dengan sisi.';
  };

  const card = h('section', { class: 'card' },
    h('div', { class: 'card-title-row' },
      h('span', { class: 'live-dot' }, '● SIMULASI LANGSUNG'),
      h('span', { class: 'chip' }, 'satuan cm')),
    h('div', { class: 'highlight-buttons', role: 'group', 'aria-label': 'Sorot bagian' }, hlButtons),
    stage,
    sliderControl({ id: 'side-range', label: 'Atur panjang sisi', min: 1, max: 15, value: side, unit: 'cm', onChange: (v) => { side = v; update(); } }));

  const aside = h('aside', { class: 'side-stack' },
    h('div', { class: 'stat-card area' }, h('div', { class: 's-icon' }, '▦'), h('div', { class: 's-label' }, 'LUAS PERSEGI'), areaValue, areaNote),
    h('div', { class: 'stat-card perimeter' }, h('div', { class: 's-icon' }, '⟲'), h('div', { class: 's-label' }, 'KELILING PERSEGI'), perValue, perNote),
    h('div', { class: 'card', style: { padding: '16px' } }, h('b', {}, '💡 Coba amati'), observe));

  update();
  return h('div', { class: 'with-aside' }, card, aside);
}

// ------------------------------------------------------------ Tebak Sisinya
function tebak() {
  let target = 0;
  let side = 1;
  const stage = h('div', { class: 'sim-stage' });
  const info = h('p', { class: 'center', style: { fontWeight: 800, fontSize: '18px', margin: 0 }, 'aria-live': 'polite' });
  const feedback = h('div', { 'aria-live': 'polite' });
  const question = h('h2', {});
  let slider = h('div');

  const newTarget = () => {
    let s;
    do { s = 4 + Math.floor(Math.random() * 16); } while (s * s === target);   // sisi 4–19
    target = s * s;
    side = 3;
    question.textContent = `Luas persegi = ${target} kotak. Berapa panjang sisinya?`;
    feedback.replaceChildren();
    const fresh = sliderControl({ id: 'guess-range', label: 'Coba panjang sisi', min: 1, max: 20, value: side, unit: '', onChange: (v) => { side = v; update(); } });
    slider.replaceWith(fresh);
    slider = fresh;
    update();
  };

  const update = () => {
    stage.replaceChildren(gridSvg({ side, target, unit: '' }));
    const now = side * side;
    const diff = target - now;
    info.textContent = `${side} × ${side} = ${now} kotak → ` +
      (diff > 0 ? `kurang ${diff}` : diff < 0 ? `lebih ${-diff}` : 'pas! ✓');
  };

  const check = () => {
    const ok = side * side === target;
    feedback.replaceChildren(h('div', { class: `feedback ${ok ? 'ok' : 'no'}` },
      h('span', { class: 'f-icon' }, ok ? '✓' : '!'),
      h('div', {}, ok
        ? [h('b', {}, `Hebat! √${target} = ${side}`), h('br'), `Karena ${side} × ${side} = ${target}. Inilah arti akar kuadrat.`]
        : side * side < target ? 'Belum pas. Kotaknya masih kurang, jadi coba sisi yang lebih besar.' : 'Belum pas. Kotaknya kelebihan, jadi coba sisi yang lebih kecil.')));
  };

  const table = h('details', {},
    h('summary', {}, '▸ Lihat tabel kuadrat 1–20'),
    h('div', { class: 'squares-table' }, Array.from({ length: 20 }, (_, i) => h('span', {}, `${i + 1}² = ${(i + 1) ** 2}`))));

  const card = h('section', { class: 'card' },
    h('span', { class: 'eyebrow' }, 'Tebak sisinya · Akar kuadrat'),
    question, stage, info, h('div', { style: { height: '10px' } }), slider,
    h('div', { class: 'btn-row', style: { marginTop: '14px' } },
      h('button', { class: 'btn btn-primary', type: 'button', onclick: check }, 'Cek ✓'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: newTarget }, 'Soal baru ↻')),
    feedback);

  const aside = h('aside', { class: 'side-stack' },
    h('div', { class: 'card', style: { padding: '16px' } },
      h('b', {}, 'Cara berpikir'),
      h('ol', { class: 'small', style: { paddingLeft: '18px', marginBottom: 0 } },
        h('li', {}, 'Luas = banyak kotak.'),
        h('li', {}, 'Susun kotak menjadi persegi.'),
        h('li', {}, 'Banyak kotak di satu baris = panjang sisi.'),
        h('li', {}, 'Bilangan yang dikali dirinya sendiri = akar kuadrat (√).'))),
    h('div', { class: 'card', style: { padding: '16px' } }, table));

  newTarget();
  return h('div', { class: 'with-aside' }, card, aside);
}

// ------------------------------------------------------------ Kalkulator
function kalkulator() {
  let unit = 'cm';
  const input = h('input', { id: 'calc-side', class: 'calc-input', inputmode: 'decimal', value: '8', autocomplete: 'off' });
  const unitSelect = h('div', { class: 'unit-chips', role: 'group', 'aria-label': 'Satuan' });
  const stage = h('div', { class: 'sim-stage', style: { minHeight: '220px' } });
  const results = h('div', { class: 'grid-2', style: { marginTop: '14px' } });
  const steps = h('div', {});

  const update = () => {
    unitSelect.replaceChildren(...['cm', 'm'].map((u) => h('button', {
      class: `unit-chip ${u === unit ? 'selected' : ''}`, type: 'button', 'aria-pressed': String(u === unit),
      onclick: () => { unit = u; update(); },
    }, u)));
    const s = parseNumber(input.value);
    if (s === null || s <= 0 || s > 100000) {
      stage.replaceChildren(squareSvg({ side: 's', unit: '', labels: 'letter', highlight: 'angle', px: 150 }));
      results.replaceChildren();
      steps.replaceChildren(h('p', { class: 'muted' }, 'Masukkan panjang sisi berupa angka lebih dari 0.'));
      return;
    }
    const L = area(s);
    const K = perimeter(s);
    stage.replaceChildren(squareSvg({ side: formatNumber(s), unit, labels: 'value', highlight: 'angle', px: 150 }));
    results.replaceChildren(
      h('div', { class: 'stat-card area' }, h('div', { class: 's-label' }, 'LUAS'), h('div', { class: 's-value' }, `${formatNumber(L)} ${unit}²`), h('div', { class: 's-note' }, 's × s')),
      h('div', { class: 'stat-card perimeter' }, h('div', { class: 's-label' }, 'KELILING'), h('div', { class: 's-value' }, `${formatNumber(K)} ${unit}`), h('div', { class: 's-note' }, '4 × s')));
    steps.replaceChildren(
      h('b', {}, 'Cara menghitung:'),
      h('ul', { class: 'calc-steps' },
        h('li', {}, `Luas = ${formatNumber(s)} × ${formatNumber(s)} = ${formatNumber(L)} ${unit}²`),
        h('li', {}, `Keliling = 4 × ${formatNumber(s)} = ${formatNumber(K)} ${unit}`)));
  };
  input.addEventListener('input', update);
  update();

  return h('section', { class: 'card', style: { maxWidth: '760px' } },
    h('h2', {}, '🔢 Kalkulator Persegi'),
    stage,
    h('label', { for: 'calc-side', style: { fontWeight: 700, display: 'block', marginBottom: '6px' } }, 'Masukkan panjang sisi persegi'),
    input,
    unitSelect,
    results,
    h('div', { style: { marginTop: '14px' } }, steps));
}
