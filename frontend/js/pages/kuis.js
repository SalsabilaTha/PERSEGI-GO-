// Kuis pilihan ganda 5 soal (F13). Skor dinilai ulang oleh server.
import { record } from '../outbox.js';
import { state } from '../state.js';
import { h } from '../ui.js';

export function practiceTabs(active) {
  return h('div', { class: 'tabs', role: 'tablist' },
    h('a', { class: `tab ${active === 'kuis' ? 'active' : ''}`, href: '#/kuis', role: 'tab', 'aria-selected': String(active === 'kuis') }, '🎯 Kuis'),
    h('a', { class: `tab ${active === 'latihan' ? 'active' : ''}`, href: '#/latihan', role: 'tab', 'aria-selected': String(active === 'latihan') }, '📝 Latihan Soal Cerita'));
}

export function render(root) {
  const quiz = state.content.quiz;
  const total = quiz.questions.length;
  let index = 0;
  let answers = [];
  const box = h('div', { class: 'quiz-wrap' });

  const drawQuestion = () => {
    const q = quiz.questions[index];
    let chosen = null;
    const explain = h('div', { 'aria-live': 'polite' });
    const next = h('button', { class: 'btn btn-primary', type: 'button', disabled: true },
      index === total - 1 ? 'Lihat hasil →' : 'Jawaban berikutnya →');

    const options = q.options.map((text, i) => h('button', {
      class: 'option', type: 'button',
      onclick: () => choose(i),
    }, h('span', { class: 'letter' }, 'ABCD'[i]), h('span', {}, text)));

    function choose(i) {
      if (chosen !== null) return;
      chosen = i;
      answers[index] = i;
      const ok = i === q.answer;
      options.forEach((btn, j) => {
        btn.disabled = true;
        if (j === q.answer) btn.classList.add('correct');
        else if (j === i) btn.classList.add('wrong');
      });
      explain.replaceChildren(h('div', { class: `explain ${ok ? 'ok' : 'no'}` },
        h('b', {}, ok ? '✓ Benar! ' : 'Belum tepat. '), q.explain));
      next.disabled = false;
      next.focus();
    }

    next.addEventListener('click', () => {
      index += 1;
      if (index < total) drawQuestion();
      else drawResult();
    });

    box.replaceChildren(h('section', { class: 'card' },
      h('div', { class: 'quiz-top' },
        h('span', { class: 'count' }, `SOAL ${index + 1} DARI ${total}`),
        h('span', { class: 'xp' }, '⭐ +10 XP / soal')),
      h('div', { class: 'progress-track', 'aria-hidden': 'true' },
        h('div', { class: 'progress-fill', style: { width: `${(index / total) * 100}%` } })),
      h('div', { class: 'quiz-icon', 'aria-hidden': 'true' }, q.icon),
      h('h2', { class: 'quiz-q' }, q.q),
      h('div', { class: 'options' }, options),
      explain,
      h('div', { class: 'btn-row', style: { justifyContent: 'flex-end', marginTop: '14px' } }, next)));
  };

  const drawResult = async () => {
    const score = answers.filter((a, i) => a === quiz.questions[i].answer).length;
    const percent = Math.round((score / total) * 100);
    const xpLine = h('p', { class: 'small muted', 'aria-live': 'polite' }, 'Menyimpan hasil…');
    box.replaceChildren(h('section', { class: 'card result-card' },
      h('div', { class: 'medal', 'aria-hidden': 'true' }, percent >= 80 ? '🏅' : percent >= 60 ? '🎖️' : '💪'),
      h('span', { class: 'eyebrow' }, 'Tantangan selesai'),
      h('h2', {}, percent >= 80 ? 'Kerja bagus, Penjelajah!' : percent >= 60 ? 'Lumayan, Penjelajah!' : 'Terus berlatih, Penjelajah!'),
      h('p', {}, `Skor kamu: ${score} dari ${total}`),
      h('div', { class: 'percent' }, `${percent}%`),
      h('p', { class: 'muted' }, percent === 100 ? 'Sempurna! Kamu menguasai materi persegi.'
        : percent >= 60 ? 'Pelajari pembahasan soal yang salah, lalu coba lagi.'
          : 'Ulangi materi dulu, lalu coba lagi. Kamu pasti bisa!'),
      xpLine,
      h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: restart }, 'Coba lagi ↻'),
        h('a', { class: 'btn btn-ghost', href: '#/latihan' }, 'Latihan soal cerita ›'))));
    const res = await record('quiz_done', { quiz_id: quiz.id, answers: answers.map((a) => a ?? -1) });
    xpLine.textContent = res.offline
      ? 'Hasil tersimpan di perangkat dan akan dikirim saat online.'
      : res.xp > 0 ? `+${res.xp} XP ditambahkan ke akunmu ⭐` : 'Hasil tersimpan. XP bertambah jika skormu melebihi skor terbaik.';
  };

  function restart() {
    index = 0;
    answers = [];
    drawQuestion();
  }

  root.replaceChildren(
    h('div', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, `Tantangan · ${total} soal`),
      h('h1', {}, quiz.title),
      h('p', {}, 'Pilih jawaban paling tepat. Baca pembahasannya setelah menjawab.')),
    practiceTabs('kuis'),
    box);
  drawQuestion();
}
