"""Tes kesiapan deploy (Vercel serverless & Render)."""
import importlib
import json
from pathlib import Path

from sqlalchemy.pool import NullPool, QueuePool, StaticPool

from backend import config as config_module
from backend.db import make_engine

ROOT = Path(__file__).resolve().parent.parent


def test_vercel_json_valid():
    cfg = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    assert cfg["regions"] == ["sin1"]                       # dekat Supabase Singapura
    fn = cfg["functions"]["api/index.py"]
    assert fn["maxDuration"] >= 30                           # cukup untuk DeepSeek (timeout 25 s)
    for folder in ("backend", "frontend", "content"):
        assert folder in fn["includeFiles"]
    assert cfg["rewrites"][0]["destination"] == "/api/index"


def test_vercelignore_tidak_mengunggah_rahasia():
    ignored = (ROOT / ".vercelignore").read_text(encoding="utf-8").split()
    for item in (".env", ".venv/", "instance/", "tests/"):
        assert item in ignored


def test_engine_serverless_tanpa_pool():
    pg = "postgresql+psycopg://u:p@localhost:6543/postgres"
    assert isinstance(make_engine(pg, serverless=True).pool, NullPool)
    assert isinstance(make_engine(pg, serverless=False).pool, QueuePool)
    assert isinstance(make_engine("sqlite://", serverless=True).pool, StaticPool)


def test_config_mendeteksi_vercel(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    assert config_module.load_config()["DB_SERVERLESS"] is True
    monkeypatch.delenv("VERCEL")
    monkeypatch.setenv("DB_SERVERLESS", "")
    assert config_module.load_config()["DB_SERVERLESS"] is False


def test_entrypoint_vercel_production(monkeypatch, tmp_path):
    """Simulasi lingkungan Vercel: APP_ENV=production, VERCEL=1, database dari env."""
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SUPABASE_URL", "https://contoh123.supabase.co")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "anon-uji")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "rahasia-uji-yang-panjang-sekali-0000000000")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{(tmp_path / 'v.db').as_posix()}")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-uji")
    import api.index as entry
    importlib.reload(entry)
    app = entry.app
    assert app.config["DB_SERVERLESS"] is True
    assert app.config["DEV_LOGIN"] is False
    c = app.test_client()
    assert c.get("/").status_code == 200
    assert c.get("/sw.js").headers["Service-Worker-Allowed"] == "/"
    assert c.get("/content/modules.json").status_code == 200
    assert c.get("/manifest.webmanifest").status_code == 200
    body = c.get("/config.js").get_data(as_text=True)
    assert '"aiEnabled": true' in body and "sk-uji" not in body
    assert c.post("/api/dev-login", json={"name": "a", "email": "a@b.co"}).status_code == 404
