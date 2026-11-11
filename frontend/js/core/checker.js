// Memeriksa jawaban dan mengenali miskonsepsi yang umum.
// Urutan: benar → satuan salah → pola miskonsepsi → salah umum.

const same = (a, b) => Math.abs(a - b) < 1e-9;

// Jawaban salah yang sering muncul untuk tiap rumus, dengan i = angka masukan.
const PATTERNS = {
  L_from_s: (i) => [[4 * i, 'PERIMETER_INSTEAD_OF_AREA'], [2 * i, 'DOUBLED_NOT_SQUARED'], [i, 'NO_OPERATION']],
  K_from_s: (i) => [[i * i, 'AREA_INSTEAD_OF_PERIMETER'], [2 * i, 'ONLY_TWO_SIDES'], [i, 'NO_OPERATION']],
  s_from_L: (i) => [[i / 4, 'DIVIDED_AREA_BY_4'], [i / 2, 'HALVED_AREA'], [i, 'NO_OPERATION']],
  s_from_K: (i) => [[Math.sqrt(i), 'SQRT_PERIMETER'], [i / 2, 'HALVED_PERIMETER'], [i, 'NO_OPERATION']],
};

/** Ubah teks "12,5" atau "12.5" menjadi angka; null bila kosong/tidak valid. */
export function parseNumber(text) {
  const clean = String(text ?? '').trim().replace(',', '.');
  if (clean === '') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{value:number|null, unit:string|null}} answer
 * @param {{expected:number, expectedUnit:string, formulaId:string, input:number}} target
 * @returns {string} kode hasil
 */
export function checkAnswer(answer, target) {
  if (answer.value === null) return 'EMPTY';
  if (same(answer.value, target.expected)) {
    if (!answer.unit) return 'NO_UNIT';
    return answer.unit === target.expectedUnit ? 'CORRECT' : 'WRONG_UNIT';
  }
  const patterns = PATTERNS[target.formulaId]?.(target.input) || [];
  for (const [value, code] of patterns) {
    if (same(answer.value, value)) return code;
  }
  return 'WRONG_GENERIC';
}
