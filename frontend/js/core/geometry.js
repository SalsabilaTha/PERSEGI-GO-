// Rumus persegi. Harus konsisten dengan backend/geometry.py.

export const area = (s) => s * s;
export const perimeter = (s) => 4 * s;
export const sideFromPerimeter = (k) => k / 4;

/** Akar kuadrat; v1 hanya untuk kuadrat sempurna. */
export function sideFromArea(l) {
  const s = Math.round(Math.sqrt(l));
  return s * s === l ? s : null;
}

export const FORMULAS = {
  K_from_s: { find: 'K', use: 's', text: 'K = 4 × s', fn: perimeter, template: ['K = 4 × ', '□'] },
  L_from_s: { find: 'L', use: 's', text: 'L = s × s', fn: area, template: ['L = ', '□', ' × ', '□'] },
  s_from_K: { find: 's', use: 'K', text: 's = K ÷ 4', fn: sideFromPerimeter, template: ['s = ', '□', ' ÷ 4'] },
  s_from_L: { find: 's', use: 'L', text: 's = √L', fn: sideFromArea, template: ['s = √', '□'] },
};

export const QUANTITY_NAME = { s: 'panjang sisi', K: 'keliling', L: 'luas' };

/** Urutan rumus dari besaran yang diketahui ke besaran yang ditanya. */
export function planFor(given, asked) {
  const steps = [];
  if (given !== 's') steps.push(`s_from_${given}`);
  if (asked !== 's') steps.push(`${asked}_from_s`);
  return steps;
}

export const unitFor = (quantity, base) => (quantity === 'L' ? `${base}²` : base);

/** Langkah penyelesaian lengkap untuk satu soal. */
export function solutionSteps(problem) {
  const [[givenKey, givenValue]] = Object.entries(problem.given);
  let current = givenValue;
  return planFor(givenKey, problem.asked).map((id) => {
    const f = FORMULAS[id];
    const input = current;
    current = f.fn(input);
    return { id, formula: f, input, result: current, unit: unitFor(f.find, problem.unit) };
  });
}
