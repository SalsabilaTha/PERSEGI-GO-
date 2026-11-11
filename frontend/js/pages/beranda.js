// Beranda: hero, peta petualangan, progres, kutipan.
import { state, subscribe } from '../state.js';
import { h } from '../ui.js';

/** Persentase belajar: materi 60%, kuis 20%, latihan 20%. */
export function overallPercent(p) {
  if (!p) return 0;
  const lesson = (p.modules_done.length / (p.total_modules || 6)) * 60;
  const quiz = p.quizzes > 0 ? 20 : 0;
  const practice = (p.solved_problems.length / (p.total_problems || 15)) * 20;
  return Math.min(100, Math.round(lesson + quiz + practice));
}

export function render(root) {
  const draw = () => {
    const p = state.progress;
    const name = state.user?.name;
    const percent = overallPercent(p);

    const journey = [
      { n: '01', icon: '📖', bg: 'bg-purple', title: 'Kenali persegi', desc: 'Pelajari konsep dan sifatnya', href: '#/materi' },
      { n: '02', icon: '📐', bg: 'bg-cream', title: 'Jelajahi rumus', desc: 'Ubah sisi dan amati hasilnya', href: '#/eksplorasi' },
      { n: '03', icon: '🎯', bg: 'bg-green', title: 'Uji kemampuan', desc: 'Jawab tantangan matematika', href: '#/kuis' },
    ];

    root.replaceChildren(
      h('section', { class: 'hero' },
        h('div', {},
          h('span', { class: 'eyebrow' }, 'Petualangan matematika · Kelas VII'),
          h('h1', {}, `Hai, ${name || 'Penjelajah'}!`, h('br'), h('span', {}, 'Siap menaklukkan persegi?')),
          h('p', {}, 'Kenali sifat-sifat persegi, temukan rumusnya, lalu uji kemampuanmu lewat permainan seru.'),
          h('a', { class: 'btn btn-primary', href: nextHref(p) }, p?.modules_done.length ? 'Lanjut belajar →' : 'Mulai belajar →')),
        h('div', { class: 'hero-art', 'aria-hidden': 'true' },
          h('span', { class: 'sparkle s1' }, '✦'), h('span', { class: 'sparkle s2' }, '✧'), h('span', { class: 'sparkle s3' }, '✦'),
          h('div', { class: 'float-chip one' }, 's = s'),
          h('div', { class: 'big-square' }, '4'),
          h('div', { class: 'float-chip two' }, '90°'))),

      h('div', { class: 'section-heading' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Peta petualangan'), h('h2', {}, 'Perjalanan belajarmu')),
        h('span', { class: 'level-pill' }, `LEVEL ${p?.level.number ?? 1} · ${p?.level.name ?? 'PEMULA'}`)),
      h('div', { class: 'grid-3' }, journey.map((j) =>
        h('a', { class: 'journey-card', href: j.href },
          h('span', { class: 'j-num' }, j.n),
          h('div', { class: `j-icon ${j.bg}` }, j.icon),
          h('h3', {}, j.title),
          h('p', {}, j.desc),
          h('span', { class: 'j-go', 'aria-hidden': 'true' }, '↗')))),

      h('div', { class: 'grid-2 stack-sm', style: { marginTop: '18px' } },
        h('div', { class: 'card' },
          h('div', { class: 'card-title-row' },
            h('div', {}, h('span', { class: 'eyebrow' }, 'Pencapaian'), h('h2', { style: { margin: 0 } }, 'Progres belajar')),
            h('span', { 'aria-hidden': 'true', style: { fontSize: '24px' } }, '🏆')),
          h('div', { class: 'progress-track', role: 'progressbar', 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100 },
            h('div', { class: 'progress-fill', style: { width: `${percent}%` } })),
          h('div', { class: 'progress-meta' },
            h('b', {}, `${percent}% selesai`),
            h('span', {}, p?.quizzes ? `${p.quizzes} kuis diselesaikan` : 'Belum ada kuis'))),
        h('div', { class: 'card quote-card' },
          h('div', { class: 'q-mark' }, '“'),
          h('p', {}, 'Matematika bukan tentang menghafal rumus, tetapi memahami pola di sekitar kita.'),
          h('span', { class: 'small muted' }, '— Misi hari ini'))),
    );
  };

  draw();
  return subscribe(draw);
}

function nextHref(p) {
  const done = new Set(p?.modules_done || []);
  const next = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].find((id) => !done.has(id));
  return next ? `#/materi/${next}` : '#/kuis';
}
