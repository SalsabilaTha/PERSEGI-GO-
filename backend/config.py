"""Membaca konfigurasi dari environment variable (.env saat lokal)."""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


def _normalize_db_url(url: str) -> str:
    # Supabase memberi "postgresql://", SQLAlchemy butuh nama driver psycopg 3.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def load_config() -> dict:
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    db_url = os.getenv("DATABASE_URL", "").strip()

    if not db_url:
        if app_env == "production":
            raise RuntimeError("DATABASE_URL wajib diisi pada mode production.")
        (ROOT_DIR / "instance").mkdir(exist_ok=True)
        db_url = f"sqlite:///{(ROOT_DIR / 'instance' / 'persegi.db').as_posix()}"

    if app_env == "production" and not supabase_url:
        raise RuntimeError("SUPABASE_URL wajib diisi pada mode production.")

    return {
        "APP_ENV": app_env,
        "SECRET_KEY": os.getenv("FLASK_SECRET_KEY") or secrets.token_hex(32),
        "SUPABASE_URL": supabase_url,
        "SUPABASE_ANON_KEY": os.getenv("SUPABASE_ANON_KEY", "").strip(),
        "SUPABASE_JWT_SECRET": os.getenv("SUPABASE_JWT_SECRET", "").strip(),
        "DATABASE_URL": _normalize_db_url(db_url),
        # Mode uji lokal: hanya aktif bila Supabase belum diatur dan bukan production.
        "DEV_LOGIN": app_env != "production" and not supabase_url,
        "DEV_JWT_SECRET": "persegi-go-dev-only-secret-0123456789abcdef",
        # Tutor AI (DeepSeek). Kunci hanya dipakai di server, tidak pernah dikirim ke browser.
        "DEEPSEEK_API_KEY": os.getenv("DEEPSEEK_API_KEY", "").strip(),
        "DEEPSEEK_MODEL": os.getenv("DEEPSEEK_MODEL", "").strip() or "deepseek-chat",
        "DEEPSEEK_BASE_URL": (os.getenv("DEEPSEEK_BASE_URL", "").strip() or "https://api.deepseek.com").rstrip("/"),
        "AI_RATE_LIMIT": 20,          # maksimal pertanyaan ke tutor per siswa ...
        "AI_RATE_WINDOW_MIN": 10,     # ... dalam 10 menit (mengendalikan biaya API)
        "MAX_CONTENT_LENGTH": 64 * 1024,
        "ROOT_DIR": ROOT_DIR,
    }
