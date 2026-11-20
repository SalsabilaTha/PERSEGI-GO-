# ARSITEKTUR — Rancangan Teknis PERSEGI GO!

## 1. Gambaran Umum

```
 HP / Laptop (PWA)                     Vercel (HTTPS)                 Supabase
┌────────────────────┐   HTML/CSS/JS  ┌──────────────────┐  SQL     ┌────────────────┐
│ frontend (JS)      │◄──────────────►│ Flask (Python)   │◄────────►│ PostgreSQL     │
│ - service worker   │   /api + JWT   │ - static files   │          │ (RLS aktif)    │
│ - outbox offline   │                │ - REST API       │          ├────────────────┤
│ - supabase-js ─────┼──── login ────────────────────────────────►│ Auth (email +  │
└────────────────────┘                │ - verifikasi JWT │◄─ JWKS ──│ kata sandi)    │
                                      └──────────────────┘          └────────────────┘
```

- **Login** dilakukan browser langsung ke **Supabase Auth** (supabase-js).
- Browser mendapat **access token (JWT)** dan mengirimnya ke Flask di header `Authorization`.
- **Flask** memverifikasi JWT, lalu membaca/menulis database **Supabase Postgres**.
- Browser **tidak** membaca tabel database secara langsung.

## 2. Teknologi

| Bagian | Pilihan |
|---|---|
| Backend | Python 3.11+, **Flask 3**, **SQLAlchemy 2 (Core)**, **psycopg 3** (driver Postgres), **PyJWT[crypto]**, python-dotenv |
| Database | Supabase PostgreSQL (koneksi *Session pooler*, port 5432) |
| Auth | Supabase Auth: Email/Password saja, konfirmasi email aktif |
| Frontend | HTML, CSS, JS ES Modules; `supabase-js` v2 (UMD, versi dikunci, dari jsDelivr) |
| PWA | manifest + service worker + ikon PNG |
| Tes | pytest (SQLite in-memory + JWT uji) |
| Hosting | Vercel (fungsi serverless Python, paket Hobby gratis), deploy otomatis dari GitHub |

`requirements.txt` (rencana):
```
flask
sqlalchemy
psycopg[binary]
pyjwt[crypto]
python-dotenv
pillow        # hanya untuk scripts/make_icons.py
pytest
```
Versi dikunci (`==`) saat implementasi. Untuk pengembangan lokal disarankan **Python 3.12**
supaya semua wheel tersedia.

## 3. Struktur Folder

```
/
├── app.py                    # python app.py → server pengembangan
├── requirements.txt
├── .env.example              # contoh variabel lingkungan (tanpa nilai rahasia)
├── vercel.json               # konfigurasi deploy Vercel
├── api/index.py              # titik masuk Flask untuk Vercel
├── backend/
│   ├── __init__.py           # create_app(): daftar blueprint, route statis, /config.js, /sw.js
│   ├── config.py             # baca env var
│   ├── db.py                 # engine SQLAlchemy, helper query
│   ├── schema.sql            # DDL tabel + RLS (dijalankan di SQL Editor Supabase)
│   ├── auth.py               # verify_token(), @login_required
│   ├── api.py                # blueprint /api
│   ├── gamification.py       # aturan XP, level, lencana
│   └── geometry.py           # rumus (cermin core/geometry.js) untuk validasi konten
├── frontend/
│   ├── index.html            # kerangka SPA (header, nav, <main>)
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── css/  tokens.css · base.css · layout.css · components.css
│   ├── js/
│   │   ├── main.js           # inisialisasi: cek sesi → login atau aplikasi
│   │   ├── router.js         # hash router (#/beranda, #/materi/m1, …)
│   │   ├── supabaseClient.js # createClient dari window.APP_CONFIG
│   │   ├── auth.js           # loginEmail, signUp, resetPassword, logout, getToken
│   │   ├── api.js            # fetch ke /api dengan token; tangani 401
│   │   ├── outbox.js         # antrean aktivitas offline + sinkron
│   │   ├── install.js        # beforeinstallprompt + petunjuk iOS
│   │   ├── state.js          # cache progres di memori untuk header XP
│   │   ├── core/  geometry.js · checker.js · hints.js
│   │   ├── components/       # fungsi pembuat elemen (lihat DESAIN.md §5)
│   │   └── pages/  login.js · beranda.js · materi.js · eksplorasi.js · kuis.js · latihan.js · progres.js
│   └── assets/  icons/ (PNG) · img/
├── content/                  # dibaca Flask & disajikan ke frontend
│   ├── modules.json · quiz.json · problems.json · badges.json
├── scripts/
│   ├── make_icons.py         # buat ikon PNG 192/512/maskable/apple-touch dengan Pillow
│   └── backup_db.py          # ekspor semua tabel ke CSV/JSON
└── tests/
    ├── conftest.py           # app tes, SQLite in-memory, pembuat JWT uji
    ├── test_api.py · test_auth.py · test_gamification.py · test_content.py
```

## 4. Alur Login

```
Siswa           Browser (auth.js)            Supabase Auth          Flask
  │ buka app ──►│ getSession()                     │                   │
  │             │── tidak ada sesi ─► tampil Login │                   │
  │ isi email ─►│ signInWithPassword(email, pw) ──►│                   │
  │             │◄── sesi (access_token, refresh) ─│                   │
  │             │ GET /api/me  Authorization: Bearer <JWT> ───────────►│ verifikasi JWT
  │             │                                                      │ upsert users
  │             │◄──────────────────────────── profil + progres ───────│
  │◄ Beranda ───│                                                      │
```
- Email: `signUp({email, password, options:{data:{name}}})` → email konfirmasi →
  `signInWithPassword`. Lupa: `resetPasswordForEmail` → halaman `#/reset` untuk kata sandi baru.
- supabase-js menyimpan dan me-refresh sesi otomatis, sehingga siswa tidak perlu login ulang.
- Jika API mengembalikan 401, `api.js` mencoba refresh sesi sekali; jika gagal, kembali ke Login.

### Verifikasi JWT di Flask (`backend/auth.py`)
```python
jwks = PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")  # di-cache

def verify_token(token: str) -> dict:
    header = jwt.get_unverified_header(token)
    if header["alg"] == "HS256":                       # proyek legacy
        key = SUPABASE_JWT_SECRET
    else:                                              # ES256/RS256 (signing keys baru)
        key = jwks.get_signing_key_from_jwt(token).key
    return jwt.decode(token, key, algorithms=["HS256", "ES256", "RS256"],
                      audience="authenticated",
                      issuer=f"{SUPABASE_URL}/auth/v1")
```
`@login_required` mengambil `sub`, `email`, `user_metadata.name`, `app_metadata.provider`,
lalu menyimpan user di `g.user` (dibuat otomatis saat pertama kali).

## 5. Database (`backend/schema.sql`)

```sql
create table users (
  id            bigserial primary key,
  supabase_uid  uuid unique not null,
  email         text not null,
  name          text,
  provider      text,                         -- 'email' (atau 'dev' di mode uji)
  created_at    timestamptz default now(),
  last_login    timestamptz default now()
);

create table activities (                     -- riwayat + sumber hitung XP
  id          bigserial primary key,
  user_id     bigint references users(id) on delete cascade,
  client_id   uuid not null,                  -- dibuat di browser → idempoten
  type        text not null,                  -- lesson_done | quiz_done | practice_done | warmup_done
  payload     jsonb not null default '{}',
  xp          int not null default 0,         -- dihitung server
  created_at  timestamptz default now(),
  unique (user_id, client_id)
);

create table module_progress (
  user_id      bigint references users(id) on delete cascade,
  module_id    text not null,
  step_reached int default 0,
  done_at      timestamptz,
  primary key (user_id, module_id)
);

create table quiz_results (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  quiz_id text, score int, total int,
  created_at timestamptz default now()
);

create table practice_attempts (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  problem_id text, tries int, hints_used int,
  errors jsonb default '[]', correct boolean, effort smallint,
  created_at timestamptz default now()
);

-- Browser tidak boleh mengakses tabel ini lewat API Supabase:
alter table users             enable row level security;
alter table activities        enable row level security;
alter table module_progress   enable row level security;
alter table quiz_results      enable row level security;
alter table practice_attempts enable row level security;
-- (tanpa policy = anon/authenticated ditolak; Flask memakai koneksi DB langsung)
```
Pada tes, skema yang sama dibuat di SQLite (tipe disesuaikan oleh SQLAlchemy).

## 6. API

Semua endpoint memerlukan `Authorization: Bearer <access_token>` dan mengembalikan JSON.

| Metode | Path | Isi |
|---|---|---|
| GET | `/api/me` | Profil; membuat/memperbarui user (`last_login`) |
| GET | `/api/progress` | `{xp, level, modules:{m1:{step,done}}, quizzes, best_score, badges:[…]}` |
| POST | `/api/activities` | Body `{activities:[{client_id, type, payload, created_at}]}` (maks 50). Server memvalidasi, menghitung XP, menulis tabel terkait, dan mengabaikan `client_id` duplikat. Respon: progres terbaru + lencana baru |
| GET | `/api/history?limit=20` | Riwayat aktivitas terbaru |
| GET | `/api/export` | Semua data milik user (JSON) |
| DELETE | `/api/me` | Hapus data user di database (akun Supabase Auth dihapus manual oleh admin, dicatat di SETUP_AKUN.md) |

Route non-API:
- `GET /` → `frontend/index.html`; file statis dari `frontend/`
- `GET /sw.js` → service worker dari root (agar scope = seluruh aplikasi)
- `GET /config.js` → `window.APP_CONFIG = {supabaseUrl, supabaseAnonKey}` dari env var
- `GET /content/<file>.json` → konten pelajaran (publik, di-cache SW)

### Validasi payload (contoh)
| type | payload | Aturan |
|---|---|---|
| `lesson_done` | `{module_id}` | module_id harus ada di `modules.json` |
| `quiz_done` | `{quiz_id, answers:[idx…]}` | **Server menilai ulang** jawaban dari `quiz.json` (skor tidak dipercaya) |
| `practice_done` | `{problem_id, tries, hints_used, errors[], correct, effort?}` | tries 1–20, effort 1–9 |

Rate limit sederhana: maks 60 request/menit per user (di memori).

## 7. Gamifikasi (`backend/gamification.py`)

Fungsi murni, mudah diuji:
```python
def xp_for(activity_type, payload, already_done) -> int
def level_for(total_xp) -> tuple[int, str]       # (1, "Pemula"), (2, "Penjelajah"), …
def earned_badges(stats) -> list[str]
```
Aturan detail di KONTEN_MATERI.md §7. XP materi hanya diberikan sekali per modul.

## 8. PWA dan Offline

### Manifest
`name: "PERSEGI GO! - Petualangan Matematika"`, `short_name: "PERSEGI GO!"`, `start_url: "/"`,
`display: "standalone"`, `theme_color: "#6258E8"`, `background_color: "#F6F7FC"`, `lang: "id"`,
ikon PNG 192, 512, dan 512 maskable. Di `index.html` ada `<link rel="apple-touch-icon">` (180 px)
dan `<meta name="apple-mobile-web-app-capable">`.

### Service worker (`sw.js`)
- **Precache** saat install: `index.html`, CSS, JS, ikon, `config.js`, `content/*.json`,
  `supabase-js` dari CDN.
- **Strategi:** file aplikasi = *stale-while-revalidate*; Google Fonts = *cache-first*;
  **`/api/*` dan domain Supabase tidak pernah di-cache**.
- Versi cache dinaikkan setiap rilis (`persegi-go-v{N}`); cache lama dihapus saat `activate`.

### Outbox (`outbox.js`)
```
recordActivity(type, payload):
    item = {client_id: crypto.randomUUID(), type, payload, created_at: now}
    simpan ke localStorage['persegi.outbox.<uid>']
    perbarui tampilan secara optimis (XP sementara)
    flush()

flush():  dipanggil saat login, event 'online', setiap 30 detik bila ada antrean
    jika offline atau antrean kosong → selesai
    POST /api/activities (maks 50)
    jika sukses → hapus item terkirim, terapkan progres dari server
    jika gagal jaringan → coba lagi nanti (tidak hilang)
```
Karena `client_id` unik, pengiriman ulang tidak menggandakan data.

### Instal
- `install.js` menangkap `beforeinstallprompt`, lalu tombol ＋ memanggil `prompt()`.
- iOS (deteksi Safari iOS & bukan standalone) → tampilkan `InstallSheet` berisi petunjuk.
- Jika sudah standalone, tombol ＋ disembunyikan.

## 9. Logika Inti Frontend

- `core/geometry.js`: `area(s)`, `perimeter(s)`, `sideFromArea(l)` (kuadrat sempurna saja),
  `sideFromPerimeter(k)`.
- `core/checker.js`: cek angka + satuan, deteksi kode miskonsepsi (KONTEN_MATERI.md §6), dengan
  urutan: benar → satuan salah → pola miskonsepsi → umum.
- `core/hints.js`: tries 1 → umpan balik spesifik; 2 → petunjuk tahap; 3 → penyelesaian bertahap;
  ≥ 4 → soal kembar.

## 10. Keamanan dan Privasi

- HTTPS (Vercel). Header keamanan: `Content-Security-Policy` (izinkan self, jsDelivr, fonts,
  `*.supabase.co`), `X-Content-Type-Options`, `Referrer-Policy`.
- Rahasia hanya di Environment Variables Vercel; `.env` masuk `.gitignore`.
- Setiap query difilter `user_id = g.user.id`.
- Input divalidasi; ukuran body dibatasi (`MAX_CONTENT_LENGTH = 64 KB`).
- Log server tidak mencatat token atau email.

## 11. Pengujian

| Tes | Isi |
|---|---|
| `test_content.py` | Semua jawaban `problems.json` & `quiz.json` sesuai `geometry.py`; id unik; satuan valid |
| `test_gamification.py` | XP per jenis aktivitas, XP materi tidak dobel, ambang level, lencana |
| `test_auth.py` | Token valid diterima; token kedaluwarsa/aud salah/tanpa token → 401 |
| `test_api.py` | Alur me → activities → progress → history; idempotensi `client_id`; kuis dinilai ulang server; user A tidak bisa melihat data user B |

JWT uji ditandatangani kunci HS256 tes melalui `SUPABASE_JWT_SECRET` tes.

Manual: Lighthouse (PWA installable), uji 360 px, uji offline (mode pesawat), uji 2 perangkat.

## 12. Deploy (ringkas; detail di SETUP_AKUN.md)

**Vercel (serverless).** `vercel.json` mengarahkan semua path ke `api/index.py` (Flask),
region `sin1` (dekat Supabase Singapura), `maxDuration` 60 detik (panggilan Gemini ≤ 25 detik),
`includeFiles` untuk `backend/`, `frontend/`, `content/`. Saat env `VERCEL` ada,
`make_engine(serverless=True)` memakai `NullPool` + `prepare_threshold=None`; `DATABASE_URL`
memakai Supabase Transaction pooler (6543). Batas tutor tersimpan di DB (aman lintas instance);
batas umum 60 request/menit di `auth.py` bersifat per-instance.

1. Jalankan `schema.sql` di SQL Editor Supabase.
2. Push ke GitHub → impor repo di Vercel (Framework Preset: Other).
3. Isi Environment Variables di Vercel. Tambahkan URL `*.vercel.app` ke *Redirect URLs* Supabase.
4. Buka URL HTTPS di HP → instal.

## 13. Tutor AI (Gemini) dan RMT

```
Browser (tutorPanel.js) ──POST /api/tutor──► Flask (api.py) ──► tutor.py ──HTTPS──► Gemini
   {mode, problem_id, stage,                  validasi, batas        build_messages()     /chat/completions
    error_code, hint_level,                   20/10 menit            (prompt RMT+CLT,     model gemini-3.8-flash
    student_input, message,                                           tanpa identitas)
    history≤8}                    ◄── {reply, phase, source} ── leaks_answer() → fallback_reply()
                                       simpan ke tutor_messages
```

| Bagian | Isi |
|---|---|
| `backend/tutor.py` | `SYSTEM_PROMPT` (RMT + CLT), `build_messages`, `call_gemini` (urllib, timeout 25 s, `max_tokens` 1024, `reasoning_effort` low), `leaks_answer`, `fallback_reply`, `phase_for` |
| `POST /api/tutor` | mode `hint` (latihan), `chat` (menu Tutor), `reflect` (tahap 6). Balasan `{reply, phase, source}` dengan `source` = `ai` atau `fallback` |
| `GET /api/tutor/history?problem_id=` | riwayat percakapan siswa sendiri (30 terakhir) |
| Tabel `tutor_messages` | `user_id, problem_id, mode, stage, phase, role, content, source, created_at`. RLS aktif. Ikut ekspor & hapus akun |
| Konfigurasi | `GEMINI_API_KEY` (rahasia), `GEMINI_MODEL` (bawaan `gemini-3.8-flash`), `GEMINI_BASE_URL` (bawaan `https://generativelanguage.googleapis.com/v1beta/openai`) |
| Frontend | `components/tutorPanel.js`, `pages/tutor.js` (`#/tutor`), tombol bulat di Materi/Eksplorasi/Kuis |

**Diagnosis fase RMT** (`phase_for`): tahap 0 → input; tahap 1–3 → elaborasi; tahap 4 → output;
tahap 5/`reflect` → refleksi. Kode kesalahan mengoreksi fase, misalnya `WRONG_MARKING` → input dan
`WRONG_UNIT` → output.

**Penjaga jawaban**: aktif untuk mode hint/chat pada soal yang tahapnya < 4. Bila balasan memuat
"angka jawaban + satuan" atau "= angka jawaban", balasan diganti petunjuk bawaan.
