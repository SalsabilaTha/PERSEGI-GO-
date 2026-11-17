# SETUP AKUN — Supabase, GitHub, dan Render

Panduan ini dikerjakan **sendiri oleh Salsabila** (butuh login ke akun pribadi). Semua layanan
gratis. Catat nilai-nilai yang ditandai 📋 karena akan diisi ke file `.env`.

> Jangan pernah membagikan **Database password**, **JWT secret**, atau kunci **service_role**
> ke orang lain atau menaruhnya di GitHub.

---

## 1. Supabase: Proyek dan Database

1. Buka https://supabase.com → **Start your project** → daftar (boleh memakai akun GitHub).
2. **New project**
   - Name: `persegi-go`
   - Database password: buat yang kuat 📋 (simpan di tempat aman)
   - Region: **Southeast Asia (Singapore)**
3. Tunggu proyek siap (±2 menit).
4. **Project Settings → API**, lalu catat:
   - Project URL 📋 → `SUPABASE_URL` (contoh `https://abcd1234.supabase.co`)
   - Kunci **anon / publishable** 📋 → `SUPABASE_ANON_KEY` (aman untuk browser)
   - **JWT Secret** (bagian JWT Settings / legacy) 📋 → `SUPABASE_JWT_SECRET`
5. **Connect** (tombol di atas) → tab **Session pooler** → salin URI 📋 → `DATABASE_URL`.
   Ganti `[YOUR-PASSWORD]` dengan password database. Ubah awalan menjadi
   `postgresql+psycopg://` agar dipakai SQLAlchemy.
6. (Opsional) Tabel dibuat otomatis oleh Flask saat pertama kali dijalankan. Jika ingin membuatnya
   manual: **SQL Editor** → tempel isi `backend/schema.sql` → **Run**. Cek di **Table Editor**:
   tabel `users`, `activities`, dll. muncul dengan label RLS aktif.

## 2. Supabase: Login Email

1. **Authentication → Sign In / Providers → Email**: pastikan aktif.
2. Aktifkan **Confirm email**.
3. **Authentication → Email Templates** (opsional): terjemahkan email konfirmasi dan reset
   kata sandi ke bahasa Indonesia.
4. Catatan: email bawaan Supabase dibatasi beberapa email per jam. Untuk uji coba kelas
   besar, atur SMTP sendiri (misal Gmail App Password atau Brevo) di **Project Settings → Auth → SMTP**.

## 3. Supabase: Hanya Login Email

Aplikasi hanya memakai login **email + kata sandi**. Di **Authentication → Sign In / Providers**,
biarkan Google dan provider lain **tidak aktif**, supaya tidak ada jalur login lain selain email.

## 4. Supabase: URL Aplikasi

**Authentication → URL Configuration**
- Site URL: `https://<nama-app>.onrender.com` (sementara bisa `http://localhost:5000`)
- Redirect URLs (tambahkan semua):
  - `http://localhost:5000/**`
  - `https://<nama-app>.onrender.com/**`

## 5. File `.env` Lokal

Salin `.env.example` menjadi `.env`, lalu isi:
```
APP_ENV=development
SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_JWT_SECRET=...
DATABASE_URL=postgresql+psycopg://postgres.abcd1234:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
DEEPSEEK_API_KEY=sk-...
FLASK_SECRET_KEY=isi-acak-panjang
```
Lalu jalankan `python app.py`, buka http://localhost:5000, dan coba daftar + login.

## 5b. DeepSeek (Tutor AI)

1. Buka https://platform.deepseek.com → daftar/masuk.
2. **Top up** saldo (layanan berbayar per pemakaian; biaya per pertanyaan sangat kecil, tetapi
   tetap pantau saldo).
3. **API keys → Create new API key** → beri nama `persegi-go` → salin kunci `sk-...` 📋.
   Kunci hanya ditampilkan sekali.
4. Isi `DEEPSEEK_API_KEY=sk-...` di `.env` (lokal) dan di **Environment** Render (produksi).
5. Jalankan aplikasi, buka **Tutor AI**, lalu tanyakan sesuatu. Subjudul panel harus menampilkan
   "Pembimbing berpikir…", bukan "Mode petunjuk bawaan".

> Kunci DeepSeek bersifat RAHASIA. Jangan menaruhnya di file frontend atau GitHub. Bila kunci
> kosong atau saldo habis, aplikasi otomatis memakai petunjuk bawaan.

## 6. GitHub

1. Buat akun di https://github.com dan repository baru `persegi-go` (boleh *private*).
2. Pastikan `.gitignore` berisi `.env`, `.venv/`, `__pycache__/`.
3. Unggah kode (lewat VS Code: Source Control → Publish to GitHub).

## 7. Render (Hosting)

1. Buka https://render.com → daftar dengan GitHub.
2. **New → Web Service** → pilih repo `persegi-go`.
   - Region: **Singapore** (dekat dengan database Supabase)
   - Runtime: **Python 3**
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn "backend:create_app()"`
   - Instance type: **Free**
3. **Environment** → tambahkan semua variabel dari `.env` (kecuali yang khusus lokal), serta
   `PYTHON_VERSION=3.12.7`.
4. **Deploy**. Setelah selesai, Anda mendapat URL `https://<nama-app>.onrender.com`.
5. Kembali ke **Supabase §4**, lalu pastikan URL ini sudah terdaftar (tautan verifikasi dan
   atur ulang kata sandi di email akan mengarah ke sini).

Catatan: layanan gratis Render **tertidur setelah 15 menit** tanpa pengunjung, sehingga akses
pertama setelahnya lambat (±30–60 detik). Aplikasi tetap tampil dari cache; data dikirim saat server bangun.

## 8. Uji Instal di HP

### Android (Chrome)
1. Buka `https://<nama-app>.onrender.com`.
2. Tekan tombol **＋** di header, atau menu ⋮ → **Instal aplikasi**.
3. Ikon PERSEGI GO! muncul di layar utama.

### iPhone (Safari, iOS 16.4+)
1. Buka URL di **Safari** (bukan Chrome).
2. Tekan **Share** (kotak dengan panah ke atas) → **Add to Home Screen** → **Add**.

### Laptop (Chrome/Edge)
Klik ikon instal di bilah alamat.

### (Opsional) Membuat APK tanpa Play Store
1. Buka https://www.pwabuilder.com → masukkan URL aplikasi.
2. **Package for stores → Android** → unduh paket APK.
3. Bagikan file APK; siswa memasangnya dengan mengizinkan "Instal dari sumber tidak dikenal".

## 9. Pemeliharaan

- **Supabase gratis dijeda setelah ±7 hari tanpa aktivitas.** Jika dijeda, buka dashboard →
  **Restore project**. Data tidak hilang.
- **Backup:** jalankan `python scripts/backup_db.py` secara berkala (misal setiap minggu selama
  uji coba). Atau gunakan **Table Editor → Export to CSV**.
- **Melihat data siswa (peneliti):** Table Editor → `activities`, `quiz_results`,
  `practice_attempts`.
- **Menghapus akun siswa sepenuhnya:** setelah siswa menekan "Hapus akun" di aplikasi, hapus juga
  user-nya di **Authentication → Users**.
