from conftest import auth, make_token


def test_tanpa_token_ditolak(client):
    assert client.get("/api/me").status_code == 401


def test_token_valid_diterima_dan_user_dibuat(client):
    r = client.get("/api/me", headers=auth(make_token(email="a@icloud.com", name="Ani")))
    assert r.status_code == 200
    assert r.json["email"] == "a@icloud.com"
    assert r.json["name"] == "Ani"


def test_token_kedaluwarsa_ditolak(client):
    assert client.get("/api/me", headers=auth(make_token(exp_offset=-3600))).status_code == 401


def test_audience_salah_ditolak(client):
    assert client.get("/api/me", headers=auth(make_token(aud="anon"))).status_code == 401


def test_issuer_salah_ditolak(client):
    token = make_token(iss="https://lain.supabase.co/auth/v1")
    assert client.get("/api/me", headers=auth(token)).status_code == 401


def test_secret_salah_ditolak(client):
    token = make_token(secret="secret-palsu-yang-panjangnya-juga-cukup-000000000")
    assert client.get("/api/me", headers=auth(token)).status_code == 401


def test_dev_login_mati_saat_supabase_diatur(client):
    r = client.post("/api/dev-login", json={"name": "A", "email": "a@b.co"})
    assert r.status_code == 404


def test_config_js_tanpa_rahasia(client):
    body = client.get("/config.js").get_data(as_text=True)
    assert "test-secret" not in body
    assert '"mode": "supabase"' in body
