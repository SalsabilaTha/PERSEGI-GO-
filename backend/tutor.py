"""Tutor AI (Gemini) yang membimbing siswa dengan model Rigorous Mathematical Thinking (RMT)
dan prinsip Cognitive Load Theory (CLT).

Prinsip penting:
- Kunci API hanya di server. Identitas siswa (nama/email) TIDAK PERNAH dikirim ke Gemini.
- Tutor tidak memberikan jawaban akhir; ada penjaga (leaks_answer) yang memeriksa balasan AI.
- Bila AI tidak tersedia (tanpa kunci, offline, error), dipakai petunjuk bawaan (fallback_reply).
"""
from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

from . import geometry

MODES = {"hint", "chat", "reflect"}

# Tahap latihan → fase kognitif RMT (Feuerstein: Input–Elaborasi–Output) dan siklus
# penyelidikan (Representasi–Manipulasi–Validasi).
STAGES = [
    ("input", "1. Pahami: analisis tugas, tandai yang diketahui & ditanya (Representasi)"),
    ("elaborasi", "2. Rencanakan: pilih rumus yang tepat (Perencanaan tindakan)"),
    ("elaborasi", "3. Masukkan angka ke rumus (Manipulasi)"),
    ("elaborasi", "4. Hitung dan tulis satuan (Manipulasi)"),
    ("output", "5. Periksa kewajaran jawaban (Validasi)"),
    ("refleksi", "6. Refleksi: apa yang dipelajari & aturan umum (Transendensi)"),
]

# Kode kesalahan → fase tempat kesulitan siswa berada (diagnosis RMT)
ERROR_PHASE = {
    "WRONG_MARKING": "input",
    "WRONG_FORMULA": "elaborasi", "WRONG_SUBSTITUTION": "elaborasi",
    "PERIMETER_INSTEAD_OF_AREA": "elaborasi", "AREA_INSTEAD_OF_PERIMETER": "elaborasi",
    "DOUBLED_NOT_SQUARED": "elaborasi", "ONLY_TWO_SIDES": "elaborasi",
    "DIVIDED_AREA_BY_4": "elaborasi", "HALVED_AREA": "elaborasi", "NO_OPERATION": "elaborasi",
    "SQRT_PERIMETER": "elaborasi", "HALVED_PERIMETER": "elaborasi", "WRONG_GENERIC": "elaborasi",
    "WRONG_UNIT": "output",
}

ERROR_TEXT = {
    "WRONG_MARKING": "salah menandai informasi yang diketahui/ditanya",
    "WRONG_FORMULA": "memilih rumus yang tidak sesuai",
    "WRONG_SUBSTITUTION": "memasukkan angka yang salah ke rumus",
    "PERIMETER_INSTEAD_OF_AREA": "menghitung keliling padahal yang dicari luas",
    "AREA_INSTEAD_OF_PERIMETER": "menghitung luas padahal yang dicari keliling",
    "DOUBLED_NOT_SQUARED": "menghitung s × 2, bukan s × s",
    "ONLY_TWO_SIDES": "hanya menjumlahkan 2 sisi",
    "DIVIDED_AREA_BY_4": "membagi luas dengan 4 untuk mencari sisi",
    "HALVED_AREA": "membagi luas dengan 2 untuk mencari sisi",
    "NO_OPERATION": "menulis ulang angka yang diketahui tanpa menghitung",
    "SQRT_PERIMETER": "mengakarkan keliling",
    "HALVED_PERIMETER": "membagi keliling dengan 2",
    "WRONG_UNIT": "angkanya benar tetapi satuannya salah",
    "WRONG_GENERIC": "jawabannya belum tepat",
}

SYSTEM_PROMPT = """Kamu adalah "Kak Tutor", pembimbing proses berpikir matematis di aplikasi PERSEGI GO!
untuk siswa SMP kelas VII yang belajar bangun datar PERSEGI. Kamu memakai model
Rigorous Mathematical Thinking (RMT) dan menjaga beban kognitif siswa tetap ringan.

PERANMU: mediator (Mediated Learning Experience), BUKAN pemberi jawaban.

ATURAN WAJIB:
1. JANGAN PERNAH menuliskan jawaban akhir soal atau hasil hitungan akhirnya. Kamu boleh
   mengatakan apakah langkah siswa sudah benar atau belum, lalu memberi pertanyaan penuntun.
2. Kelola beban kognitif: balasan maksimal 3 kalimat pendek dan paling banyak SATU pertanyaan.
   Bahas satu hal saja. Tanpa judul, tabel, daftar panjang, LaTeX, atau markdown tebal berlebihan.
3. Bahasa Indonesia yang sederhana untuk anak SMP. Sapa dengan "kamu". Ramah dan sabar.
   Jangan berkata "salah"; pakai "belum tepat" atau "coba cek lagi".
4. Ikuti fase kognitif RMT dan mulai dari fase tempat siswa kesulitan:
   - INPUT: bantu siswa membaca teliti, menemukan yang diketahui dan ditanya, menulisnya dengan simbol (s, L, K).
   - ELABORASI: bantu membandingkan (pinggiran = keliling, permukaan = luas), memilih rumus,
     dan memahami hubungan bagian-keseluruhan (keliling = jumlah 4 sisi; luas = banyak kotak satuan).
   - OUTPUT: bantu menyampaikan jawaban dengan simbol dan satuan tepat (cm/m untuk panjang,
     cm²/m² untuk luas) serta memeriksa dengan operasi kebalikan.
5. Mediasi RMT: arahkan perhatian pada satu hal (intensionalitas), kaitkan dengan kehidupan nyata
   bila membantu (makna), dan saat refleksi ajak siswa menyimpulkan aturan yang berlaku untuk
   SEMUA persegi (transendensi).
6. Cegah coba-coba (trial-and-error): minta siswa menjelaskan alasannya, ajak memakai alat berpikir
   seperti kotak Diketahui/Ditanya, gambar persegi, atau tabel kuadrat (1² = 1, 2² = 4, ..., 20² = 400).
7. Notasi: s = sisi, L = s × s, K = 4 × s, s = √L, s = K ÷ 4. Gunakan ² dan √, jangan ^.
8. Hanya bahas persegi dan matematika yang berkaitan. Jika di luar topik, arahkan kembali dengan sopan.
9. Jika siswa benar, puji secara spesifik (sebutkan apa yang tepat) lalu ajak ke langkah berikutnya.
"""

HINT_LEVEL_GUIDE = {
    0: "Tingkat bantuan 0: beri SATU pertanyaan penuntun umum agar siswa berpikir sendiri.",
    1: "Tingkat bantuan 1: arahkan ke informasi atau konsep yang perlu diperhatikan.",
    2: "Tingkat bantuan 2: boleh sebutkan rumus atau konsep yang tepat, tetapi siswa tetap menghitung sendiri.",
    3: "Tingkat bantuan 3: boleh tunjukkan langkah substitusi (contoh: K = 4 × s dengan s = ...), "
       "tetapi JANGAN tulis hasil akhirnya.",
}


class TutorError(Exception):
    pass


def story_text(problem: dict) -> str:
    return "".join(seg if isinstance(seg, str) else seg["t"] for seg in problem["story"])


def phase_for(mode: str, stage: int | None, error_code: str | None) -> str:
    if mode == "reflect":
        return "refleksi"
    if error_code in ERROR_PHASE:
        return ERROR_PHASE[error_code]
    if stage is not None and 0 <= stage < len(STAGES):
        return STAGES[stage][0]
    return "umum"


def problem_context(problem: dict, stage: int | None, error_code: str | None,
                    hint_level: int, student_input: str | None) -> str:
    """Konteks soal untuk AI. Tidak memuat identitas siswa."""
    (given_key, given_value), = problem["given"].items()
    known = [seg["note"] for seg in problem["story"] if isinstance(seg, dict) and seg["role"] == "known"]
    asked = [seg["note"] for seg in problem["story"] if isinstance(seg, dict) and seg["role"] == "asked"]
    plan = " lalu ".join(geometry.plan_for(given_key, problem["asked"]))
    answer = problem["answer"]
    lines = [
        f"SOAL: {story_text(problem)}",
        f"Diketahui: {', '.join(known)}. Ditanya: {', '.join(asked)}.",
        f"Urutan rumus yang benar (rahasia): {plan}.",
        f"JAWABAN AKHIR (RAHASIA, JANGAN DITULISKAN): {answer['value']} {answer['unit']}.",
    ]
    if stage is not None and 0 <= stage < len(STAGES):
        lines.append(f"Siswa sedang di tahap {STAGES[stage][1]}; fase RMT: {STAGES[stage][0].upper()}.")
    if error_code in ERROR_TEXT:
        lines.append(f"Kesalahan terakhir siswa: {ERROR_TEXT[error_code]}.")
    if student_input:
        lines.append(f"Isian terakhir siswa: {student_input}")
    lines.append(HINT_LEVEL_GUIDE[max(0, min(hint_level, 3))])
    return "\n".join(lines)


def build_messages(mode: str, user_text: str, history: list[dict] | None = None,
                   problem: dict | None = None, stage: int | None = None,
                   error_code: str | None = None, hint_level: int = 0,
                   student_input: str | None = None) -> list[dict]:
    system = SYSTEM_PROMPT
    if problem:
        system += "\n\nKONTEKS LATIHAN:\n" + problem_context(problem, stage, error_code, hint_level, student_input)
    if mode == "reflect":
        system += ("\n\nMODE REFLEKSI: siswa sudah menyelesaikan soal dan menulis refleksi. "
                   "Akui bagian yang tepat, luruskan miskonsepsi bila ada, lalu ajak siswa menyatakan "
                   "aturan umum yang berlaku untuk semua persegi. Jawaban soal ini sudah diketahui siswa.")
    elif mode == "chat":
        system += ("\n\nMODE TANYA BEBAS: jika siswa memberi soal, bimbing langkah demi langkah dengan "
                   "pertanyaan, jangan selesaikan sampai jawaban akhir.")
    messages = [{"role": "system", "content": system}]
    for turn in (history or [])[-8:]:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_text})
    return messages


def call_gemini(messages: list[dict], api_key: str, model: str, base_url: str,
                timeout: float = 25) -> str:
    """Memanggil Gemini lewat endpoint kompatibel OpenAI (Chat Completions) dengan pustaka bawaan.

    Model Gemini 3 "berpikir" dulu sebelum menjawab dan proses itu ikut memakai kuota token.
    Karena itu reasoning_effort dibuat rendah (cepat & hemat) dan max_tokens diberi ruang lebih;
    panjang balasan tetap dibatasi oleh SYSTEM_PROMPT (≤ 3 kalimat) dan pemotongan di bawah.
    """
    body = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.4,
        "reasoning_effort": "low",
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/chat/completions", data=body, method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        reply = data["choices"][0]["message"]["content"]
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, ValueError) as exc:
        raise TutorError(str(exc)) from exc
    reply = (reply or "").strip()
    if not reply:
        raise TutorError("Balasan kosong.")
    return reply[:900]


UNIT_WORDS = {"cm": r"(?:cm|centimeter|sentimeter)", "m": r"(?:m|meter)"}


def _num_pattern(value: float) -> str:
    text = str(int(value)) if float(value).is_integer() else str(value)
    variants = {text, text.replace(".", ",")}
    return "(?:" + "|".join(re.escape(v) for v in variants) + ")"


def leaks_answer(reply: str, problem: dict) -> bool:
    """True bila balasan AI memuat jawaban akhir soal (angka + satuan, atau '= angka')."""
    answer = problem["answer"]
    num = _num_pattern(answer["value"])
    unit = answer["unit"]
    base_unit = unit.rstrip("²")
    word = UNIT_WORDS.get(base_unit, re.escape(base_unit))
    if unit.endswith("²"):
        unit_re = rf"{word}\s*(?:²|2|\^2|persegi)"
    else:
        unit_re = rf"{word}\b(?!\s*(?:²|\^|persegi))"
    if re.search(rf"(?<![\d.,]){num}\s*{unit_re}", reply, flags=re.IGNORECASE):
        return True
    # "= 60" hanya dianggap bocor bila angkanya tidak sama dengan angka yang diketahui di soal
    given_values = {float(v) for v in problem["given"].values()}
    if float(answer["value"]) not in given_values:
        if re.search(rf"=\s*{num}(?![\d.,])", reply):
            return True
    return False


def fallback_reply(mode: str, problem: dict | None, hint_level: int, error_code: str | None) -> str:
    """Petunjuk bawaan ketika AI tidak tersedia. Tetap mengikuti tingkat bantuan."""
    if mode == "reflect":
        return ("Terima kasih sudah menulis refleksi! Coba sebutkan satu aturan yang berlaku untuk "
                "semua persegi, misalnya hubungan antara sisi, keliling, dan luas.")
    if problem:
        hints = problem["hints"]
        hint = hints[max(0, min(hint_level, len(hints) - 1))]
        if error_code in ERROR_TEXT and error_code != "WRONG_GENERIC":
            return f"Sepertinya kamu {ERROR_TEXT[error_code]}. {hint}"
        return hint
    return ("Tutor AI sedang tidak tersedia. Sambil menunggu, coba buka menu Materi atau "
            "Eksplorasi untuk melihat rumus keliling (K = 4 × s) dan luas (L = s × s).")
