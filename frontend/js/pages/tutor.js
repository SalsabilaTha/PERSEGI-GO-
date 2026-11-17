// Halaman "Tutor AI": tanya bebas seputar persegi kepada Kak Tutor (mediator RMT).
import { h } from '../ui.js';
import { createTutorPanel } from '../components/tutorPanel.js';

export function render(root) {
  const panel = createTutorPanel({
    mode: 'chat',
    tall: true,
    chips: ['Apa perbedaan luas dan keliling?', 'Beri contoh soal luas persegi', 'Mengapa sudut persegi 90°?'],
    intro: 'Halo, Penjelajah! 👋 Aku membantumu memahami persegi lewat pertanyaan. '
      + 'Coba tanyakan tentang luas, keliling, sifat-sifat, atau ceritakan soal yang membuatmu bingung.',
  });

  root.replaceChildren(
    h('div', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, 'Teman belajar digital'),
      h('h1', {}, 'Tanya Kak Tutor'),
      h('p', {}, 'Tanyakan konsep, rumus, atau langkah penyelesaian soal persegi. Kak Tutor membimbing cara berpikirmu, bukan memberi jawaban jadi.')),
    h('div', { class: 'with-aside' },
      h('div', {}, panel.el),
      h('aside', {},
        h('div', { class: 'card summary-panel' },
          h('span', { class: 'eyebrow' }, 'Cara bertanya yang baik'),
          h('ol', {},
            h('li', {}, 'Sebutkan apa yang sudah kamu ketahui.'),
            h('li', {}, 'Ceritakan langkah yang membuatmu bingung.'),
            h('li', {}, 'Jelaskan alasanmu. Kak Tutor akan menanggapinya.')),
          h('div', { class: 'tip-box' },
            h('b', {}, '🧠 Ingat tahapan berpikir RMT'),
            h('p', {}, 'Input (pahami soal) → Elaborasi (rencanakan & hitung) → Output (periksa & sampaikan).'))))));

  panel.loadHistory();
}
