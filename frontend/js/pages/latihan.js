// Latihan soal cerita mengikuti fase RMT (F2, F6, F8, F16, F17):
// INPUT: Pahami → ELABORASI: Rencanakan, Masukkan angka, Hitung → OUTPUT: Periksa → Refleksi.
// "Kak Tutor" (AI) bisa dipanggil di setiap tahap sebagai mediator.
import { record } from '../outbox.js';
import { state, subscribe } from '../state.js';
import { h, mount } from '../ui.js';
import { squareSvg, stageBar } from '../components/visuals.js';
import { createTutorPanel } from '../components/tutorPanel.js';
import { FORMULAS, QUANTITY_NAME, solutionSteps } from '../core/geometry.js';
import { checkAnswer, parseNumber } from '../core/checker.js';
import { feedbackText } from '../core/messages.js';
import { practiceTabs } from './kuis.js';

const LEVEL_NAME = { example: 'Contoh', complete: 'Lengkapi', independent: 'Mandiri' };
const UNITS = ['cm', 'cm²', 'm', 'm²'];

export function render(root, params) {
  const problems = state.content.problems;
  const problem = problems.find((p) => p.id === params[0]);
  if (!problem) return renderList(root);
  return renderSolver(root, problem);
}

// ------------------------------------------------------------ daftar soal
function renderList(root) {
  const draw = () => {
    const solved = new Set(state.progress?.solved_problems || []);
    const groups = state.content.modules
      .map((m) => ({ m, items: state.content.problems.filter((p) => p.module === m.id) }))
      .filter((g) => g.items.length);
    root.replaceChildren(
      h('div', { class: 'page-head' },
        h('span', { class: 'eyebrow' }, 'Latihan literasi'),
        h('h1', {}, 'Latihan soal cerita'),
        h('p', {}, 'Selesaikan dengan 5 tahap yang sama. Mulai dari soal Contoh, lalu Lengkapi, lalu Mandiri.')),
      practiceTabs('latihan'),
      h('p', { class: 'small muted' }, `${solved.size} dari ${state.content.problems.length} soal sudah benar.`),
      ...groups.map(({ m, items }) => h('section', { class: 'card' },
        h('h3', {}, `Modul ${m.number} · ${m.short}`),
        h('div', { class: 'problem-list' }, items.map((p, i) => h('a', { class: 'problem-item', href: `#/latihan/${p.id}` },
          h('div', {},
            h('b', {}, `Soal ${i + 1}: ${p.context}`),
            h('span', { class: 'level-tag' }, LEVEL_NAME[p.level]),
            h('div', { class: 'p-meta' }, `Ditanya: ${QUANTITY_NAME[p.asked]}`)),
          h('span', { class: 'p-state', 'aria-label': solved.has(p.id) ? 'sudah benar' : 'belum' }, solved.has(p.id) ? '✅' : '›')))))),
    );
  };
  draw();
  return subscribe(draw);
}

// ------------------------------------------------------------ penyelesaian soal
function renderSolver(root, problem) {
  const plan = solutionSteps(problem);
  const pre = new Set(problem.prefilled);
  const tokens = problem.story.filter((seg) => typeof seg !== 'string');

  const st = {
    stage: 0,
    planIndex: 0,
    marks: tokens.map((t) => (pre.has('understand') ? (t.role === 'none' ? null : t.role) : null)),
    markTries: 0,
    computeTries: 0,       // salah pada tahap hitung untuk langkah rumus ini
    totalTries: 0,         // semua percobaan menghitung (dicatat ke server)
    hintsShown: 0,
    errors: [],
    revealed: false,
    effort: null,
    finished: false,
    tutorCalls: 0,         // berapa kali bertanya ke Kak Tutor (data penelitian)
    lastError: null,       // kode kesalahan terakhir di tahap ini (konteks untuk tutor)
    lastInput: null,       // isian terakhir siswa (konteks untuk tutor)
  };

  const storyBox = h('div', { class: 'story' });
  const kaBox = h('div', { class: 'ka-box' });
  const panel = h('section', { class: 'card' });
  const header = h('div');
  const hintList = h('ul', { class: 'hint-list' });

  const addError = (code) => {
    st.lastError = code;
    if (!st.errors.includes(code)) st.errors.push(code);
  };

  // ----- Kak Tutor (AI mediator RMT) -----
  const tutorBox = h('div', { class: 'tutor-slot', hidden: true });
  const tutorPanel = createTutorPanel({
    mode: 'hint',
    problemId: problem.id,
    context: () => ({
      stage: st.stage,
      error_code: st.lastError,
      // Tingkat bantuan naik sesuai kesulitan (petunjuk dibuka / salah berulang)
      hint_level: Math.min(3, st.hintsShown + (st.computeTries >= 2 ? 1 : 0)),
      student_input: st.lastInput,
    }),
    chips: ['Aku bingung mulai dari mana', 'Apa yang perlu kuperhatikan di tahap ini?', 'Apakah langkahku sudah benar?'],
    intro: 'Hai! Aku akan membimbingmu dengan pertanyaan, bukan memberi jawaban. Ceritakan bagian mana yang membingungkan.',
    offlineReply: () => problem.hints[Math.min(st.hintsShown, problem.hints.length - 1)],
    onAsk: () => { st.tutorCalls += 1; },
  });
  tutorBox.append(tutorPanel.el);

  function openTutor(autoAsk = false) {
    tutorBox.hidden = false;
    tutorPanel.loadHistory();
    tutorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (autoAsk) tutorPanel.ask('');
    else tutorPanel.focus();
  }

  // ----- cerita + penanda -----
  function drawStory() {
    const interactive = st.stage === 0 && !pre.has('understand');
    let ti = -1;
    storyBox.replaceChildren(...problem.story.map((seg) => {
      if (typeof seg === 'string') return seg;
      ti += 1;
      const index = ti;
      const mark = st.marks[index];
      if (!interactive) return h('span', { class: `token locked ${mark || ''}` }, seg.t);
      const label = mark === 'known' ? ' (diketahui)' : mark === 'asked' ? ' (ditanya)' : '';
      return h('button', {
        class: `token ${mark || ''}`, type: 'button', 'aria-label': `${seg.t}${label}. Ketuk untuk mengubah tanda.`,
        onclick: () => {
          st.marks[index] = mark === null ? 'known' : mark === 'known' ? 'asked' : null;
          drawStory();
          storyBox.querySelectorAll('.token')[index]?.focus();
        },
      }, seg.t);
    }));
    const known = tokens.filter((t, i) => st.marks[i] === 'known').map((t) => t.note || t.t);
    const asked = tokens.filter((t, i) => st.marks[i] === 'asked').map((t) => t.note || t.t);
    kaBox.replaceChildren(
      h('div', {}, h('b', {}, 'DIKETAHUI'), known.length ? known.map((k) => h('div', {}, k)) : h('span', { class: 'muted small' }, '—')),
      h('div', {}, h('b', {}, 'DITANYA'), asked.length ? asked.map((k) => h('div', {}, k)) : h('span', { class: 'muted small' }, '—')));
  }

  function drawHeader() {
    const stepInfo = plan.length > 1 && st.stage >= 1 && st.stage <= 3
      ? h('p', { class: 'small', style: { fontWeight: 700, color: 'var(--purple)' } },
        `Soal dua langkah · Langkah ${st.planIndex + 1} dari ${plan.length}: cari ${QUANTITY_NAME[plan[st.planIndex].formula.find]}`)
      : null;
    mount(header, stageBar(st.stage, st.stage - 1), stepInfo);
  }

  function feedbackBox(kind, ...content) {
    const icon = kind === 'ok' ? '✓' : kind === 'no' ? '!' : 'i';
    return h('div', { class: `feedback ${kind}`, role: kind === 'no' ? 'alert' : 'status' },
      h('span', { class: 'f-icon', 'aria-hidden': 'true' }, icon), h('div', {}, content));
  }

  function showHint() {
    if (st.hintsShown >= problem.hints.length) return;
    st.hintsShown += 1;
    hintList.replaceChildren(...problem.hints.slice(0, st.hintsShown).map((t, i) => h('li', {}, h('b', {}, `Petunjuk ${i + 1}: `), t)));
  }

  function nav(...buttons) {
    const hintBtn = st.hintsShown < problem.hints.length && st.stage < 4
      ? h('button', { class: 'btn btn-soft', type: 'button', onclick: () => { showHint(); drawPanel(); } }, `💡 Petunjuk (${problem.hints.length - st.hintsShown})`)
      : null;
    const tutorBtn = h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => openTutor(false) }, '🧭 Tanya Tutor');
    return h('div', { class: 'btn-row spread', style: { marginTop: '16px' } },
      h('div', { class: 'btn-row' }, hintBtn, tutorBtn), h('div', { class: 'btn-row' }, buttons));
  }

  function go(stage) {
    st.stage = stage;
    st.lastError = null;
    st.lastInput = null;
    drawHeader();
    drawStory();
    drawPanel();
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ----- tahap 1: pahami -----
  function stageUnderstand() {
    const msg = h('div', { 'aria-live': 'polite' });
    if (pre.has('understand')) {
      return [h('h2', {}, '1. Pahami soal'),
        h('p', {}, 'Informasi penting sudah ditandai untukmu. Baca kotak Diketahui dan Ditanya, lalu lanjutkan.'),
        nav(h('button', { class: 'btn btn-purple', type: 'button', onclick: () => go(1) }, 'Lanjut ›'))];
    }
    const check = () => {
      const missingKnown = tokens.some((t, i) => t.role === 'known' && st.marks[i] !== 'known');
      const wrongAsked = tokens.some((t, i) => t.role === 'asked' && st.marks[i] !== 'asked');
      const extra = tokens.find((t, i) => t.role === 'none' && st.marks[i]);
      if (!missingKnown && !wrongAsked && !extra) { go(1); return; }
      st.markTries += 1;
      addError('WRONG_MARKING');
      const reasons = [];
      if (missingKnown) reasons.push('Masih ada angka yang diketahui yang belum ditandai kuning (ketuk sekali).');
      if (wrongAsked) reasons.push('Cek lagi apa yang ditanyakan soal. Tandai biru (ketuk dua kali).');
      if (extra) reasons.push(`"${extra.t}" tidak dibutuhkan untuk menghitung. Ketuk sampai tandanya hilang.`);
      msg.replaceChildren(feedbackBox('no', reasons.map((r) => h('div', {}, r))));
      if (st.markTries >= 2) {
        msg.append(h('button', {
          class: 'link-button', type: 'button',
          onclick: () => {
            st.marks = tokens.map((t) => (t.role === 'none' ? null : t.role));
            st.hintsShown = Math.max(st.hintsShown, 1);
            showHint();
            go(0);
          },
        }, 'Tunjukkan tanda yang benar'));
      }
    };
    return [
      h('h2', {}, '1. Pahami soal'),
      h('p', {}, 'Ketuk kata/angka penting di cerita. ', h('b', {}, 'Sekali'), ' = diketahui, ', h('b', {}, 'dua kali'), ' = ditanya, ', h('b', {}, 'tiga kali'), ' = hapus.'),
      h('div', { class: 'legend' },
        h('span', {}, h('i', { style: { background: 'var(--known)' } }), 'Diketahui'),
        h('span', {}, h('i', { style: { background: 'var(--asked)' } }), 'Ditanya')),
      msg,
      nav(h('button', { class: 'btn btn-purple', type: 'button', onclick: check }, 'Cek & lanjut ›')),
    ];
  }

  // ----- tahap 2: pilih rumus -----
  function stageFormula() {
    const step = plan[st.planIndex];
    const given = step.formula.use;
    const guide = plan.length > 1 && st.planIndex === 0
      ? `Yang diketahui ${QUANTITY_NAME[given]}, tetapi kita butuh panjang sisi dulu. Rumus apa untuk mencari sisi dari ${QUANTITY_NAME[given]}?`
      : plan.length > 1 ? `Sekarang sisi sudah ditemukan (s = ${plan[0].result} ${problem.unit}). ${problem.guide}` : problem.guide;
    const msg = h('div', { 'aria-live': 'polite' });
    const prefilled = pre.has('formula');
    let picked = prefilled ? step.id : null;
    const next = h('button', { class: 'btn btn-purple', type: 'button', disabled: !picked, onclick: () => go(2) }, 'Lanjut ›');
    const options = Object.entries(FORMULAS).map(([id, f]) => {
      const btn = h('button', {
        class: `formula-option ${prefilled && id === step.id ? 'selected' : ''}`, type: 'button', disabled: prefilled,
        onclick: () => {
          options.forEach((b) => b.classList.remove('correct', 'wrong'));
          if (id === step.id) {
            btn.classList.add('correct');
            picked = id;
            next.disabled = false;
            msg.replaceChildren(feedbackBox('ok', `Tepat! Kita mencari ${QUANTITY_NAME[f.find]} dari ${QUANTITY_NAME[f.use]}: ${f.text}.`));
          } else {
            btn.classList.add('wrong');
            addError('WRONG_FORMULA');
            const why = f.use !== given
              ? `Rumus ini memakai ${QUANTITY_NAME[f.use]}, padahal yang kita punya ${QUANTITY_NAME[given]}.`
              : `Rumus ini mencari ${QUANTITY_NAME[f.find]}, padahal yang kita cari ${QUANTITY_NAME[step.formula.find]}.`;
            msg.replaceChildren(feedbackBox('no', why));
          }
        },
      }, f.text);
      return btn;
    });
    return [
      h('h2', {}, '2. Rencanakan: pilih rumus'),
      h('div', { class: 'guide-q' }, guide),
      h('div', { class: 'formula-options' }, options),
      prefilled ? h('p', { class: 'small muted' }, 'Rumus sudah dipilihkan. Perhatikan alasannya, lalu lanjut.') : null,
      msg,
      nav(next),
    ];
  }

  // ----- tahap 3: masukkan angka -----
  function stageSubstitute() {
    const step = plan[st.planIndex];
    const prefilled = pre.has('substitute');
    const msg = h('div', { 'aria-live': 'polite' });
    const blanks = step.formula.template.filter((p) => p === '□').length;
    const inputs = Array.from({ length: blanks }, () => h('input', {
      class: 'num-input', inputmode: 'decimal', autocomplete: 'off',
      'aria-label': `Angka ${QUANTITY_NAME[step.formula.use]}`,
      value: prefilled ? String(step.input) : null, readonly: prefilled,
    }));
    // Untuk L = □ × □, kedua kotak berisi angka yang sama
    if (blanks > 1) inputs[0].addEventListener('input', () => { inputs[1].value = inputs[0].value; });
    let bi = 0;
    const equation = h('div', { class: 'equation' }, step.formula.template.map((p) => (p === '□' ? inputs[bi++] : h('span', {}, p))));

    const check = () => {
      const value = parseNumber(inputs[0].value);
      st.lastInput = `${step.formula.text} dengan ${step.formula.use} = ${inputs[0].value}`;
      if (value === step.input) { go(3); return; }
      addError('WRONG_SUBSTITUTION');
      const where = st.planIndex > 0 ? 'Gunakan sisi yang baru saja kamu hitung.' : 'Lihat kotak Diketahui.';
      msg.replaceChildren(feedbackBox('no', `Belum tepat. Masukkan nilai ${QUANTITY_NAME[step.formula.use]} (${step.formula.use}). ${where}`));
    };
    inputs[0].addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    return [
      h('h2', {}, '3. Masukkan angka ke rumus'),
      h('p', {}, `Ganti ${step.formula.use} dengan angkanya.`),
      equation,
      msg,
      nav(h('button', { class: 'btn btn-purple', type: 'button', onclick: check }, 'Cek & lanjut ›')),
    ];
  }

  // ----- tahap 4: hitung + satuan -----
  function stageCompute() {
    const step = plan[st.planIndex];
    const isLastStep = st.planIndex === plan.length - 1;
    const prefilled = pre.has('compute');
    const msg = h('div', { 'aria-live': 'polite' });
    let unit = prefilled ? step.unit : null;
    const input = h('input', {
      class: 'num-input', inputmode: 'decimal', autocomplete: 'off', 'aria-label': 'Hasil perhitungan',
      value: prefilled ? String(step.result) : null, readonly: prefilled,
    });
    const chips = h('div', { class: 'unit-chips', role: 'group', 'aria-label': 'Pilih satuan' });
    const drawChips = () => chips.replaceChildren(...UNITS.map((u) => h('button', {
      class: `unit-chip ${u === unit ? 'selected' : ''}`, type: 'button', 'aria-pressed': String(u === unit), disabled: prefilled,
      onclick: () => { unit = u; drawChips(); },
    }, u)));
    drawChips();

    const filledTemplate = step.formula.template.map((p) => (p === '□' ? String(step.input) : p)).join('');
    const afterCorrect = () => {
      if (isLastStep) { go(4); return; }
      st.planIndex += 1;
      st.computeTries = 0;
      go(1);
    };

    const check = () => {
      const code = checkAnswer(
        { value: parseNumber(input.value), unit },
        { expected: step.result, expectedUnit: step.unit, formulaId: step.id, input: step.input },
      );
      if (code === 'EMPTY' || code === 'NO_UNIT') {
        msg.replaceChildren(feedbackBox('info', feedbackText(code)));
        return;
      }
      st.lastInput = `${filledTemplate} = ${input.value} ${unit}`;
      st.totalTries += 1;
      if (code === 'CORRECT') {
        msg.replaceChildren(feedbackBox('ok', h('b', {}, `Benar! ${filledTemplate} = ${step.result} ${step.unit}`)));
        input.readOnly = true;
        nextBtn.textContent = isLastStep ? 'Periksa jawaban ›' : 'Langkah berikutnya ›';
        nextBtn.onclick = afterCorrect;
        return;
      }
      st.computeTries += 1;
      addError(code);
      const parts = [feedbackText(code, { i: step.input })];
      if (st.computeTries === 2 && st.hintsShown < problem.hints.length) {
        showHint();
        parts.push(' Lihat petunjuk di bawah.');
      }
      msg.replaceChildren(feedbackBox('no', parts.join('')));
      if (st.computeTries === 2) {
        // Mediasi: tawarkan bimbingan tutor sebelum cara lengkap ditunjukkan
        msg.append(h('button', { class: 'btn btn-soft', type: 'button', style: { marginTop: '10px' }, onclick: () => openTutor(true) },
          '🧭 Mau dibimbing Kak Tutor?'));
      }
      if (st.computeTries >= 3) {
        // Bantuan tingkat 3: tunjukkan cara lengkap (DS02)
        st.revealed = true;
        input.value = String(step.result);
        unit = step.unit;
        drawChips();
        msg.append(feedbackBox('info',
          h('b', {}, 'Cara lengkapnya: '), `${filledTemplate} = ${step.result} ${step.unit}. `,
          'Perhatikan caranya, nanti coba soal kembar ya.'));
        nextBtn.textContent = isLastStep ? 'Periksa jawaban ›' : 'Langkah berikutnya ›';
        nextBtn.onclick = afterCorrect;
      }
    };

    const nextBtn = h('button', { class: 'btn btn-purple', type: 'button' }, prefilled ? 'Lanjut ›' : 'Cek ✓');
    nextBtn.onclick = prefilled ? afterCorrect : check;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && nextBtn.onclick === check) check(); });

    return [
      h('h2', {}, '4. Hitung dan tulis satuan'),
      h('div', { class: 'equation' }, h('span', {}, `${filledTemplate} =`), input),
      h('p', { class: 'small muted', style: { margin: '0 0 4px' } }, 'Satuan:'),
      chips,
      prefilled ? h('p', { class: 'small muted' }, 'Ini contoh. Perhatikan hasil dan satuannya, lalu lanjut.') : null,
      msg,
      nav(nextBtn),
    ];
  }

  // ----- tahap 5: periksa -----
  function stageCheck() {
    const last = plan[plan.length - 1];
    const side = plan.find((p) => p.formula.find === 's')?.result ?? Object.values(problem.given)[0];
    const checks = {
      K: `${side} + ${side} + ${side} + ${side} = ${last.result} ${last.unit}`,
      L: `${side} × ${side} = ${last.result} ${last.unit}`,
      s: problem.given.L !== undefined
        ? `${side} × ${side} = ${problem.given.L} ${problem.unit}² ✓`
        : `4 × ${side} = ${problem.given.K} ${problem.unit} ✓`,
    };
    const reason = h('div', { 'aria-live': 'polite' });
    const effort = h('div', { class: 'effort', role: 'group', 'aria-label': 'Seberapa berat berpikir' });
    const drawEffort = () => effort.replaceChildren(...Array.from({ length: 9 }, (_, i) => h('button', {
      type: 'button', class: st.effort === i + 1 ? 'selected' : '', 'aria-pressed': String(st.effort === i + 1),
      onclick: () => { st.effort = i + 1; drawEffort(); },
    }, String(i + 1))));
    drawEffort();

    const nextBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go(5) }, 'Lanjut ke refleksi ›');

    return [
      h('h2', {}, '5. Periksa: apakah masuk akal?'),
      h('div', { class: 'visual-box', style: { minHeight: '200px' } },
        squareSvg({ side, unit: problem.unit, labels: 'value', highlight: problem.asked === 'K' ? 'perimeter' : 'area', px: 130 })),
      h('p', {}, h('b', {}, 'Jawaban: '), `${QUANTITY_NAME[problem.asked]} = ${last.result} ${last.unit}`),
      h('p', {}, h('b', {}, 'Cek: '), checks[problem.asked]),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => reason.replaceChildren(feedbackBox('ok', 'Bagus! Kebiasaan memeriksa membuat jawabanmu lebih yakin.')) }, '👍 Masuk akal'),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => reason.replaceChildren(feedbackBox('info', explainReasonable(problem, side, last))) }, '🤔 Masih ragu')),
      reason,
      h('div', { style: { marginTop: '16px' } },
        h('b', {}, 'Seberapa berat kamu berpikir tadi? '), h('span', { class: 'small muted' }, '(1 = sangat ringan, 9 = sangat berat, boleh dilewati)'),
        effort),
      nav(nextBtn),
    ];
  }

  // ----- tahap 6: refleksi (metakognisi + transendensi RMT) -----
  function stageReflect() {
    const msg = h('div', { 'aria-live': 'polite' });
    const text = h('textarea', {
      class: 'text-input reflect-input', rows: 3, maxlength: 500, id: 'reflect-text',
      placeholder: 'Contoh: Aku belajar bahwa pagar dihitung dengan keliling, karena pagar ada di pinggiran…',
    });
    const sendBtn = h('button', { class: 'btn btn-soft', type: 'button' }, '🧭 Kirim ke Kak Tutor');
    sendBtn.addEventListener('click', () => {
      const value = text.value.trim();
      if (value.length < 5) {
        msg.replaceChildren(feedbackBox('info', 'Tulis refleksimu dulu, satu atau dua kalimat saja.'));
        return;
      }
      msg.replaceChildren();
      tutorBox.hidden = false;
      tutorPanel.ask(value, { mode: 'reflect', stage: 5 });
      tutorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    const finishBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: (e) => finish(e.currentTarget) }, 'Selesai ✓');
    return [
      h('h2', {}, '6. Refleksi'),
      h('p', {}, 'Tulis 1–2 kalimat dengan kata-katamu sendiri:'),
      h('ol', { class: 'reflect-q' },
        h('li', {}, 'Apa yang kamu pelajari dari soal ini?'),
        h('li', {}, 'Aturan apa yang berlaku untuk ', h('b', {}, 'semua'), ' persegi?')),
      h('label', { for: 'reflect-text', class: 'sr-only' }, 'Refleksi'),
      text,
      h('div', { class: 'btn-row', style: { marginTop: '10px' } }, sendBtn),
      msg,
      h('div', { class: 'btn-row', style: { marginTop: '16px', justifyContent: 'flex-end' } },
        h('button', { class: 'link-button', type: 'button', onclick: (e) => finish(e.currentTarget) }, 'Lewati'),
        finishBtn),
    ];
  }

  async function finish(button) {
    if (st.finished) return;
    st.finished = true;
    if (button) button.disabled = true;
    const res = await record('practice_done', {
      problem_id: problem.id,
      tries: Math.max(1, st.totalTries),
      hints_used: st.hintsShown,
      errors: st.errors,
      correct: !st.revealed,
      effort: st.effort,
      tutor_calls: Math.min(50, st.tutorCalls),
    });
    drawDone(res);
  }

  function drawDone(res) {
    const list = state.content.problems;
    const next = list[list.indexOf(problem) + 1];
    const msg = res.offline ? 'Hasil tersimpan di perangkat dan akan dikirim saat online.'
      : res.xp > 0 ? `+${res.xp} XP ⭐` : st.revealed ? 'Belum dapat XP. Coba soal kembar agar makin paham.' : 'Hasil tersimpan.';
    header.replaceChildren(stageBar(6, 5));
    panel.replaceChildren(
      h('div', { class: 'center' },
        h('div', { style: { fontSize: '48px' }, 'aria-hidden': 'true' }, st.revealed ? '💪' : '🎉'),
        h('h2', {}, st.revealed ? 'Kamu sudah melihat caranya!' : 'Soal selesai!'),
        h('p', {}, msg),
        st.errors.length ? h('p', { class: 'small muted' }, 'Tips: perhatikan kembali bagian yang tadi keliru.') : null,
        h('div', { class: 'btn-row', style: { justifyContent: 'center' } },
          (st.revealed || st.errors.length) && problem.twin
            ? h('a', { class: 'btn btn-primary', href: `#/latihan/${problem.twin}` }, 'Coba soal kembar ↻') : null,
          next ? h('a', { class: `btn ${st.revealed ? 'btn-ghost' : 'btn-primary'}`, href: `#/latihan/${next.id}` }, 'Soal berikutnya ›') : null,
          h('a', { class: 'btn btn-ghost', href: '#/latihan' }, 'Daftar soal'))));
  }

  function drawPanel() {
    const content = [stageUnderstand, stageFormula, stageSubstitute, stageCompute, stageCheck, stageReflect][st.stage]();
    // mount() melewati nilai null, sedangkan replaceChildren menulis "null"
    mount(panel, content, st.hintsShown && st.stage < 4 ? hintList : null);
  }

  root.replaceChildren(
    h('a', { class: 'link-button', href: '#/latihan', style: { textDecoration: 'none', display: 'inline-block', marginBottom: '8px' } }, '‹ Daftar soal'),
    h('div', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, `Latihan literasi · ${problem.context}`),
      h('h1', {}, 'Soal cerita', h('span', { class: 'level-tag', style: { verticalAlign: 'middle' } }, LEVEL_NAME[problem.level]))),
    header,
    h('div', { class: 'with-aside story-first' },
      h('div', {}, panel, tutorBox),
      h('aside', {}, h('div', { class: 'card' }, h('span', { class: 'eyebrow' }, 'Soal'), storyBox, kaBox))));
  go(0);
}

function explainReasonable(problem, side, last) {
  const u = problem.unit;
  if (problem.asked === 'K') return `Keliling = 4 sisi yang masing-masing ${side} ${u}. Jadi ${last.result} ${u} adalah panjang seluruh pinggirannya. Satuannya ${u} karena keliling adalah panjang.`;
  if (problem.asked === 'L') return `Luas = banyak kotak 1 ${u} × 1 ${u}. Ada ${side} baris, masing-masing ${side} kotak, jadi ${last.result} ${u}². Satuannya berpangkat dua karena luas.`;
  return `Jika sisinya ${side} ${u}, maka ${problem.given.L !== undefined ? `luasnya ${side} × ${side} = ${problem.given.L} ${u}²` : `kelilingnya 4 × ${side} = ${problem.given.K} ${u}`}. Cocok dengan soal, jadi jawabannya benar. Sisi adalah panjang, jadi satuannya ${u}.`;
}
