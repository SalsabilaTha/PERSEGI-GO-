# PERSEGI GO! — Petualangan Matematika

Aplikasi web (PWA) untuk belajar **bangun datar persegi** (SMP kelas VII), dirancang berdasarkan
wawancara siswa dan prinsip **Cognitive Load Theory** untuk meningkatkan literasi matematika.

- **Backend:** Python (Flask) · **Frontend:** JavaScript (tanpa framework)
- **Login:** Supabase (email + kata sandi, termasuk Gmail/iCloud) · **Database:** Supabase PostgreSQL
- **Bisa dipasang di HP** tanpa Play Store / App Store (PWA)

Penyusun: Salsabila Thahira (2225250214), Pendidikan Matematika, kelas 3B.

## Fitur

| Menu | Isi |
|---|---|
| Beranda | Hero, peta petualangan, progres belajar, level |
| Materi | 6 modul bertahap (Kembali / Ulangi / Lanjut), ringkasan "Ingat 3 hal ini", pemanasan prasyarat |
| Eksplorasi | Simulasi slider, **Tebak Sisinya** (akar kuadrat dengan grid), Kalkulator Persegi |
| Kuis & Latihan | Kuis 5 soal (+10 XP/soal) dan 15 soal cerita 5 tahap dengan penanda informasi, deteksi miskonsepsi, dan petunjuk bertingkat |
| Evaluasi & Progres | XP, lencana, riwayat aktivitas, ekspor data, keluar, hapus akun |

## Menjalankan di komputer

```bash
python -m venv .venv
.venv\Scripts\activate            # Windows PowerShell / CMD
pip install -r requirements.txt
python scripts/make_icons.py      # sekali saja, membuat ikon PNG
python app.py                     # buka http://localhost:5000
```

Tanpa file `.env`, aplikasi berjalan dalam **mode uji lokal**: login cukup dengan nama dan email
bebas, dan data disimpan di `instance/persegi.db` (SQLite). Untuk login email sungguhan,
ikuti [docs/SETUP_AKUN.md](docs/SETUP_AKUN.md), lalu isi `.env` (contoh: `.env.example`).

## Tes

```bash
pytest
```
Tes memeriksa rumus, kebenaran semua jawaban bank soal & kuis, aturan XP/lencana, keamanan login,
dan API (termasuk data antar-siswa yang terpisah).

## Memasang di HP

Setelah di-deploy ke Render (alamat `https://…`):
- **Android (Chrome):** tekan tombol **＋** di pojok kanan atas → Instal.
- **iPhone (Safari):** Bagikan → **Tambah ke Layar Utama**.

## Struktur

```
app.py              titik masuk Flask
backend/            API, login (JWT Supabase), database, XP & lencana
frontend/           HTML, CSS, JavaScript, service worker, manifest, ikon
content/            materi, kuis, soal, lencana (JSON, dipakai Python & JS)
scripts/            pembuat ikon, backup database
tests/              pytest
docs/               PRD, desain, arsitektur, konten, setup akun, roadmap
```
