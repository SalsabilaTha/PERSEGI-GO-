"""Rumus persegi. Harus konsisten dengan frontend/js/core/geometry.js."""
import math

# Rumus yang dikenal aplikasi: id -> (nilai yang dicari, nilai yang dipakai)
FORMULAS = {
    "K_from_s": ("K", "s"),
    "L_from_s": ("L", "s"),
    "s_from_K": ("s", "K"),
    "s_from_L": ("s", "L"),
}


def area(s: float) -> float:
    return s * s


def perimeter(s: float) -> float:
    return 4 * s


def side_from_perimeter(k: float) -> float:
    return k / 4


def side_from_area(l: float) -> int | None:
    """Akar kuadrat; v1 hanya menerima kuadrat sempurna."""
    if l < 0:
        return None
    s = math.isqrt(int(l))
    return s if s * s == l else None


def apply(formula: str, value: float) -> float | None:
    return {
        "K_from_s": perimeter,
        "L_from_s": area,
        "s_from_K": side_from_perimeter,
        "s_from_L": side_from_area,
    }[formula](value)


def plan_for(given: str, asked: str) -> list[str]:
    """Urutan rumus untuk sampai dari besaran yang diketahui ke yang ditanya."""
    if given == asked:
        raise ValueError("Yang diketahui sama dengan yang ditanya.")
    steps = []
    if given != "s":
        steps.append(f"s_from_{given}")
    if asked != "s":
        steps.append(f"{asked}_from_s")
    return steps


def solve(given: dict, asked: str) -> float | None:
    """given berisi satu pasangan, contoh {"L": 121}. Mengembalikan jawaban akhir."""
    (key, value), = given.items()
    current = value
    for formula in plan_for(key, asked):
        current = apply(formula, current)
        if current is None:
            return None
    return current


def unit_for(quantity: str, base_unit: str) -> str:
    """Satuan luas berpangkat dua; sisi dan keliling memakai satuan panjang."""
    return f"{base_unit}²" if quantity == "L" else base_unit
