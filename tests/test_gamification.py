from backend.gamification import Stats, earned_badges, level_for, xp_for


def test_level():
    assert level_for(0) == (1, "PEMULA")
    assert level_for(49) == (1, "PEMULA")
    assert level_for(50) == (2, "PENJELAJAH")
    assert level_for(150) == (3, "PEMECAH MASALAH")
    assert level_for(1000) == (4, "AHLI PERSEGI")


def test_xp_kuis_ulang_hanya_selisih():
    s = Stats(best_quiz_score=3)
    assert xp_for("quiz_done", {"score": 5}, s) == 20
    assert xp_for("quiz_done", {"score": 2}, s) == 0


def test_xp_latihan():
    s = Stats()
    p = {"problem_id": "p1", "correct": True, "hints_used": 0}
    assert xp_for("practice_done", p, s) == 10
    assert xp_for("practice_done", {**p, "hints_used": 2}, s) == 5
    assert xp_for("practice_done", {**p, "correct": False}, s) == 0
    s.solved_problems.add("p1")
    assert xp_for("practice_done", p, s) == 0


def test_lencana():
    s = Stats(xp=60, modules_done={"m1"}, quizzes=1, best_quiz_percent=80)
    assert set(earned_badges(s)) == {"pembaca_tekun", "berani_mencoba", "bintang_baru", "pembelajar_aktif"}
    s = Stats(m6_problems={"a", "b"}, solved_problems={"a", "b", "c"})
    assert "penjelajah_cerita" in earned_badges(s)
    assert "penjelajah_cerita" not in earned_badges(Stats())
