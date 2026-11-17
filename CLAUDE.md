# CLAUDE.md — Panduan Kerja untuk Asisten AI

File ini dibaca otomatis oleh Claude Code setiap sesi. Isinya aturan dan konteks
yang **wajib** diikuti saat menulis kode untuk proyek ini.

## 1. Ringkasan Proyek

**Nama aplikasi:** **PERSEGI GO!**: Petualangan Matematika
**Pemilik:** Salsabila Thahira (NIM 2225250214), S1 Pendidikan Matematika, kelas 3B
**Mata kuliah:** Algoritma Pemrograman (AlPro)

Aplikasi web pembelajaran **Bangun Datar Persegi** (SMP kelas 7, juga untuk remedial kelas 8).
Ciri utama:
- **Wajib login** (email + kata sandi; email apa pun, termasuk Gmail & iCloud) memakai **Supabase Auth**.
  Semua aktivitas dan riwayat tersimpan di database dan terhubung ke akun.
- **Bisa dipasang di HP tanpa Play Store/App Store** sebagai **PWA**.
- Dibangun dengan **Python (backend Flask)** dan **JavaScript (frontend)**.
- Tujuan pedagogis: **mengelola beban kognitif** (Cognitive Load Theory) supaya
  **literasi matematika** siswa meningkat, berdasarkan wawancara siswa S01 (06/11/2026).
- Model pembelajaran **Rigorous Mathematical Thinking (RMT)** (Kinard & Kozulin): fase
  Input → Elaborasi → Output, mediasi (MLE), alat psikologis, dan refleksi. Lihat §10.
- **Tutor AI "Kak Tutor" (Gemini)** membimbing proses berpikir siswa tanpa memberi jawaban akhir.

## 2. Dokumen yang Harus Dibaca Sebelum Mengoding

| Dokumen | Isi |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Kebutuhan produk, fitur F1–F15, keterlacakan ke data wawancara |
| [docs/DESAIN.md](docs/DESAIN.md) | Design system PERSEGI GO!, layout, wireframe tiap layar, aturan CLT |
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | Stack, struktur folder, API, database, auth, PWA, offline |
| [docs/KONTEN_MATERI.md](docs/KONTEN_MATERI.md) | Materi, kuis, bank soal, miskonsepsi, XP & lencana |
| [docs/SETUP_AKUN.md](docs/SETUP_AKUN.md) | Langkah membuat akun Supabase, GitHub, Vercel (Render cadangan) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Tahapan pengerjaan dan checklist |

Kalau ada pertentangan: **PRD > DESAIN > ARSITEKTUR**. Tanyakan ke pengguna bila ragu.

## 3. Stack dan Batasan Teknis

| Lapisan | Teknologi |
|---|---|
| Backend | **Python 3.11+ + Flask**, SQLAlchemy (Core), PyJWT, gunicorn (produksi) |
| Database | **Supabase PostgreSQL** (produksi & pengembangan); **SQLite in-memory** untuk tes |
| Auth | **Supabase Auth** (Email/Password saja) via `supabase-js` v2 |
| Frontend | **HTML + CSS + JavaScript ES Modules**, tanpa framework, tanpa npm, tanpa build tool |
| PWA | `manifest.webmanifest` + `sw.js` + ikon PNG |
| Hosting | **Vercel** (fungsi serverless Python, `api/index.py` + `vercel.json`, region `sin1`); **Render** (`render.yaml`) sebagai cadangan |
| Tutor AI | **Gemini** `gemini-3.8-flash` (API kompatibel OpenAI), dipanggil **hanya dari Flask** (`backend/tutor.py`, `urllib` bawaan) |

Aturan:
- Flask melayani **frontend statis dan API dari satu domain** (tanpa CORS).
- Browser **tidak pernah** mengakses tabel database secara langsung. Semua data lewat API Flask.
  Tabel di Supabase memakai **RLS aktif tanpa policy**.
- CDN yang diizinkan **hanya**: `supabase-js` (versi dikunci, dari `cdn.jsdelivr.net`) dan
  Google Fonts (Nunito, DM Sans) dengan fallback font sistem. Keduanya ikut di-cache service worker.
- Tutor AI hanya Gemini lewat server; tidak ada SDK/library AI tambahan. Aturan lengkap di §10.
- Login **hanya email + kata sandi**. Tidak ada login Google (dihapus atas permintaan pemilik)
  maupun Sign in with Apple (berbayar).

## 4. Rahasia dan Keamanan

- Semua rahasia ada di `.env` (lihat `.env.example`) dan **tidak boleh di-commit**:
  `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (cadangan legacy), `FLASK_SECRET_KEY`, `GEMINI_API_KEY`.
- Frontend hanya boleh berisi `SUPABASE_URL` dan **kunci `anon`/publishable**. Keduanya disajikan
  lewat `GET /config.js` dari Flask, bukan ditulis langsung di file.
- Kunci **`service_role` tidak boleh dipakai** di mana pun di frontend.
- Setiap endpoint `/api/*` memakai decorator `@login_required` (verifikasi JWT Supabase).
- XP dan lencana **dihitung di server**, jangan percaya angka dari browser.
- Validasi semua input API (tipe, panjang, nilai yang diizinkan).
- Data siswa adalah data anak di bawah umur: jangan di-log, jangan dikirim ke pihak ketiga.

## 5. Konvensi Kode

- **Nama variabel/fungsi:** bahasa Inggris. Python memakai `snake_case`, JS memakai `camelCase`.
- **Komentar dan docstring:** bahasa Indonesia, singkat, menjelaskan *mengapa*.
- **Teks yang tampil ke siswa:** bahasa Indonesia sederhana untuk siswa SMP. Konten pelajaran
  disimpan di `content/*.json`, bukan ditulis di dalam logika.
- Logika matematika dibuat sebagai **fungsi murni**: `frontend/js/core/*.js` (untuk umpan balik
  instan dan offline) dan `backend/geometry.py` (untuk validasi konten & tes). Keduanya harus konsisten.
- Hindari `innerHTML` untuk data. Pakai `textContent` atau buat elemen.
- Python: format PEP 8, type hints pada fungsi publik. JS: 2 spasi, titik koma, kutip tunggal.

## 6. Desain: Ikuti Desain PERSEGI GO!

Pemilik memilih **mengikuti desain screenshot secara persis** (ungu, sidebar, hero, XP, lencana).
Detailnya ada di DESAIN.md. Prinsip beban kognitif dari wawancara **tetap wajib** di halaman
**Materi** dan **Latihan**:

1. Satu kartu = satu ide, ≤ 3 kalimat pendek.
2. Label menempel pada gambar (sisi "7 cm" di samping garisnya).
3. Penjelasan bertahap; siswa menekan "Lanjut" sendiri; selalu ada tombol **Ulangi**.
4. Bantuan bertingkat setelah jawaban salah; umpan balik menyebut kesalahan spesifik.
5. Satuan wajib dicek (cm vs cm²).
6. Semua animasi dimatikan saat `prefers-reduced-motion: reduce`.
7. Hiasan bergerak (sparkle, kotak melayang) **hanya di hero Beranda**, tidak di halaman belajar.

## 7. Ketepatan Matematika

- Notasi: `s` = sisi, `L = s × s = s²`, `K = 4 × s`, `s = √L`, `s = K ÷ 4`.
- Tampilkan pangkat dan akar dengan `²`, `√`, atau `<sup>`, jangan `^`.
- Satuan panjang: cm, m. Satuan luas: cm², m².
- Soal mencari sisi dari luas hanya memakai **kuadrat sempurna** (1–400) pada v1.
- Setiap soal di `content/` divalidasi oleh `tests/test_content.py`.

## 8. Cara Menjalankan

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows (bash: source .venv/Scripts/activate)
pip install -r requirements.txt
copy .env.example .env          # lalu isi nilainya (lihat docs/SETUP_AKUN.md)
python app.py                   # buka http://localhost:5000
pytest                          # jalankan semua tes
```

Tanpa `.env` (SUPABASE_URL kosong, APP_ENV bukan production) aplikasi berjalan dalam **mode uji
lokal**: login memakai nama + email bebas lewat `/api/dev-login`, dan database adalah SQLite di
`instance/persegi.db`. Mode ini otomatis mati di production.

Uji instal PWA di HP memerlukan HTTPS, jadi gunakan URL hasil deploy Vercel.
Di Vercel (env `VERCEL` terisi otomatis) koneksi database memakai `NullPool`; `DATABASE_URL`
harus memakai Supabase **Transaction pooler (port 6543)**. Jangan menyimpan state penting di
memori proses (instance serverless berumur pendek); simpan di database.
Setiap kali file frontend berubah, naikkan `VERSION` di `frontend/sw.js` agar cache diperbarui.

## 9. Yang TIDAK Boleh Dilakukan

- Menambahkan framework frontend, bundler, atau npm.
- Menambahkan dependensi Python di luar `requirements.txt` tanpa izin.
- Mengakses Supabase database langsung dari browser, atau memakai kunci `service_role` di frontend.
- Menambahkan fitur di luar PRD (leaderboard, chat antarsiswa) tanpa bertanya.
- Meng-commit `.env`, kredensial, atau data siswa.

## 10. Tutor AI (Gemini) dan Model RMT

**Pemetaan RMT ke aplikasi** (detail: docs/KONTEN_MATERI.md §11):
- Latihan: **Input** (1. Pahami) → **Elaborasi** (2. Rencanakan, 3. Masukkan angka, 4. Hitung) →
  **Output** (5. Periksa) → **Refleksi** (6). Label fase tampil di `stageBar` (`components/visuals.js`).
- Materi: kartu **Tujuan & Makna** (konsep sehari-hari → konsep ilmiah) di awal dan kartu
  **Transendensi** ("berlaku untuk semua persegi") di akhir. Data di `content/modules.json`
  (`goal`, `everyday`, `meaning`, `transcend`, wajib ada, dicek `tests/test_content.py`).
- Alat psikologis: kotak Diketahui/Ditanya bersimbol, tabel kuadrat, tabel s–K–L, grid.
- Hindari trial-and-error: Tebak Sisinya meminta perkiraan dulu (patokan 10 × 10 = 100).

**Aturan Tutor AI (wajib):**
1. `GEMINI_API_KEY` hanya di server (`.env` / Environment Variables Vercel). `/config.js` hanya mengirim `aiEnabled`.
2. **Jangan pernah kirim identitas siswa** (nama, email, id) ke Gemini. Hanya soal, tahap,
   kode kesalahan, isian, dan percakapan.
3. Tutor **tidak memberi jawaban akhir**. System prompt di `backend/tutor.py` (`SYSTEM_PROMPT`)
   + penjaga `leaks_answer()` (aktif untuk tahap < 4). Jangan melemahkan keduanya.
4. Selalu ada **fallback** (`fallback_reply`) bila tidak ada kunci, offline, atau error. Aplikasi
   harus tetap bisa dipakai tanpa AI.
5. Balasan pendek (≤ 3 kalimat, 1 pertanyaan) agar beban kognitif rendah; bahasa SMP.
6. Batas 20 pertanyaan / 10 menit / siswa (biaya API). Percakapan disimpan di `tutor_messages`
   (tanpa identitas) dan ikut terhapus saat akun dihapus.
7. Tes **tidak boleh** memanggil Gemini sungguhan: `conftest.py` mengosongkan kunci, dan
   `test_tutor.py` me-mock `tutor.call_gemini`.
