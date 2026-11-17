# ROADMAP — Tahapan Pengerjaan PERSEGI GO!

Centang `[x]` setiap tugas yang selesai. Setiap fase punya kriteria "selesai jika".

## Fase 0 — Perencanaan & Akun
- [x] Wawancara siswa S01 dan matriks analisis
- [x] Dokumen perencanaan v0.2 (CLAUDE.md, PRD, DESAIN, ARSITEKTUR, KONTEN_MATERI, SETUP_AKUN, ROADMAP)
- [ ] Review dokumen bersama dosen pembimbing
- [ ] Buat proyek Supabase, aktifkan login Email (SETUP_AKUN §1–4)
- [ ] Buat akun GitHub & Render (SETUP_AKUN §6–7)
- [ ] Instal Python 3.12 (disarankan untuk kecocokan library)
- **Selesai jika:** semua nilai 📋 sudah tercatat

## Fase 1 — Backend & Login
- [x] Kerangka Flask: `app.py`, `create_app()`, sajikan `frontend/`, `/config.js`, `/sw.js`
- [x] `schema.sql` disiapkan (tabel juga dibuat otomatis oleh Flask)
- [x] `auth.py` (verifikasi JWT) + `test_auth.py`
- [x] API `/api/me`, `/api/progress`, `/api/activities`, `/api/history` + `test_api.py`
- [x] `gamification.py` + `test_gamification.py`
- [x] Halaman Login (email, daftar, lupa kata sandi; login Google dihapus)
- **Selesai jika:** bisa login dengan email di localhost dan baris `users` muncul di Supabase

## Fase 2 — Kerangka UI & PWA
- [x] `tokens.css`, `base.css`, `layout.css` sesuai DESAIN.md
- [x] Header (logo, XP, ＋), sidebar (desktop), bottom nav (HP), router
- [x] Beranda (hero, peta petualangan, progres, kutipan)
- [x] Manifest, ikon PNG (`make_icons.py`), service worker, tombol instal + petunjuk iOS
- [x] Outbox offline
- **Selesai jika:** Lighthouse menyatakan installable; tampilan rapi di 360 px & 1280 px

## Fase 3 — Materi & Eksplorasi
- [x] `content/modules.json` M1–M6
- [x] Halaman Materi (StepCard bertahap, panel Ringkasan, kartu rumus, Tandai selesai) → F3, F5
- [x] Eksplorasi: Simulasi slider → F3
- [x] Eksplorasi: Tebak Sisinya → F1
- [x] Eksplorasi: Kalkulator Persegi → F14
- **Selesai jika:** materi selesai tercatat di server dan XP bertambah

## Fase 4 — Kuis & Latihan Literasi
- [x] Kuis 5 soal + pembahasan + layar hasil; penilaian ulang di server → F13
- [x] `core/checker.js` + kode miskonsepsi
- [x] Latihan cerita 5 tahap: StoryText, KnownAskedBox, FormulaPicker, AnswerInput, Feedback, bantuan bertingkat → F2, F6, F8
- [x] `content/problems.json` + `test_content.py`
- **Selesai jika:** 3 soal pemicu bisa dikerjakan dengan umpan balik yang tepat

## Fase 5 — Progres & Akun
- [x] Halaman "Jejak petualanganmu": statistik, lencana, riwayat → F10, F13
- [x] Keluar, Ekspor data, Hapus akun → F15
- [x] (P1) Pemanasan prasyarat → F4; skala usaha mental
- **Selesai jika:** login di perangkat lain menampilkan data yang sama

## Fase 6 — Deploy & Uji Perangkat
- [ ] Deploy ke Render; isi env var; daftarkan URL di Supabase
- [ ] Instal & uji di 1 Android + 1 iPhone
- [ ] Uji offline (mode pesawat) → online → data tersinkron
- [x] `backup_db.py` dibuat

## Fase 6b — Tutor AI (DeepSeek) & Model RMT
- [x] `backend/tutor.py`: prompt RMT + CLT, panggilan DeepSeek, penjaga jawaban, fallback
- [x] Endpoint `/api/tutor` + `/api/tutor/history`, tabel `tutor_messages`, batas permintaan
- [x] Panel Kak Tutor di latihan, menu Tutor AI, tombol bulat, kartu di Beranda
- [x] Latihan bergaya fase RMT + tahap 6 Refleksi
- [x] Materi: Tujuan & Makna, Transendensi; tabel kuadrat M5; tabel s–K–L; Tebak Sisinya dengan perkiraan
- [x] Tes otomatis (`test_tutor.py`, DeepSeek di-mock)
- [ ] Buat API key DeepSeek & isi saldo (SETUP_AKUN §5b)
- [ ] Uji nyata dengan beberapa soal: tidak membocorkan jawaban, bahasa sesuai SMP
- [ ] Review prompt bersama dosen

## ▶ Fase 7 — Uji Coba Siswa & Evaluasi
- [ ] Izin sekolah/orang tua
- [ ] Pretest → pemakaian aplikasi → posttest
- [ ] Skala usaha mental (Paas) + SUS + observasi (termasuk apakah XP/lencana mengganggu, PRD §7)
- [ ] Perbaikan berdasarkan temuan
- [ ] Laporan: data wawancara → fitur → hasil uji

## Opsional (P2)
- [ ] Gambar Persegi (F7)
- [ ] Refleksi "Jelaskan dengan kata-katamu" (F9)
- [ ] APK melalui PWABuilder
- [ ] Bank kuis acak 15 soal
- [ ] Mode gelap
