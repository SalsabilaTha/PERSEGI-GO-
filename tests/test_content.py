"""Memastikan semua soal & kuis benar secara matematis dan formatnya lengkap."""
import re

from backend import content, geometry


def test_rumus_dasar():
    assert geometry.area(8) == 64
    assert geometry.perimeter(8) == 32
    assert geometry.side_from_area(121) == 11
    assert geometry.side_from_area(120) is None
    assert geometry.side_from_perimeter(36) == 9
    assert geometry.plan_for("L", "K") == ["s_from_L", "K_from_s"]
    assert geometry.plan_for("s", "L") == ["L_from_s"]


def test_jawaban_bank_soal_benar():
    for p in content.load("problems")["problems"]:
        expected = geometry.solve(p["given"], p["asked"])
        assert expected == p["answer"]["value"], p["id"]
        assert p["answer"]["unit"] == geometry.unit_for(p["asked"], p["unit"]), p["id"]


def test_format_soal_lengkap():
    problems = content.load("problems")["problems"]
    ids = [p["id"] for p in problems]
    assert len(ids) == len(set(ids))
    for p in problems:
        assert p["module"] in content.module_ids()
        assert p["level"] in {"example", "complete", "independent"}
        assert p["unit"] in {"cm", "m"}
        assert len(p["hints"]) == 3
        assert p["twin"] in ids
        roles = [seg["role"] for seg in p["story"] if isinstance(seg, dict)]
        assert roles.count("known") >= 1 and roles.count("asked") >= 1, p["id"]
        # Angka yang diketahui harus muncul di cerita
        (_, value), = p["given"].items()
        story = "".join(s if isinstance(s, str) else s["t"] for s in p["story"])
        assert re.search(rf"\b{value}\b", story), p["id"]


def test_kuis():
    quiz = content.load("quiz")
    assert len(quiz["questions"]) == 5
    for q in quiz["questions"]:
        assert len(q["options"]) == 4 and 0 <= q["answer"] <= 3
    # Cek kunci jawaban soal hitungan
    q = quiz["questions"]
    assert q[2]["options"][q[2]["answer"]] == f"{geometry.area(6)} cm²"
    assert q[3]["options"][q[3]["answer"]] == f"{geometry.perimeter(9)} cm"
    assert q[4]["options"][q[4]["answer"]] == f"{geometry.side_from_area(64)} cm"


def test_modul_lengkap():
    modules = content.load("modules")["modules"]
    assert [m["id"] for m in modules] == ["m1", "m2", "m3", "m4", "m5", "m6"]
    for m in modules:
        assert len(m["remember"]) == 3
        assert m["steps"]
        for step in m["steps"]:
            assert len(step["text"]) <= 3, (m["id"], step["title"])
