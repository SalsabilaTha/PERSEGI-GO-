// Evaluasi & Progres: statistik, lencana, riwayat, akun (ekspor, keluar, hapus).
import { api } from '../api.js';
import { pendingCount } from '../outbox.js';
import { state, subscribe } from '../state.js';
import { h, formatDate, toast } from '../ui.js';
import { promptInstall, isStandalone } from '../install.js';

let logoutHandler = null;
/** main.js mendaftarkan fungsi keluar agar halaman ini tidak bergantung pada main.js */
export function setLogoutHandler(fn) { logoutHandler = fn; }

function activityLabel(item) {
  const p = item.payload || {};
  const c = state.content;
  switch (item.type) {
    case 'lesson_done': {
      const m = c.modules.find((x) => x.id === p.module_id);
      return `Menyelesaikan materi: ${m ? m.short : p.module_id}`;
    }
    case 'quiz_done': return `Menyelesaikan kuis: ${p.score}/${p.total} benar`;
    case 'practice_done': {
      const pr = c.problems.find((x) => x.id === p.problem_id);
      return `${p.correct ? 'Menyelesaikan' : 'Mempelajari'} soal cerita: ${pr ? pr.context : p.problem_id}`;
    }
    case 'warmup_done': return 'Menyelesaikan pemanasan';
    default: return item.type;
  }
}

export function render(root) {
  const historyBox = h('div', {}, h('p', { class: 'muted' }, 'Memuat riwayat…'));
  const statsBox = h('div', { class: 'grid-4' });
  const badgeBox = h('div', { class: 'badge-grid' });
  const pendingNote = h('p', { class: 'small muted' });

  const drawStats = () => {
    const p = state.progress;
    const tiles = [
      ['⭐', 'TOTAL XP', p.xp],
      ['🎯', 'KUIS SELESAI', p.quizzes],
      ['📚', 'MATERI SELESAI', `${p.modules_done.length}/${p.total_modules}`],
      ['🏅', 'SKOR TERBAIK', p.best_quiz_percent === null ? '—' : `${p.best_quiz_percent}%`],
    ];
    statsBox.replaceChildren(...tiles.map(([icon, label, value]) => h('div', { class: 'stat-tile' },
      h('div', { class: 't-icon', 'aria-hidden': 'true' }, icon), h('div', { class: 't-label' }, label), h('div', { class: 't-value' }, String(value)))));
    const earned = new Set(p.badges);
    badgeBox.replaceChildren(...state.content.badges.map((b) => h('div', {
      class: `badge-card ${earned.has(b.id) ? 'earned' : ''}`,
      'aria-label': `${b.name}: ${earned.has(b.id) ? 'sudah didapat' : 'belum'}`,
    }, h('div', { class: 'b-icon', 'aria-hidden': 'true' }, b.icon), h('b', {}, b.name), h('small', {}, b.desc))));
    const pending = pendingCount();
    pendingNote.textContent = pending ? `${pending} aktivitas menunggu dikirim (akan terkirim otomatis saat online).` : '';
  };

  const loadHistory = async () => {
    try {
      const data = await api('/history?limit=30');
      historyBox.replaceChildren(...(data.items.length
        ? data.items.map((item) => h('div', { class: 'activity-item' },
          h('b', {}, activityLabel(item)),
          h('span', {}, formatDate(item.created_at), item.xp ? h('span', { class: 'xp' }, `+${item.xp} XP`) : null)))
        : [h('p', { class: 'muted' }, 'Belum ada aktivitas. Mulai belajar untuk mengisi riwayatmu!')]));
    } catch (e) {
      historyBox.replaceChildren(h('p', { class: 'muted' }, 'Riwayat belum bisa dimuat (sedang offline?). Coba lagi nanti.'));
    }
  };

  const exportData = async (btn) => {
    btn.disabled = true;
    try {
      const data = await api('/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: `persegi-go-data-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Data berhasil diekspor.');
    } catch (e) {
      toast('Ekspor gagal. Pastikan kamu online.');
    } finally {
      btn.disabled = false;
    }
  };

  // Hapus akun dengan konfirmasi di halaman (tanpa dialog browser)
  const deleteZone = h('div', { class: 'danger-zone' });
  const drawDelete = (confirming = false) => {
    if (!confirming) {
      deleteZone.replaceChildren(h('button', { class: 'link-button', type: 'button', style: { color: 'var(--orange)' }, onclick: () => drawDelete(true) }, 'Hapus akun & semua data…'));
      return;
    }
    const input = h('input', { class: 'text-input', id: 'confirm-delete', autocomplete: 'off', placeholder: 'HAPUS' });
    const btn = h('button', { class: 'btn btn-danger', type: 'button' }, 'Hapus permanen');
    btn.addEventListener('click', async () => {
      if (input.value.trim().toUpperCase() !== 'HAPUS') { toast('Ketik HAPUS untuk konfirmasi.'); return; }
      btn.disabled = true;
      try {
        await api('/me', { method: 'DELETE' });
        toast('Data akun sudah dihapus.');
        logoutHandler?.();
      } catch (e) {
        btn.disabled = false;
        toast('Gagal menghapus. Pastikan kamu online.');
      }
    });
    deleteZone.replaceChildren(
      h('p', { class: 'small' }, h('b', {}, 'Semua XP, lencana, dan riwayat akan dihapus permanen. '), 'Ketik HAPUS untuk melanjutkan.'),
      h('label', { for: 'confirm-delete', class: 'sr-only' }, 'Ketik HAPUS'),
      input,
      h('div', { class: 'btn-row', style: { marginTop: '10px' } }, btn,
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => drawDelete(false) }, 'Batal')));
  };
  drawDelete();

  const u = state.user;
  const exportBtn = h('button', { class: 'btn btn-ghost', type: 'button' }, '⬇ Ekspor data');
  exportBtn.addEventListener('click', () => exportData(exportBtn));

  root.replaceChildren(
    h('div', { class: 'page-head' },
      h('span', { class: 'eyebrow' }, 'Dashboard pencapaian'),
      h('h1', {}, 'Jejak petualanganmu'),
      h('p', {}, 'Perkembangan belajarmu tersimpan di akunmu dan bisa dibuka dari perangkat mana pun.')),
    statsBox,
    pendingNote,
    h('section', { class: 'card', style: { marginTop: '18px' } },
      h('div', { class: 'card-title-row' },
        h('div', {}, h('span', { class: 'eyebrow' }, 'Lencana'), h('h2', { style: { margin: 0 } }, 'Koleksi pencapaian')),
        h('span', { 'aria-hidden': 'true', style: { fontSize: '22px' } }, '🏅')),
      badgeBox),
    h('section', { class: 'card' }, h('h2', {}, 'Riwayat aktivitas'), historyBox),
    h('section', { class: 'card' },
      h('h2', {}, 'Akun'),
      h('p', {}, h('b', {}, u.name || 'Penjelajah'), h('br'),
        h('span', { class: 'muted' }, `${u.email} · masuk dengan ${u.provider === 'google' ? 'Google' : u.provider === 'dev' ? 'mode uji' : 'email'}`)),
      h('div', { class: 'btn-row' },
        exportBtn,
        isStandalone() ? null : h('button', { class: 'btn btn-soft', type: 'button', onclick: promptInstall }, '＋ Pasang aplikasi'),
        h('button', { class: 'btn btn-purple', type: 'button', onclick: () => logoutHandler?.() }, 'Keluar')),
      deleteZone),
  );

  drawStats();
  loadHistory();
  return subscribe(drawStats);
}
