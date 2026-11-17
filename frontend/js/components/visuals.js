// Gambar SVG untuk materi & eksplorasi. Warna: ungu = luas, hijau = keliling.
import { h, s } from '../ui.js';

const C = {
  purple: '#6258e8', purpleSoft: '#e9e6ff', purpleFill: '#d9d4ff',
  green: '#17a77b', orange: '#e0821f', ink: '#252642', muted: '#6e7090', line: '#c9c6f5',
};

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function label(x, y, text, opts = {}) {
  return s('text', {
    x, y, 'text-anchor': opts.anchor || 'middle', 'dominant-baseline': 'middle',
    'font-size': opts.size || 14, 'font-weight': 800, fill: opts.color || C.ink,
    'font-family': 'Nunito, system-ui, sans-serif',
  }, text);
}

/**
 * Persegi berlabel.
 * highlight: none | side | angle | parallel | diagonal | perimeter | area
 * labels: letter (s) | value (5 cm) | none
 */
export function squareSvg({ side = 5, unit = 'cm', highlight = 'none', labels = 'value', animate = null, px = 160, inner = null } = {}) {
  const pad = 46;
  const size = px;
  const W = size + pad * 2;
  const x = pad;
  const y = pad;
  const parts = [];
  const text = labels === 'letter' ? 's' : labels === 'value' ? `${side} ${unit}` : '';

  const fill = highlight === 'area' ? C.purpleFill : C.purpleSoft;
  parts.push(s('rect', { x, y, width: size, height: size, rx: 4, fill, stroke: C.purple, 'stroke-width': 2.5 }));

  if (highlight === 'area') {
    // Kotak satuan tipis di dalam (luas = banyak kotak)
    const n = Math.min(Math.round(side), 15);
    const cell = size / n;
    for (let i = 1; i < n; i++) {
      parts.push(s('line', { x1: x + i * cell, y1: y, x2: x + i * cell, y2: y + size, stroke: '#ffffff', 'stroke-width': 1.2 }));
      parts.push(s('line', { x1: x, y1: y + i * cell, x2: x + size, y2: y + i * cell, stroke: '#ffffff', 'stroke-width': 1.2 }));
    }
  }

  if (highlight === 'perimeter') {
    const len = size * 4;
    const path = s('path', {
      d: `M${x} ${y} H${x + size} V${y + size} H${x} Z`, fill: 'none', stroke: C.green,
      'stroke-width': 6, 'stroke-linejoin': 'round',
      class: animate === 'trace' && !reduceMotion() ? 'trace' : null,
      style: { '--len': String(len) },
    });
    parts.push(path);
  }

  if (highlight === 'side') {
    // Tanda "sama panjang" di tengah tiap sisi
    const m = size / 2;
    parts.push(
      s('line', { x1: x + m, y1: y - 7, x2: x + m, y2: y + 7, stroke: C.orange, 'stroke-width': 3 }),
      s('line', { x1: x + m, y1: y + size - 7, x2: x + m, y2: y + size + 7, stroke: C.orange, 'stroke-width': 3 }),
      s('line', { x1: x - 7, y1: y + m, x2: x + 7, y2: y + m, stroke: C.orange, 'stroke-width': 3 }),
      s('line', { x1: x + size - 7, y1: y + m, x2: x + size + 7, y2: y + m, stroke: C.orange, 'stroke-width': 3 }),
    );
  }

  if (highlight === 'angle' || highlight === 'side') {
    const k = Math.max(12, size * 0.1);
    const color = highlight === 'angle' ? C.orange : C.purple;
    const corners = [[x, y, 1, 1], [x + size, y, -1, 1], [x + size, y + size, -1, -1], [x, y + size, 1, -1]];
    for (const [cx, cy, dx, dy] of corners) {
      parts.push(s('path', {
        d: `M${cx + dx * k} ${cy} V${cy + dy * k} H${cx}`, fill: 'none', stroke: color, 'stroke-width': 2,
      }));
    }
    if (highlight === 'angle') parts.push(label(x + size / 2, y + size / 2, '90°', { color: C.orange, size: 18 }));
  }

  if (highlight === 'parallel') {
    parts.push(
      s('line', { x1: x, y1: y, x2: x + size, y2: y, stroke: C.green, 'stroke-width': 6 }),
      s('line', { x1: x, y1: y + size, x2: x + size, y2: y + size, stroke: C.green, 'stroke-width': 6 }),
      s('line', { x1: x, y1: y, x2: x, y2: y + size, stroke: C.orange, 'stroke-width': 6 }),
      s('line', { x1: x + size, y1: y, x2: x + size, y2: y + size, stroke: C.orange, 'stroke-width': 6 }),
    );
  }

  if (highlight === 'diagonal') {
    parts.push(
      s('line', { x1: x, y1: y, x2: x + size, y2: y + size, stroke: C.orange, 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }),
      s('line', { x1: x + size, y1: y, x2: x, y2: y + size, stroke: C.orange, 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }),
      s('circle', { cx: x + size / 2, cy: y + size / 2, r: 5, fill: C.orange }),
    );
  }

  if (inner) parts.push(label(x + size / 2, y + size / 2, inner, { color: '#fff', size: Math.max(14, size / 7) }));

  if (text) {
    const color = highlight === 'perimeter' ? C.green : C.ink;
    parts.push(
      label(x + size / 2, y - 18, text, { color }),
      label(x + size / 2, y + size + 20, text, { color }),
      label(x - 10, y + size / 2, text, { color, anchor: 'end' }),
      label(x + size + 10, y + size / 2, text, { color, anchor: 'start' }),
    );
  }

  const desc = `Persegi dengan sisi ${side} ${unit}`;
  return s('svg', { viewBox: `-30 0 ${W + 60} ${W}`, role: 'img', 'aria-label': desc }, parts);
}

/** Grid kotak satuan side × side. target = luas yang dicari (mode akar). */
export function gridSvg({ side = 3, target = null, unit = 'cm', animate = null, max = 220 } = {}) {
  const n = Math.max(1, Math.round(side));
  const cell = Math.min(34, max / n);
  const size = cell * n;
  const pad = 30;
  const parts = [];
  const animated = animate === 'fill' && !reduceMotion();

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      parts.push(s('rect', {
        x: pad + c * cell + 1, y: pad + r * cell + 1, width: cell - 2, height: cell - 2, rx: Math.min(4, cell / 5),
        fill: C.purpleFill, stroke: C.purple, 'stroke-width': 1,
        class: animated ? 'fill-cell' : null,
        style: animated ? { 'animation-delay': `${(r * 0.35 + c * 0.06).toFixed(2)}s` } : null,
      }));
    }
  }
  parts.push(label(pad + size / 2, pad - 14, `${n} ${unit}`, { size: 13 }));
  parts.push(label(pad + size + 8, pad + size / 2, `${n} ${unit}`, { size: 13, anchor: 'start' }));
  const W = size + pad * 2 + 40;
  const aria = target ? `Grid ${n} kali ${n} = ${n * n} kotak, target ${target}` : `Grid ${n} kali ${n} = ${n * n} kotak`;
  return s('svg', { viewBox: `0 0 ${W} ${size + pad * 2}`, role: 'img', 'aria-label': aria }, parts);
}

/** Kartu rumus besar */
export function formulaBox(which) {
  const map = {
    L: ['area', 'LUAS', 'L = s × s', 's = panjang sisi'],
    K: ['perimeter', 'KELILING', 'K = 4 × s', 's = panjang sisi'],
    sK: ['side', 'SISI DARI KELILING', 's = K ÷ 4', 'K = keliling'],
    sL: ['side', 'SISI DARI LUAS', 's = √L', 'L = luas'],
  };
  const [cls, title, main, note] = map[which];
  return h('div', { class: `formula-card ${cls}` },
    h('div', { class: 'f-label' }, title),
    h('div', { class: 'f-main' }, main),
    h('div', { class: 'f-note' }, note));
}

function pickVisual() {
  const feedback = h('p', { class: 'center', 'aria-live': 'polite' });
  const shapes = [
    { name: 'Persegi panjang', ok: false, d: 'M10 30 H110 V80 H10 Z' },
    { name: 'Persegi', ok: true, d: 'M20 10 H100 V90 H20 Z' },
    { name: 'Belah ketupat', ok: false, d: 'M60 5 L110 50 L60 95 L10 50 Z' },
  ];
  const buttons = shapes.map((shape) => {
    const btn = h('button', { class: 'pick-option', type: 'button', 'aria-label': shape.name },
      s('svg', { viewBox: '0 0 120 100', 'aria-hidden': 'true' },
        s('path', { d: shape.d, fill: C.purpleSoft, stroke: C.purple, 'stroke-width': 3 })));
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('correct', 'wrong'));
      btn.classList.add(shape.ok ? 'correct' : 'wrong');
      feedback.textContent = shape.ok
        ? '✓ Benar! Keempat sisinya sama dan sudutnya siku-siku.'
        : shape.name === 'Belah ketupat'
          ? 'Belum tepat. Sisinya sama, tetapi sudutnya tidak siku-siku.'
          : 'Belum tepat. Sudutnya siku-siku, tetapi sisinya tidak sama panjang.';
    });
    return btn;
  });
  return h('div', {}, h('div', { class: 'pick-grid' }, buttons), feedback);
}

function sortVisual(items) {
  let index = 0;
  let correct = 0;
  const box = h('div', { class: 'center' });
  const show = () => {
    if (index >= items.length) {
      box.replaceChildren(
        h('div', { class: 'sort-word' }, `Selesai! ${correct} dari ${items.length} benar`),
        h('button', { class: 'btn btn-soft', type: 'button', onclick: () => { index = 0; correct = 0; show(); } }, '↻ Ulangi'));
      return;
    }
    const item = items[index];
    const msg = h('p', { 'aria-live': 'polite' });
    const choose = (k) => {
      const ok = k === item.k;
      if (ok) correct += 1;
      msg.textContent = ok
        ? `✓ Benar! ${item.t} → ${item.k === 'K' ? 'keliling' : 'luas'}.`
        : `Belum tepat. ${item.t} ${item.k === 'K' ? 'dipasang di pinggiran → keliling' : 'menutupi permukaan → luas'}.`;
      choices.forEach((b) => { b.disabled = true; });
      next.hidden = false;
    };
    const choices = [
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => choose('K') }, 'Pinggiran (keliling)'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => choose('L') }, 'Permukaan (luas)'),
    ];
    const next = h('button', { class: 'btn btn-soft', type: 'button', hidden: true, onclick: () => { index += 1; show(); } }, 'Berikutnya ›');
    box.replaceChildren(
      h('div', { class: 'small muted' }, `Benda ${index + 1} dari ${items.length}`),
      h('div', { class: 'sort-word' }, item.t),
      h('div', { class: 'btn-row', style: { justifyContent: 'center' } }, choices),
      msg, next);
  };
  show();
  return box;
}

// Tahap latihan dan fase kognitif RMT (Input → Elaborasi → Output) + Refleksi.
export const STAGES = ['Pahami', 'Rencanakan', 'Masukkan angka', 'Hitung + satuan', 'Periksa', 'Refleksi'];
export const STAGE_PHASE = ['input', 'elaborasi', 'elaborasi', 'elaborasi', 'output', 'refleksi'];
export const PHASE_INFO = {
  input: { label: 'INPUT', text: 'Kumpulkan informasi dengan teliti (Representasi)' },
  elaborasi: { label: 'ELABORASI', text: 'Olah informasi: rencanakan & hitung (Manipulasi)' },
  output: { label: 'OUTPUT', text: 'Sampaikan & periksa jawaban (Validasi)' },
  refleksi: { label: 'REFLEKSI', text: 'Apa yang kamu pelajari? Aturan apa yang berlaku umum?' },
};

export function stageBar(active, done = -1) {
  const phase = STAGE_PHASE[active];
  return h('div', {},
    h('ol', { class: 'stage-bar', 'aria-label': 'Tahap penyelesaian' },
      STAGES.map((t, i) => h('li', {
        class: `stage-pill ${i === active ? 'active' : ''} ${i <= done && i !== active ? 'done' : ''} ph-${STAGE_PHASE[i]}`,
        'aria-current': i === active ? 'step' : null,
        title: `Fase ${PHASE_INFO[STAGE_PHASE[i]].label}`,
      }, h('span', { class: 'n' }, i < active || i <= done ? '✓' : String(i + 1)), h('span', { class: 't' }, t)))),
    phase ? h('p', { class: `phase-line ph-${phase}` },
      h('b', {}, `Fase RMT: ${PHASE_INFO[phase].label}`), ` · ${PHASE_INFO[phase].text}`) : null);
}

/** Tabel kuadrat (alat berpikir/graphic organizer RMT) */
export function squaresTable({ rows = 12, highlight = null } = {}) {
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'rmt-table' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 's'), h('th', { scope: 'col' }, 's × s = s²'))),
      h('tbody', {}, Array.from({ length: rows }, (_, i) => h('tr', { class: i + 1 === highlight ? 'hl' : '' },
        h('td', {}, String(i + 1)), h('td', {}, `${i + 1} × ${i + 1} = ${(i + 1) ** 2}`))))));
}

/** Membuat visual dari spesifikasi di modules.json */
export function renderVisual(spec) {
  let node;
  switch (spec.type) {
    case 'square': node = squareSvg(spec); break;
    case 'grid': node = gridSvg(spec); break;
    case 'formula': node = h('div', {}, formulaBox(spec.which), spec.line ? h('div', { class: 'visual-caption' }, spec.line) : null); break;
    case 'pick': node = pickVisual(); break;
    case 'sort': node = sortVisual(spec.items); break;
    case 'stages': node = h('div', {}, stageBar(spec.active)); break;
    case 'table': node = squaresTable(spec); break;
    default: node = h('div');
  }
  const caption = spec.caption && spec.type !== 'formula' ? h('div', { class: 'visual-caption' }, spec.caption) : null;
  return h('div', { style: { width: '100%' } }, node, caption);
}
