"""Aturan XP, level, dan lencana (fungsi murni agar mudah diuji).

Aturan lengkap: docs/KONTEN_MATERI.md §7.
"""
from dataclasses import dataclass, field

LEVELS = [
    (300, 4, "AHLI PERSEGI"),
    (150, 3, "PEMECAH MASALAH"),
    (50, 2, "PENJELAJAH"),
    (0, 1, "PEMULA"),
]

XP_LESSON = 10
XP_QUIZ_PER_CORRECT = 10
XP_PRACTICE_CLEAN = 10
XP_PRACTICE_HINTED = 5
XP_WARMUP = 5


@dataclass
class Stats:
    """Ringkasan belajar satu siswa, dipakai untuk menghitung XP & lencana."""
    xp: int = 0
    modules_done: set = field(default_factory=set)
    quizzes: int = 0
    best_quiz_score: int = 0          # jumlah benar terbaik
    best_quiz_percent: int = 0
    solved_problems: set = field(default_factory=set)   # soal latihan yang pernah benar
    sqrt_solved: int = 0              # soal benar yang memakai akar kuadrat
    unit_clean_correct: int = 0       # latihan benar tanpa kesalahan satuan
    warmups_done: set = field(default_factory=set)
    total_modules: int = 6
    m6_problems: set = field(default_factory=set)       # id semua soal modul 6


def xp_for(activity_type: str, payload: dict, stats: Stats) -> int:
    """XP untuk satu aktivitas, dihitung dari kondisi SEBELUM aktivitas dicatat."""
    if activity_type == "lesson_done":
        return 0 if payload["module_id"] in stats.modules_done else XP_LESSON
    if activity_type == "quiz_done":
        # Mengulang kuis hanya memberi XP bila skor melebihi skor terbaik.
        return max(0, payload["score"] - stats.best_quiz_score) * XP_QUIZ_PER_CORRECT
    if activity_type == "practice_done":
        if not payload["correct"] or payload["problem_id"] in stats.solved_problems:
            return 0
        return XP_PRACTICE_CLEAN if payload["hints_used"] == 0 else XP_PRACTICE_HINTED
    if activity_type == "warmup_done":
        return 0 if payload["module_id"] in stats.warmups_done else XP_WARMUP
    return 0


def level_for(total_xp: int) -> tuple[int, str]:
    for minimum, number, name in LEVELS:
        if total_xp >= minimum:
            return number, name
    return 1, "PEMULA"


BADGE_RULES = {
    "pembaca_tekun": lambda s: len(s.modules_done) >= 1,
    "berani_mencoba": lambda s: s.quizzes >= 1,
    "bintang_baru": lambda s: s.best_quiz_percent >= 80,
    "pembelajar_aktif": lambda s: s.xp >= 50,
    "penakluk_akar": lambda s: s.sqrt_solved >= 3,
    "teliti_satuan": lambda s: s.unit_clean_correct >= 5,
    "penjelajah_cerita": lambda s: bool(s.m6_problems) and s.m6_problems <= s.solved_problems,
    "ahli_persegi": lambda s: len(s.modules_done) >= s.total_modules,
}


def earned_badges(stats: Stats) -> list[str]:
    return [badge_id for badge_id, rule in BADGE_RULES.items() if rule(stats)]
