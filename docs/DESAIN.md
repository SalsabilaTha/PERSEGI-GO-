# DESAIN — Design System PERSEGI GO!

Acuan visual: screenshot "Desain Aplikasi yg saya ingin kn" (Beranda, Materi, Eksplorasi,
Kuis, Hasil Kuis, Progres, Kalkulator Persegi). Pemilik memilih **mengikuti desain persis**.
Prinsip beban kognitif tetap diterapkan di halaman belajar (lihat §8).

---

## 1. Karakter Visual

- Ceria, bersih, dan "petualangan": warna utama **ungu**, aksen **kuning** untuk tombol aksi.
- Kartu putih membulat (radius 16–20 px), bayangan sangat lembut, latar abu kebiruan muda.
- Label kecil berhuruf kapital (*eyebrow*) di atas judul: `MODUL 01 · KONSEP DASAR`.
- Judul tebal memakai font **Nunito**; isi memakai **DM Sans**.
- Ikon menu berupa emoji berwarna (🏠 📚 🧩 🎯 🏆), sesuai desain.

## 2. Token Warna

| Token | Hex | Dipakai untuk |
|---|---|---|
| `--purple` | `#6258E8` | Brand, menu aktif, judul aksen, progres, angka luas |
| `--purple-dark` | `#4940C8` | Hover/tekan tombol ungu, gradien hero |
| `--purple-soft` | `#F0EFFF` | Latar menu aktif, **kartu Luas**, chip |
| `--yellow` | `#FFC85C` | **Tombol aksi utama** (Mulai belajar, Tandai selesai, Coba lagi) |
| `--yellow-ink` | `#5C3B00` | Teks di atas tombol kuning |
| `--cream` | `#FFF7E9` | Kotak contoh, tips, kutipan, chip XP |
| `--green` | `#20B88A` | **Keliling**, jawaban benar |
| `--green-soft` | `#E8F8F1` | **Kartu Keliling** |
| `--orange` | `#E07A1F` | Jawaban perlu dicek (bukan merah) |
| `--ink` | `#252642` | Teks utama |
| `--muted` | `#6E7090` | Teks sekunder (lebih gelap dari prototipe agar kontras ≥ 4.5:1) |
| `--bg` | `#F6F7FC` | Latar halaman |
| `--surface` | `#FFFFFF` | Kartu, sidebar, header |
| `--line` | `#ECECF5` | Garis batas |
| `--known` | `#FFF1B8` | Sorotan **Diketahui** di soal cerita |
| `--asked` | `#D6E8FF` | Sorotan **Ditanya** di soal cerita |

**Makna tetap:** ungu = **Luas**, hijau = **Keliling** (sesuai kartu rumus di desain).
Jangan ditukar di halaman mana pun.

Hero Beranda: `linear-gradient(135deg, #6E63F0, #4940C8)`, teks putih, sub-judul kuning.

## 3. Tipografi

| Peran | Font | Ukuran HP / desktop | Berat |
|---|---|---|---|
| Judul halaman | Nunito | 26 / 34 px | 900 |
| Judul hero | Nunito | 28 / 40 px | 900 |
| Judul kartu | Nunito | 17 / 18 px | 800 |
| Isi | DM Sans | 16 / 15 px | 400–500 |
| Eyebrow | DM Sans | 11 px, spasi 1.2 px, kapital | 800 |
| Angka rumus/hasil | Nunito | 28–36 px | 900 |

Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Font Google di-cache
service worker supaya tetap tampil offline.

## 4. Layout

### Desktop (≥ 900 px), sesuai screenshot
```
┌───────────────────────────────────────────────────────────────┐
│ ▦ PERSEGI GO!                                   ⭐ 60 XP  [＋]  │  header 72 px
├──────────────┬────────────────────────────────────────────────┤
│ MENU BELAJAR │  EYEBROW                                       │
│ 🏠 Beranda   │  Judul Halaman                                 │
│ 📚 Materi    │  Sub-judul                                     │
│ 🧩 Eksplorasi│  ┌──────────── konten ────────┐ ┌─ panel ─┐    │
│ 🎯 Kuis      │  │                            │ │ ringkas │    │
│ 🏆 Progres   │  └────────────────────────────┘ └─────────┘    │
│              │                                                │
│ ┌Terus     ┐ │                                                │
│ │berlatih! │ │                                                │
│ └──────────┘ │                                                │
└──────────────┴────────────────────────────────────────────────┘
   sidebar 230 px            konten maks ±1100 px
```

### HP (< 900 px)
```
┌──────────────────────────┐
│ ▦ PERSEGI GO!  ⭐60  [＋]  │  header sticky
├──────────────────────────┤
│                          │
│  konten satu kolom       │
│  panel ringkas pindah    │
│  ke bawah konten         │
│                          │
├──────────────────────────┤
│ 🏠   📚   🧩   🎯   🏆    │  bottom nav + safe-area
│Beranda Materi Jelajah Kuis Progres│
└──────────────────────────┘
```

## 5. Komponen

| Komponen | Deskripsi |
|---|---|
| `AppHeader` | Logo ▦ PERSEGI GO!, chip XP (krem, ⭐), tombol ＋ Instal (ungu muda) |
| `SideNav` / `BottomNav` | 5 menu; aktif = latar ungu muda + teks ungu |
| `SidebarCard` | "✦ Terus berlatih!" + kalimat motivasi |
| `Hero` | Gradien ungu, judul 2 baris, tombol kuning "Mulai belajar →", ilustrasi kotak 3D bertuliskan 4, chip "a = a" & "90°", sparkle |
| `JourneyCard` | Kartu bernomor 01/02/03 dengan ikon, judul, sub-judul, panah ↗ |
| `ProgressCard` | Bar progres ungu + teks "x% selesai" |
| `QuoteCard` | Latar krem, tanda kutip kuning, "Misi hari ini" |
| `StepCard` + `StepNav` | Kartu langkah materi + Kembali / ↻ Ulangi / Lanjut |
| `PropertyCard` | Kartu sifat bernomor ①–④ (grid 2 kolom) |
| `FormulaCard` | Luas (ungu muda): **L = s × s**; Keliling (mint): **K = 4 × s** |
| `ExampleBox` | Krem, "💡 Contoh sederhana" |
| `SummaryPanel` | "RINGKASAN · Ingat 3 hal ini" + kotak "🏆 Tips belajar" |
| `SquareSim` | Kartu "● SIMULASI LANGSUNG", chip satuan, persegi ungu berlabel, slider |
| `StatCard` | Ikon + label kecil + angka besar (Luas, Keliling, Total XP, dll.) |
| `QuizCard` | "SOAL x DARI 5", "+10 XP / soal", bar, ikon, pertanyaan, opsi A–D, tombol "Jawaban berikutnya →" |
| `ResultCard` | Medali, "TANTANGAN SELESAI", "Kerja bagus, Penjelajah!", skor, persentase besar ungu, tombol "Coba lagi ↻" |
| `BadgeCard` | Krem bila didapat, abu pudar bila belum |
| `ActivityList` | Baris aktivitas + tanggal di kanan |
| `CalculatorCard` | Gambar persegi `s` + input + kartu Luas/Keliling + "Cara menghitung" |
| `StoryText`, `KnownAskedBox`, `FormulaPicker`, `SolveSteps`, `AnswerInput`, `Feedback` | Komponen latihan literasi (F2, F6, F8) |
| `Toast` | Notifikasi kecil di bawah, 2 detik ("Materi selesai! +10 XP") |
| `InstallSheet` | Petunjuk instal untuk iPhone |

## 6. Wireframe

### 6.1 Login (baru)
```
┌──────────────────────────────┐
│          ▦ PERSEGI GO!        │
│   Petualangan Matematika     │
│      [ilustrasi kotak 4]     │
├──────────────────────────────┤
│ [ G  Masuk dengan Google ]   │  tombol putih bergaris
│ ──────── atau ────────       │
│ Email      [              ]  │
│ Kata sandi [              ]  │
│ [        Masuk        ]      │  tombol kuning
│ Lupa kata sandi?             │
│ Belum punya akun? Daftar     │
└──────────────────────────────┘
```
Daftar: nama panggilan, email, kata sandi (min. 8), lalu pesan "Cek email untuk verifikasi".

### 6.2 Beranda
```
┌ hero ungu ──────────────────────────────┐
│ PETUALANGAN MATEMATIKA · KELAS VII      │
│ Hai, Penjelajah!                        │
│ Siap menaklukkan persegi?  (kuning)     │  [kotak 3D "4", 90°, a=a, ✦]
│ Kenali sifat-sifat persegi, temukan…    │
│ [ Mulai belajar → ]                     │
└─────────────────────────────────────────┘
PETA PETUALANGAN                  LEVEL 1 · PEMULA
Perjalanan belajarmu
[01 Kenali persegi ↗] [02 Jelajahi rumus ↗] [03 Uji kemampuan ↗]
┌ PENCAPAIAN · Progres belajar 🏆 ┐ ┌ " Matematika bukan tentang …  ┐
│ ▬▬▬▬▬▬▬▬ 100% selesai  1 kuis  │ │   — Misi hari ini             │
└─────────────────────────────────┘ └───────────────────────────────┘
```

### 6.3 Materi
```
MODUL 01 · KONSEP DASAR
Berkenalan dengan persegi
┌ konten ─────────────────────────────┐ ┌ RINGKASAN ─────────┐
│ [SVG persegi berlabel a, a, a, a]   │ │ Ingat 3 hal ini    │
│ Apa itu persegi?                    │ │ 1. Empat sisi sama │
│ Persegi adalah bangun datar …       │ │ 2. Sudut 90°       │
│ Sifat-sifat persegi                 │ │ 3. Luas → cm²,     │
│ [① 4 sisi sama] [② 4 sudut siku]    │ │    keliling → cm   │
│ [③ sisi sejajar] [④ diagonal sama]  │ │ 🏆 Tips belajar    │
│ Rumus penting                       │ │ Amati ubin …       │
│ [LUAS L = s × s] [KELILING K = 4×s] │ └────────────────────┘
│ 💡 Contoh sederhana …               │
│ [ Tandai materi selesai ✓ ]         │
└─────────────────────────────────────┘
```
Di atas konten ada daftar modul M1–M6 (tab/chip). Setiap modul juga bisa dibuka dalam
**mode bertahap** (StepCard: Kembali / Ulangi / Lanjut).

### 6.4 Eksplorasi
```
LAB MATEMATIKA · INTERAKTIF
Eksplorasi persegi
[ Simulasi | Tebak Sisinya | Kalkulator ]       ← tab
┌ ● SIMULASI LANGSUNG      satuan cm ┐ ┌ LUAS PERSEGI    49 cm²  s×s ┐
│        ┌────────┐                  │ └──────────────────────────────┘
│        │  7 cm  │                  │ ┌ KELILING PERSEGI 28 cm  4×s ┐
│        └────────┘                  │ └──────────────────────────────┘
│         ← Sisi = 7 cm →            │ ┌ 💡 Coba amati                ┐
│ Atur panjang sisi        7 cm      │ │ Saat sisi 7 cm, luasnya …    │
│ 1 ━━━━━━━━━●━━━━━ 15               │ └──────────────────────────────┘
└────────────────────────────────────┘
```

### 6.5 Kalkulator Persegi (tab Eksplorasi)
```
🔢 Kalkulator Persegi
[gambar persegi hijau muda, label s, tanda siku-siku]
Masukkan panjang sisi persegi (cm)  [ 8 ]
[Luas 64 cm²  s × s]  [Keliling 32 cm  4 × s]
Cara menghitung:
• Luas = 8 × 8 = 64 cm²
• Keliling = 4 × 8 = 32 cm
```

### 6.6 Kuis
```
TANTANGAN · 5 SOAL
Uji pengetahuanmu!
┌ SOAL 1 DARI 5                ⭐ +10 XP / soal ┐
│ ▬▬▬▭▭▭▭▭▭▭                                    │
│ 🧠                                            │
│ Bangun datar persegi memiliki berapa sisi …? │
│ [A Dua sisi] [B Tiga sisi] [C Empat sisi] … │
│ (setelah memilih: benar = hijau, salah =     │
│  oranye, pembahasan muncul di bawah)         │
│                    [ Jawaban berikutnya → ]  │
└───────────────────────────────────────────────┘
```

### 6.7 Hasil Kuis
```
        🏅
  TANTANGAN SELESAI
  Kerja bagus, Penjelajah!
  Skor kamu: 5 dari 5
        100%
    [ Coba lagi ↻ ]
```

### 6.8 Latihan Soal Cerita (F2, F6, F8)
```
LATIHAN LITERASI · SOAL 2 DARI 5      ①②③④⑤
┌──────────────────────────────────────────┐
│ Ketuk angka/kata penting.                │
│ Sebuah taman berbentuk persegi memiliki  │
│ [panjang sisi 15 meter]. Sekolah ingin   │ ← kuning
│ memasang [pagar di sekeliling] taman.    │ ← biru
│ ┌ Diketahui ─────┬ Ditanya ────────┐     │
│ │ s = 15 m       │ panjang pagar   │     │
│ └────────────────┴─────────────────┘     │
│ [💡 Petunjuk]                [Lanjut ›]  │
└──────────────────────────────────────────┘
Tahap 4: K = 4 × 15 = [ 60 ]  satuan (cm)(m✓)(cm²)(m²)
Umpan balik: "✓ Benar! 4 sisi × 15 m = 60 m."  /
             "! 225 itu luas taman. Pagar ada di pinggiran."
```

### 6.9 Evaluasi & Progres
```
DASHBOARD PENCAPAIAN
Jejak petualanganmu
[⭐ TOTAL XP 60] [🎯 KUIS SELESAI 1] [📚 MATERI SELESAI 1/6] [🏅 SKOR TERBAIK 100%]
┌ LENCANA · Koleksi pencapaian ───────────────────────────────┐
│ [📖 Pembaca tekun] [🎯 Berani mencoba] [⭐ Bintang baru] [🚀 …] │
└─────────────────────────────────────────────────────────────┘
┌ Riwayat aktivitas ──────────────────────────────────────────┐
│ Menyelesaikan kuis: 5/5 benar                       11 Nov  │
│ Menyelesaikan materi persegi                        11 Nov  │
└─────────────────────────────────────────────────────────────┘
Akun: nama@email.com   [Ekspor data] [Keluar]
```

## 7. Gerak

- Hero: sparkle berkedip pelan dan kotak 3D melayang (sesuai desain), hanya di Beranda.
- Pindah halaman: fade + geser 5 px, 250 ms.
- Persegi Eksplorasi: transisi ukuran 200 ms saat slider digeser.
- Animasi penjelas di Materi (grid terisi, garis keliling ditelusuri) selalu punya tombol ↻ Ulangi.
- `prefers-reduced-motion: reduce` mematikan **semua** animasi di atas.

## 8. Aturan Beban Kognitif di Halaman Belajar

Berlaku untuk Materi (mode bertahap), Eksplorasi, dan Latihan:
- [ ] Satu kartu = satu ide; ≤ 3 kalimat
- [ ] Label menempel di gambar
- [ ] Ungu = luas, hijau = keliling, konsisten
- [ ] Tidak ada hiasan bergerak; animasi hanya untuk menjelaskan dan bisa diulang
- [ ] Langkah maju hanya lewat tombol siswa
- [ ] Umpan balik spesifik + bantuan bertingkat
- [ ] Satuan selalu tampil dan dicek
- [ ] Rapi di 360 px; target sentuh ≥ 44 px; kontras ≥ 4.5:1

## 9. Penulisan Teks

- Sapa "Penjelajah"/"kamu". Nada ceria, tetapi kalimat pendek.
- Salah: "Belum tepat. Coba cek …" (bukan "Salah!"). Benar: "Benar! …" + alasan singkat.
- "Keliling" = panjang pinggiran; "Luas" = banyak kotak/permukaan.
