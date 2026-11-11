// Fungsi bantu membuat elemen DOM dengan aman (tanpa innerHTML untuk data).

const SVG_NS = 'http://www.w3.org/2000/svg';

function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : String(child));
  }
}

/**
 * h('button', { class: 'btn', onclick: fn, disabled: true }, 'Teks')
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, value);
  }
  append(el, children);
  return el;
}

/** Elemen SVG: s('rect', { x: 0, y: 0, width: 10 }) */
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'style' && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) el.style.setProperty(k, v);
    } else el.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function mount(container, ...children) {
  container.replaceChildren();
  append(container, children);
}

let toastTimer = null;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

export function openSheet(...children) {
  const root = document.getElementById('sheet-root');
  const close = () => root.replaceChildren();
  const backdrop = h('div', {
    class: 'sheet-backdrop',
    onclick: (e) => { if (e.target === backdrop) close(); },
  }, h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, children,
    h('button', { class: 'btn btn-ghost btn-block', type: 'button', onclick: close }, 'Tutup')));
  root.replaceChildren(backdrop);
  return close;
}

export function formatNumber(n) {
  return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/** Ikon logo PERSEGI GO! (grid 3x3) */
export function logoSvg(color = '#fff') {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(s('rect', { x: 1 + c * 7, y: 1 + r * 7, width: 6, height: 6, rx: 1.4, fill: color }));
    }
  }
  return s('svg', { viewBox: '0 0 22 22', 'aria-hidden': 'true' }, cells);
}

export function pageHead(eyebrow, title, subtitle) {
  return h('div', { class: 'page-head' },
    h('span', { class: 'eyebrow' }, eyebrow),
    h('h1', {}, title),
    subtitle ? h('p', {}, subtitle) : null);
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}
