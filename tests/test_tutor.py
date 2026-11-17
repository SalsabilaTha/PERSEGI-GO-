"""Tes Tutor AI (RMT). Gemini selalu di-mock: tidak ada panggilan jaringan."""
import pytest

from backend import content, create_app, tutor
from conftest import TEST_SECRET, TEST_SUPABASE, activity, auth, make_token


@pytest.fixture
def ai_client():
    app = create_app({
        "APP_ENV": "test", "DATABASE_URL": "sqlite://", "SUPABASE_URL": TEST_SUPABASE,
        "SUPABASE_JWT_SECRET": TEST_SECRET, "DEV_LOGIN": False,
        "GEMINI_API_KEY": "kunci-uji", "GEMINI_MODEL": "gemini-3.8-flash",
        "GEMINI_BASE_URL": "http://ai.invalid",
    })
    return app.test_client()


@pytest.fixture
def fake_ai(monkeypatch):
    """Mengganti Gemini dengan fungsi palsu; menyimpan pesan yang dikirim."""
    sent = {}

    def fake(messages, api_key, model, base_url, timeout=25):
        sent["messages"] = messages
        return sent.get("reply", "Coba lihat lagi: yang ditanya pinggiran atau permukaan?")

    monkeypatch.setattr(tutor, "call_gemini", fake)
    return sent


def ask(client, token, **body):
    return client.post("/api/tutor", headers=auth(token), json=body)


def test_prompt_memuat_rmt_dan_tanpa_identitas(ai_client, fake_ai):
    t = make_token(email="rahasia@sekolah.id", name="Nama Asli Siswa")
    r = ask(ai_client, t, mode="hint", problem_id="p-m6-01", stage=3,
            error_code="AREA_INSTEAD_OF_PERIMETER", hint_level=1, message="Aku bingung")
    assert r.status_code == 200
    assert r.json["source"] == "ai"
    assert r.json["phase"] == "elaborasi"
    system = fake_ai["messages"][0]["content"]
    for kata in ("Rigorous Mathematical Thinking", "INPUT", "ELABORASI", "OUTPUT",
                 "JANGAN PERNAH", "transendensi", "trial-and-error", "taman sekolah"):
        assert kata in system
    semua = str(fake_ai["messages"])
    assert "rahasia@sekolah.id" not in semua and "Nama Asli Siswa" not in semua


def test_penjaga_jawaban_mengganti_balasan_bocor(ai_client, fake_ai):
    fake_ai["reply"] = "Jawabannya 60 m karena 4 × 15 = 60."
    r = ask(ai_client, make_token(), mode="hint", problem_id="p-m6-01", stage=3, message="tolong")
    assert r.json["source"] == "fallback"
    assert "60" not in r.json["reply"]


def test_refleksi_boleh_menyebut_jawaban(ai_client, fake_ai):
    fake_ai["reply"] = "Benar, pagarnya 60 m. Aturan apa yang berlaku untuk semua persegi?"
    r = ask(ai_client, make_token(), mode="reflect", problem_id="p-m6-01", stage=5,
            message="Keliling itu jumlah 4 sisi")
    assert r.json["source"] == "ai" and r.json["phase"] == "refleksi"


def test_leaks_answer():
    p = content.problems_by_id()["p-m6-01"]                 # jawaban 60 m
    assert tutor.leaks_answer("Hasilnya 60 meter.", p)
    assert tutor.leaks_answer("K = 4 × 15 = 60", p)
    assert not tutor.leaks_answer("Coba hitung 4 × 15 sendiri ya.", p)
    luas = content.problems_by_id()["p-m3-02"]              # jawaban 400 cm²
    assert tutor.leaks_answer("luasnya 400 cm²", luas)
    assert not tutor.leaks_answer("Satuannya cm² karena luas.", luas)
    sama = content.problems_by_id()["p-m6-02"]              # L = 16 m², jawaban 16 m
    assert not tutor.leaks_answer("Diketahui L = 16 m².", sama)
    assert tutor.leaks_answer("Panjang lisnya 16 m.", sama)


def test_tanpa_kunci_memakai_petunjuk_bawaan(client):
    r = ask(client, make_token(), mode="hint", problem_id="p-m5-03", stage=3,
            error_code="DIVIDED_AREA_BY_4", hint_level=0)
    assert r.status_code == 200 and r.json["source"] == "fallback"
    assert "membagi luas dengan 4" in r.json["reply"]


def test_ai_gagal_memakai_petunjuk_bawaan(ai_client, monkeypatch):
    def boom(*a, **k):
        raise tutor.TutorError("timeout")
    monkeypatch.setattr(tutor, "call_gemini", boom)
    r = ask(ai_client, make_token(), mode="chat", message="Apa itu keliling?")
    assert r.status_code == 200 and r.json["source"] == "fallback"


def test_validasi_input(ai_client, fake_ai):
    t = make_token()
    assert ask(ai_client, t, mode="hack", message="x").status_code == 400
    assert ask(ai_client, t, mode="chat", message="x" * 501).status_code == 400
    assert ask(ai_client, t, mode="hint", message="x").status_code == 400          # tanpa soal
    assert ask(ai_client, t, mode="hint", problem_id="p-x", message="x").status_code == 400
    assert ask(ai_client, t, mode="chat", message="x", history=[{"role": "system", "content": "x"}]).status_code == 400
    assert ai_client.post("/api/tutor", json={"mode": "chat", "message": "x"}).status_code == 401


def test_batas_permintaan(ai_client, fake_ai):
    t = make_token()
    for _ in range(20):
        assert ask(ai_client, t, mode="chat", message="halo").status_code == 200
    assert ask(ai_client, t, mode="chat", message="halo").status_code == 429


def test_riwayat_terpisah_dan_terhapus_bersama_akun(ai_client, fake_ai):
    a, b = make_token(), make_token()
    ask(ai_client, a, mode="chat", message="Apa beda luas dan keliling?")
    ask(ai_client, a, mode="hint", problem_id="p-m2-02", stage=0, message="bantu")
    chat = ai_client.get("/api/tutor/history", headers=auth(a)).json["items"]
    assert [m["role"] for m in chat] == ["user", "assistant"]
    assert len(ai_client.get("/api/tutor/history?problem_id=p-m2-02", headers=auth(a)).json["items"]) == 2
    assert ai_client.get("/api/tutor/history", headers=auth(b)).json["items"] == []
    assert len(ai_client.get("/api/export", headers=auth(a)).json["percakapan_tutor"]) == 4
    ai_client.delete("/api/me", headers=auth(a))
    assert ai_client.get("/api/tutor/history", headers=auth(a)).json["items"] == []


def test_practice_done_mencatat_tutor_calls(client):
    t = make_token()
    r = client.post("/api/activities", headers=auth(t), json={"activities": [activity(
        "practice_done", {"problem_id": "p-m2-01", "tries": 1, "hints_used": 0, "errors": [],
                          "correct": True, "tutor_calls": 3})]})
    assert r.json["results"][0]["xp"] == 10


def test_config_js_tidak_membocorkan_kunci(ai_client):
    body = ai_client.get("/config.js").get_data(as_text=True)
    assert "kunci-uji" not in body and '"aiEnabled": true' in body


def test_call_gemini_format_permintaan(monkeypatch):
    """Memastikan format permintaan HTTP ke Gemini (kompatibel OpenAI) tanpa jaringan."""
    captured = {}

    class FakeResp:
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self): return b'{"choices":[{"message":{"content":"Coba pikirkan lagi."}}]}'

    def fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["auth"] = req.get_header("Authorization")
        captured["body"] = req.data
        return FakeResp()

    monkeypatch.setattr(tutor.urllib.request, "urlopen", fake_urlopen)
    out = tutor.call_gemini([{"role": "user", "content": "hai"}], "AIza-x", "gemini-3.8-flash", "https://generativelanguage.googleapis.com/v1beta/openai")
    assert out == "Coba pikirkan lagi."
    assert captured["url"] == "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    assert captured["auth"] == "Bearer AIza-x"
    assert b'"model": "gemini-3.8-flash"' in captured["body"]
    assert b'"reasoning_effort": "low"' in captured["body"]
