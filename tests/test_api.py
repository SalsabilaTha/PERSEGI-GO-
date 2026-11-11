from conftest import activity, auth, make_token


def post(client, token, *items):
    return client.post("/api/activities", headers=auth(token), json={"activities": list(items)})


def test_alur_lengkap_materi_kuis_latihan(client):
    t = make_token()
    r = post(client, t,
             activity("lesson_done", {"module_id": "m1"}),
             activity("quiz_done", {"quiz_id": "kuis-dasar", "answers": [2, 2, 3, 0, 1]}),
             activity("practice_done", {"problem_id": "p-m5-03", "tries": 1, "hints_used": 0,
                                        "errors": [], "correct": True, "effort": 4}))
    assert r.status_code == 200
    assert [x["xp"] for x in r.json["results"]] == [10, 50, 10]
    prog = r.json["progress"]
    assert prog["xp"] == 70
    assert prog["modules_done"] == ["m1"]
    assert prog["best_quiz_percent"] == 100
    assert prog["level"]["name"] == "PENJELAJAH"
    assert {"pembaca_tekun", "berani_mencoba", "bintang_baru", "pembelajar_aktif"} <= set(r.json["new_badges"])

    hist = client.get("/api/history", headers=auth(t)).json["items"]
    assert len(hist) == 3


def test_skor_kuis_dinilai_ulang_di_server(client):
    t = make_token()
    item = activity("quiz_done", {"quiz_id": "kuis-dasar", "answers": [0, 0, 0, 0, 0], "score": 5})
    r = post(client, t, item)
    assert r.json["results"][0]["score"] == 1          # hanya soal 4 yang benar
    assert r.json["progress"]["xp"] == 10


def test_client_id_ganda_tidak_menggandakan(client):
    t = make_token()
    item = activity("lesson_done", {"module_id": "m2"}, client_id="abcdef12-0000-0000-0000-000000000001")
    post(client, t, item)
    r = post(client, t, item)
    assert r.json["results"][0]["duplicate"] is True
    assert r.json["progress"]["xp"] == 10


def test_materi_sama_tidak_dapat_xp_dua_kali(client):
    t = make_token()
    post(client, t, activity("lesson_done", {"module_id": "m3"}))
    r = post(client, t, activity("lesson_done", {"module_id": "m3"}))
    assert r.json["results"][0]["xp"] == 0


def test_aktivitas_tidak_valid_ditolak(client):
    t = make_token()
    r = post(client, t,
             activity("lesson_done", {"module_id": "m99"}),
             activity("hack_xp", {}),
             activity("practice_done", {"problem_id": "p-m2-01", "tries": 0, "hints_used": 0,
                                        "errors": [], "correct": True}))
    assert len(r.json["rejected"]) == 3
    assert r.json["progress"]["xp"] == 0


def test_data_antar_user_terpisah(client):
    a, b = make_token(email="a@x.id"), make_token(email="b@x.id")
    post(client, a, activity("lesson_done", {"module_id": "m1"}))
    assert client.get("/api/progress", headers=auth(b)).json["xp"] == 0
    assert client.get("/api/history", headers=auth(b)).json["items"] == []


def test_ekspor_dan_hapus_akun(client):
    t = make_token(sub="11111111-2222-3333-4444-555555555555")
    post(client, t, activity("lesson_done", {"module_id": "m1"}))
    data = client.get("/api/export", headers=auth(t)).json
    assert len(data["aktivitas"]) == 1
    assert client.delete("/api/me", headers=auth(t)).json["ok"] is True
    # Login lagi = akun baru yang kosong
    assert client.get("/api/progress", headers=auth(t)).json["xp"] == 0


def test_batch_terlalu_besar(client):
    t = make_token()
    items = [activity("lesson_done", {"module_id": "m1"}) for _ in range(51)]
    assert post(client, t, *items).status_code == 400


def test_halaman_dan_konten_tersaji(client):
    assert client.get("/").status_code == 200
    assert client.get("/sw.js").headers["Service-Worker-Allowed"] == "/"
    assert client.get("/content/modules.json").status_code == 200
    assert client.get("/content/rahasia.json").status_code == 404
    assert client.get("/manifest.webmanifest").status_code == 200
