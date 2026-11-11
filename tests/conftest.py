import time
import uuid

import jwt
import pytest

from backend import create_app

TEST_SECRET = "test-secret-yang-cukup-panjang-untuk-hs256-000000"
TEST_SUPABASE = "https://test-project.supabase.co"


@pytest.fixture
def app():
    return create_app({
        "APP_ENV": "test",
        "DATABASE_URL": "sqlite://",
        "SUPABASE_URL": TEST_SUPABASE,
        "SUPABASE_JWT_SECRET": TEST_SECRET,
        "DEV_LOGIN": False,
    })


@pytest.fixture
def client(app):
    return app.test_client()


def make_token(sub=None, email="siswa@example.com", name="Siswa", exp_offset=3600,
               aud="authenticated", secret=TEST_SECRET, iss=f"{TEST_SUPABASE}/auth/v1"):
    now = int(time.time())
    payload = {
        "sub": sub or str(uuid.uuid4()), "email": email, "aud": aud, "iss": iss,
        "iat": now, "exp": now + exp_offset, "role": "authenticated",
        "user_metadata": {"name": name}, "app_metadata": {"provider": "email"},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def activity(a_type, payload, client_id=None):
    return {"client_id": client_id or str(uuid.uuid4()), "type": a_type, "payload": payload,
            "created_at": "2026-11-11T10:00:00Z"}
