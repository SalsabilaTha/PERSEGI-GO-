# PRD — Product Requirements Document

**Produk:** PERSEGI GO!: aplikasi web (PWA) belajar Bangun Datar Persegi
**Penyusun:** Salsabila Thahira (2225250214)
**Versi:** 0.2, 11 November 2026 (revisi: login Supabase, Python + JS, PWA, desain PERSEGI GO!)
**Sumber data:** Wawancara siswa S01 (kelas 8, 06/11/2026, 23.57 menit), tugas pemicu 3 soal,
dan desain aplikasi dari pemilik.

---

## 1. Latar Belakang

Siswa sudah **hafal** sifat dan rumus persegi, tetapi kesulitan **menerapkannya**:
- mencari panjang sisi jika diketahui luas (akar kuadrat),
- soal cerita panjang (memilah diketahui/ditanya, membuat model matematika),
- membedakan rumus luas dan keliling,
- menuliskan satuan.

Ini adalah masalah **literasi matematika**: siswa bisa *employ* (menghitung), tetapi lemah pada
*formulate* (menerjemahkan konteks) dan *interpret* (memeriksa kewajaran).

Kerangka yang dipakai: **Cognitive Load Theory (Sweller)**.

| Beban | Arti | Strategi aplikasi |
|---|---|---|
| **Intrinsic (IL)** | Kerumitan bawaan materi | Segmentasi, prasyarat, urutan sederhana → rumit |
| **Extraneous (EL)** | Beban dari penyajian | Visual menggantikan teks panjang, langkah bertahap |
| **Germane (GL)** | Usaha membangun skema | Contoh bertahap, eksplorasi, umpan balik, refleksi |

### Model pembelajaran: Rigorous Mathematical Thinking (RMT)
Atas arahan dosen, aplikasi memakai model **RMT** (Kinard & Kozulin), yaitu sintesis teori
sosiokultural **Vygotsky** (alat psikologis, konsep ilmiah, ZPD, Learning Activity) dan teori
**Feuerstein** (modifikasi kognitif struktural, *Mediated Learning Experience*). Penerapannya:
- **Fase kognitif Input → Elaborasi → Output** menjadi kerangka tahap latihan, ditambah **Refleksi**.
- **Learning Activity**: analisis tugas (Pahami) → perencanaan tindakan (Rencanakan) → refleksi.
- **Siklus Representasi–Manipulasi–Validasi** pada setiap soal cerita.
- **MLE**: intensionalitas (tujuan jelas), makna (konteks sehari-hari), transendensi (aturan umum),
  dengan **Tutor AI** sebagai mediator yang bertanya, bukan pemberi jawaban.
- **Alat psikologis**: simbol (s, L, K), kotak Diketahui/Ditanya, tabel, grid, rumus.
- **Konsep sehari-hari → konsep ilmiah** pada pembuka setiap modul.

## 2. Tujuan

### Tujuan pembelajaran (K01)
1. Mengenali sifat persegi (4 sisi sama panjang, 4 sudut siku-siku, sisi berhadapan sejajar,
   diagonal sama panjang).
2. Menghitung keliling dan luas dari panjang sisi.
3. Menghitung sisi dari **luas** (√L) atau **keliling** (K ÷ 4).
4. Menyelesaikan soal cerita satu dan dua langkah.
5. Menulis satuan dengan benar dan memeriksa kewajaran jawaban.

### Tujuan produk
- Siswa **login** sekali, lalu progres, XP, lencana, dan riwayat tersimpan di akun dan bisa
  dibuka dari perangkat mana pun.
- Aplikasi **bisa dipasang di HP** (Android & iPhone) **tanpa toko aplikasi**.
- Tampilan **mengikuti desain PERSEGI GO!** milik pemilik.
- Materi dan latihan menerapkan prinsip CLT dari temuan wawancara.

### Bukan tujuan (v1)
- Chatbot umum di luar materi persegi (Tutor AI dibatasi pada persegi).
- Sign in with Apple (memerlukan Apple Developer berbayar).
- Publikasi di Play Store / App Store.
- Bangun datar selain persegi; akar non-kuadrat sempurna.
- Dasbor guru terpisah (data bisa dilihat peneliti lewat dashboard Supabase).

## 3. Pengguna

**Persona utama: "Siswa S01"**
- SMP kelas 7–8, belajar klasikal (papan tulis + buku paket).
- Hafal rumus, ragu pada soal cerita dan soal "kebalikan" (mencari sisi).
- Lebih paham lewat **gambar** (EL02); butuh penjelasan **pelan, bertahap, bisa diulang** (EL04).
- Terbantu dengan **menandai informasi** (EL05) dan **petunjuk tahap demi tahap** (GL03).
- Suka **menggambar dan langsung mencoba** (GL01); punya kebiasaan **memeriksa ulang** (GL02).
- Perangkat: HP Android (360–412 px) atau iPhone; kadang laptop.

**Pengguna sekunder:** peneliti/guru (Salsabila) yang melihat data progres siswa melalui
dashboard Supabase atau fitur ekspor.

## 4. Keterlacakan: Temuan → Fitur

| Kode wawancara | Temuan | Jenis | Fitur |
|---|---|---|---|
| K03, IL01, IL04, Soal 2 | Bingung mencari sisi dari luas | IL | **F1** |
| IL02, IL05, EL01, Soal 1 | Tertukar rumus luas/keliling, lupa satuan | IL | **F2**, **F8** |
| EL05 | Sulit menentukan info penting; terbantu dengan menandai | EL+GL | **F2** |
| EL02, DS01 | Lebih paham lewat gambar | EL | **F3**, **F14** |
| EL03, DS03 | Warna/animasi ramai mengganggu | EL | **NF1** (lihat §7 trade-off) |
| EL04, DS02 | Penjelasan pelan, bertahap, bisa diulang; petunjuk saat salah | EL | **F5**, **F8** |
| GL03 | Petunjuk tahap demi tahap | GL | **F6** |
| GL01 | Menggambar dan latihan langsung | GL | **F7**, **F13** |
| GL02 | Memeriksa jawaban | GL | **F8** |
| IL03 | Prasyarat perkalian/pembagian | IL | **F4** |
| GL04 | Menjelaskan ke teman | GL | **F9** |
| GL05 | Konsep dulu, lalu variasi cerita | GL | **F6** |
| Soal 3 | Mengubah cerita menjadi model matematika | IL | **F2**, **F6** |
| Permintaan pemilik | Login, riwayat permanen, instal di HP, desain PERSEGI GO! | — | **F11–F15** |

## 5. Kebutuhan Fungsional

Prioritas: **P0** = wajib (MVP), **P1** = penting, **P2** = jika sempat.

### F11. Login dan Sinkronisasi Akun (P0) — *baru*
- Saat aplikasi dibuka tanpa sesi, layar **Login** tampil terlebih dahulu. Halaman lain tidak
  bisa diakses sebelum login.
- Metode: **Email + kata sandi** saja (Daftar, Masuk, Lupa kata sandi). Login Google dihapus
  atas keputusan pemilik (13/11/2026).
  Email apa pun bisa dipakai, termasuk `@icloud.com`.
- Pendaftaran email memerlukan **verifikasi email** (tautan dari Supabase).
- Sesi diingat (tidak perlu login setiap membuka aplikasi); tombol **Keluar** ada di halaman Progres.
- Semua aktivitas (materi selesai, kuis, latihan, XP) dikirim ke server dan tersimpan di akun.
  Login di perangkat lain menampilkan data yang sama.
- Saat offline, aktivitas disimpan di antrean lokal (**outbox**) dan dikirim otomatis saat online.

**Kriteria terima:** login di HP A, selesaikan kuis, lalu login di laptop B; skor dan riwayat sama.

### F12. Instal di Smartphone (PWA) (P0) — *baru*
- Memenuhi kriteria installable (manifest, service worker, ikon PNG 192/512 + maskable,
  `apple-touch-icon`).
- **Android/Chrome & desktop:** tombol **＋ Instal** di header (memakai `beforeinstallprompt`).
- **iPhone/Safari:** tombol yang sama membuka petunjuk bergambar: *Share → Add to Home Screen*.
- Setelah dipasang, aplikasi terbuka tanpa bilah alamat (`display: standalone`), dengan ikon
  PERSEGI GO!.
- Tampilan dan konten tetap bisa dibuka saat offline (login pertama tetap butuh internet).
- (P2) Membuat file APK lewat PWABuilder untuk dibagikan langsung (sideload).

**Kriteria terima:** aplikasi bisa dipasang di 1 HP Android dan 1 iPhone dari URL HTTPS.

### F1. Visualisasi Luas ↔ Sisi ↔ Akar Kuadrat (P0)
- Di halaman Eksplorasi, mode **"Tebak Sisinya"**: diberi luas (misal 121 kotak), siswa menggeser
  sisi sampai grid s × s tepat sama. Ini menanamkan arti √ (IL01).
- Tabel kuadrat 1²–20² bisa dibuka/tutup.

**Kriteria terima:** siswa menemukan s = 11 untuk L = 121 memakai grid.

### F2. Penanda Informasi dan Pemilih Rumus (P0)
- Pada soal cerita, siswa **mengetuk** frasa untuk menandainya sebagai **Diketahui** (kuning)
  atau **Ditanya** (biru), lalu frasa itu masuk ke kotak Diketahui/Ditanya.
- Pemilih rumus memakai pertanyaan penuntun: "pinggiran atau permukaan?", "yang diketahui sisi,
  luas, atau keliling?".
- Bantuan dipudarkan: di level awal sebagian frasa sudah ditandai.

### F3. Visualisasi Interaktif Persegi (P0)
- Halaman Materi menampilkan persegi SVG dengan label sisi, simbol siku-siku, dan sorotan
  **Sisi | Sudut | Keliling | Luas** (satu sorotan dalam satu waktu).
- Halaman Eksplorasi: slider sisi 1–15 cm, persegi berubah langsung, kartu **Luas** dan
  **Keliling**, serta kotak "Coba amati" (sesuai desain).

### F4. Pemanasan Prasyarat (P1)
3–5 soal kilat (7 × 7, 28 ÷ 4, "berapa × dirinya = 49?") sebelum modul M3 dan M5.

### F5. Materi Bertahap dengan Tombol Ulangi (P0)
- Modul M1–M6 dipecah per langkah (1 kartu = 1 ide). Navigasi **Kembali | Ulangi | Lanjut**,
  penanda "Langkah x/n".
- Panel **"Ingat 3 hal ini"** + **Tips belajar** di sisi kanan (desktop) atau di akhir modul (HP).
- Tombol **"Tandai materi selesai ✓"** di akhir modul (+XP).

### F6. Latihan Soal Cerita Bertahap (P0)
Lima tahap tetap: **Pahami → Pilih rumus → Masukkan angka → Hitung + satuan → Periksa**.
Bantuan dipudarkan: **Contoh** (terisi semua) → **Lengkapi** (sebagian kosong) → **Mandiri**.
Konteks bervariasi (taman, ubin, bingkai, kolam, papan catur) dengan struktur yang sama.

### F7. Gambar Persegi (P2)
Kanvas grid titik; siswa menggambar persegi, aplikasi mengecek apakah sisinya sama, lalu siswa
menebak luas/keliling sebelum angkanya ditampilkan.

### F8. Pemeriksaan Jawaban dan Bantuan Bertingkat (P0)
- Input **angka + satuan** (chip: cm, cm², m, m²).
- Deteksi miskonsepsi dengan umpan balik spesifik (KONTEN_MATERI.md §6).
- Salah ke-1 → umpan balik spesifik; salah ke-2 → petunjuk tahap; salah ke-3 → penyelesaian
  bertahap, lalu soal kembar.

### F9. Jelaskan dengan Kata-katamu (P2)
Kalimat rumpang / memilih penjelasan yang benar untuk teman fiktif.

### F13. Kuis, XP, dan Lencana (P0) — *baru, sesuai desain*
- **Kuis "Uji pengetahuanmu!"**: 5 soal pilihan ganda (A–D), satu per layar, bar progres,
  **+10 XP per jawaban benar**, pembahasan setelah menjawab, layar hasil
  ("Kerja bagus, Penjelajah!", skor x/5, persentase, tombol **Coba lagi**).
- **XP** tampil di header (⭐ 60 XP). Aturan XP di KONTEN_MATERI.md §7.
- **Lencana**: Pembaca tekun, Berani mencoba, Bintang baru, Pembelajar aktif, dan lencana
  literasi tambahan. Semuanya dihitung di server.
- **Level** di Beranda ("LEVEL 1 · PEMULA") berdasarkan total XP.

### F14. Kalkulator Persegi (P1) — *baru, sesuai desain*
Input panjang sisi → kartu **Luas** (s × s) dan **Keliling** (4 × s) + bagian **"Cara menghitung"**
langkah demi langkah. Ada gambar persegi berlabel `s` dan tanda siku-siku.

### F10 + F15. Evaluasi & Progres, Ekspor, Hapus Akun (P0/P1)
- Halaman **"Jejak petualanganmu"**: Total XP, Kuis selesai, Materi selesai (x/6), Skor terbaik,
  **Koleksi pencapaian** (lencana), **Riwayat aktivitas** (dengan tanggal), dari server.
- (P1) Skala usaha mental Paas 1–9 setelah latihan (data penelitian).
- (P1) **Ekspor data** akun (JSON) dan **Hapus akun** beserta datanya.

### F16. Tutor AI "Kak Tutor" berbasis RMT (P0) — *baru*
- AI **Gemini** dipanggil dari server Python. Kunci API tidak pernah sampai ke browser.
- Muncul di dua tempat: tombol **🧭 Tanya Tutor** di setiap tahap soal cerita (konteks soal, tahap,
  kesalahan terakhir, dan tingkat bantuan dikirim otomatis) dan menu **Tutor AI** untuk tanya bebas
  seputar persegi.
- Syarat dari dosen:
  1. membimbing penyelesaian masalah literasi secara bertahap;
  2. mengelola beban kognitif (intrinsic: satu langkah per balasan; extraneous: ≤ 3 kalimat,
     bahasa SMP; germane: pertanyaan penuntun & refleksi);
  3. petunjuk sesuai kesulitan (tingkat 0–3), **tanpa jawaban akhir**;
  4. mengikuti tahapan RMT (diagnosis fase Input/Elaborasi/Output);
  5. berperan sebagai **mediator proses berpikir**.
- **Penjaga jawaban** di server dan **petunjuk bawaan** bila AI tidak tersedia.
- Setelah salah menghitung 2×, aplikasi menawarkan "Mau dibimbing Kak Tutor?".
- Batas 20 pertanyaan / 10 menit / siswa.

**Kriteria terima:** tutor tidak pernah menuliskan jawaban akhir sebelum tahap Periksa; balasan ≤ 3
kalimat; aplikasi tetap berfungsi tanpa kunci API.

### F17. Refleksi & Transendensi (P0) — *baru*
- Tahap 6 **Refleksi** setelah Periksa: siswa menulis apa yang dipelajari dan aturan yang berlaku
  untuk **semua** persegi. Kak Tutor menanggapi (mode `reflect`). Boleh dilewati.
- Setiap modul materi memiliki kartu **Tujuan & Makna** dan **Berlaku untuk semua persegi**.

## 6. Kebutuhan Non-Fungsional

| ID | Kebutuhan |
|---|---|
| NF1 | Desain mengikuti PERSEGI GO!; halaman Materi/Latihan tetap fokus (lihat §7) |
| NF2 | Responsif: sidebar di ≥ 900 px, bottom navigation di HP; rapi di 360 px |
| NF3 | Tampilan tercache terbuka < 2 detik; aset awal (tanpa font) < 400 KB |
| NF4 | Bisa offline setelah login pertama; aktivitas tersinkron saat online |
| NF5 | Aksesibel: kontras ≥ 4.5:1, target sentuh ≥ 44 px, teks dasar ≥ 16 px, navigasi keyboard |
| NF6 | Bahasa Indonesia sederhana |
| NF7 | Keamanan: HTTPS, verifikasi token di server, RLS aktif, rahasia di env var |
| NF8 | Privasi: hanya menyimpan email, nama tampilan, dan data belajar; bisa ekspor & hapus |
| NF9 | Kompatibel: Chrome Android, Safari iOS 16.4+, Chrome/Edge/Firefox desktop |

## 7. Trade-off: Desain Gamifikasi vs Temuan Wawancara

Pemilik memilih desain **persis** seperti screenshot (hero dengan hiasan, XP, lencana, emoji ikon).
Temuan EL03/DS03 menyebut animasi dan warna ramai mengganggu fokus. Kompromi yang dipakai:
- Hiasan bergerak **hanya di hero Beranda**; halaman Materi, Eksplorasi, dan Latihan tetap bersih.
- Semua animasi mati jika `prefers-reduced-motion`.
- XP/lencana tidak muncul sebagai pop-up yang memotong proses belajar. Notifikasi berupa toast
  kecil yang hilang dalam 2 detik.
- **Diuji** pada uji coba: amati apakah elemen gamifikasi mengganggu (PRD §8). Jika ya, dikurangi.

## 8. Alur Pengguna

```
Buka aplikasi ─► (belum login) Login/Daftar ─► Beranda
                                            ├─ Materi (M1–M6, bertahap)
                                            ├─ Eksplorasi (slider, Tebak Sisinya, Kalkulator)
                                            ├─ Kuis & Latihan (kuis 5 soal, latihan cerita 5 tahap)
                                            └─ Evaluasi & Progres (XP, lencana, riwayat, keluar)
```

| Modul | Judul | Fokus |
|---|---|---|
| M1 | Mengenal Persegi | Sifat sisi, sudut, sisi sejajar, diagonal |
| M2 | Keliling | K = 4 × s, panjang pinggiran |
| M3 | Luas | L = s × s, banyak kotak satuan |
| M4 | Luas atau Keliling? | Membedakan dari konteks |
| M5 | Mencari Sisi | s = K ÷ 4 dan s = √L |
| M6 | Soal Cerita | Dua langkah, misal luas → sisi → keliling |

## 9. Ukuran Keberhasilan dan Rencana Uji

| Fitur | Cara uji |
|---|---|
| F1 | Siswa mengerjakan soal sisi-dari-luas setelah memakai fitur |
| F2 | Soal dengan informasi berbeda; amati ketepatan memilih info dan rumus |
| F3 | Siswa menjelaskan sifat & rumus lewat visualisasi |
| F5/F6 | Amati apakah siswa mengikuti setiap tahap |
| F8 | Amati apakah umpan balik dipakai untuk memperbaiki jawaban |
| F11 | Login di 2 perangkat; data sama |
| F12 | Instal di Android & iPhone; buka offline |
| F13/NF1 | Amati apakah XP/lencana memotivasi atau mengganggu |

**Metrik penelitian:** pretest–posttest literasi, skala usaha mental Paas (1–9), jumlah percobaan
dan bantuan per soal (dari database), SUS untuk usabilitas.

**Target MVP:** ≥ 80% siswa uji menjawab benar soal tipe "sisi dari luas" dan "cerita keliling"
pada posttest, dengan satuan benar.

## 10. Asumsi dan Risiko

| Risiko | Mitigasi |
|---|---|
| Data baru dari 1 siswa | Uji dengan siswa lain sebelum finalisasi |
| Render gratis tertidur → request pertama ±30–60 detik | Tampilan dari cache PWA; aktivitas lewat outbox, tidak menunggu server |
| Proyek Supabase gratis dijeda setelah ±7 hari tanpa aktivitas | Data tetap aman; aktifkan lagi dari dashboard; jadwalkan uji coba berdekatan |
| Siswa lupa kata sandi | Fitur reset kata sandi lewat email |
| Siswa di bawah umur | Data minimal, tanpa nama asli wajib, ada ekspor & hapus akun, izin dari guru/orang tua untuk uji coba |

| Data percakapan anak dikirim ke layanan AI luar negeri (Google Gemini) | Tanpa nama/email; pemberitahuan di panel tutor; izin sekolah/orang tua; percakapan bisa diekspor & dihapus |
| Biaya API Gemini | Batas 20 pertanyaan / 10 menit / siswa; `max_tokens` 1024, `reasoning_effort` low; pantau kuota/biaya di aistudio.google.com |
| AI memberi jawaban akhir atau salah konsep | System prompt RMT + penjaga jawaban di server + uji manual sebelum dipakai siswa |
| AI tidak tersedia (kunci kosong, kuota habis, offline) | Petunjuk bawaan otomatis; fitur lain tetap jalan |
