// Teks umpan balik untuk setiap kode kesalahan (docs/KONTEN_MATERI.md §6).
// {i} = angka yang dipakai di rumus, {e} = jawaban benar.

export const FEEDBACK = {
  CORRECT: 'Benar!',
  WRONG_UNIT: 'Angkamu sudah benar! Cek lagi satuannya: panjang → cm/m, luas → cm²/m².',
  PERIMETER_INSTEAD_OF_AREA: 'Itu keliling (pinggiran). Yang dicari luas, yaitu banyak kotak di dalamnya: s × s.',
  AREA_INSTEAD_OF_PERIMETER: 'Itu luas (permukaan). Yang dicari pinggiran, jadi jumlahkan keempat sisinya: 4 × s.',
  DOUBLED_NOT_SQUARED: 's × s artinya {i} × {i}, bukan {i} × 2.',
  ONLY_TWO_SIDES: 'Persegi punya 4 sisi, bukan 2. Coba 4 × {i}.',
  DIVIDED_AREA_BY_4: 'Bagi 4 dipakai untuk keliling. Dari luas, cari bilangan yang dikali dirinya sendiri = {i}.',
  HALVED_AREA: '√{i} bukan {i} ÷ 2. Bilangan berapa dikali dirinya sendiri = {i}?',
  SQRT_PERIMETER: 'Akar dipakai untuk luas. Dari keliling, bagi dengan 4.',
  HALVED_PERIMETER: 'Keliling terdiri dari 4 sisi, jadi bagi dengan 4, bukan 2.',
  NO_OPERATION: 'Itu angka yang diketahui. Masukkan ke rumus lalu hitung dulu.',
  WRONG_GENERIC: 'Belum tepat. Coba hitung lagi pelan-pelan.',
  EMPTY: 'Tulis jawabanmu dulu, ya.',
  NO_UNIT: 'Pilih satuannya juga, ya.',
};

export function feedbackText(code, ctx = {}) {
  const template = FEEDBACK[code] || FEEDBACK.WRONG_GENERIC;
  return template.replace(/\{(\w)\}/g, (_, key) => (ctx[key] ?? ''));
}
