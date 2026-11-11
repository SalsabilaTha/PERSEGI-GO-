"""Verifikasi token login Supabase (JWT) dan decorator @login_required."""
import time
from collections import defaultdict, deque
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request
from sqlalchemy import select

from .db import now_utc, users

_jwks_clients: dict[str, jwt.PyJWKClient] = {}

RATE_LIMIT = 60          # maksimal request per menit per user
_request_log: dict[str, deque] = defaultdict(deque)


class AuthError(Exception):
    pass


def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    # Kunci publik Supabase di-cache agar tidak diunduh setiap request.
    if supabase_url not in _jwks_clients:
        _jwks_clients[supabase_url] = jwt.PyJWKClient(
            f"{supabase_url}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600
        )
    return _jwks_clients[supabase_url]


def verify_token(token: str) -> dict:
    cfg = current_app.config
    try:
        alg = jwt.get_unverified_header(token).get("alg")
    except jwt.PyJWTError as exc:
        raise AuthError("Token tidak valid.") from exc

    if alg == "HS256":
        # Proyek Supabase lama (JWT secret) atau mode uji lokal.
        key = cfg["SUPABASE_JWT_SECRET"] or (cfg["DEV_JWT_SECRET"] if cfg["DEV_LOGIN"] else "")
        if not key:
            raise AuthError("Server belum dikonfigurasi untuk token HS256.")
    elif alg in ("ES256", "RS256"):
        if not cfg["SUPABASE_URL"]:
            raise AuthError("SUPABASE_URL belum diatur.")
        try:
            key = _jwks_client(cfg["SUPABASE_URL"]).get_signing_key_from_jwt(token).key
        except jwt.PyJWTError as exc:
            raise AuthError("Kunci token tidak dikenal.") from exc
    else:
        raise AuthError("Algoritma token tidak diizinkan.")

    options = {"require": ["exp", "sub"]}
    kwargs = {"algorithms": [alg], "audience": "authenticated", "options": options, "leeway": 30}
    if cfg["SUPABASE_URL"]:
        kwargs["issuer"] = f"{cfg['SUPABASE_URL']}/auth/v1"
    try:
        return jwt.decode(token, key, **kwargs)
    except jwt.PyJWTError as exc:
        raise AuthError("Sesi tidak valid atau sudah berakhir.") from exc


def make_dev_token(uid: str, email: str, name: str, secret: str, hours: int = 24 * 30) -> str:
    """Token untuk mode uji lokal (tanpa Supabase). Tidak pernah aktif di production."""
    now = int(time.time())
    payload = {
        "sub": uid, "email": email, "aud": "authenticated", "role": "authenticated",
        "iat": now, "exp": now + hours * 3600,
        "user_metadata": {"name": name}, "app_metadata": {"provider": "dev"},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _rate_limited(uid: str) -> bool:
    now = time.monotonic()
    log = _request_log[uid]
    while log and now - log[0] > 60:
        log.popleft()
    if len(log) >= RATE_LIMIT:
        return True
    log.append(now)
    return False


def _upsert_user(claims: dict) -> dict:
    """Ambil user dari database; buat baru saat login pertama."""
    engine = current_app.extensions["db_engine"]
    uid = str(claims["sub"])
    meta = claims.get("user_metadata") or {}
    name = (meta.get("name") or meta.get("full_name") or "").strip()[:80] or None
    email = (claims.get("email") or "").strip()[:320]
    provider = ((claims.get("app_metadata") or {}).get("provider") or "email")[:20]

    with engine.begin() as conn:
        row = conn.execute(select(users).where(users.c.supabase_uid == uid)).mappings().first()
        if row is None:
            conn.execute(users.insert().values(
                supabase_uid=uid, email=email, name=name, provider=provider,
                created_at=now_utc(), last_login=now_utc(),
            ))
            row = conn.execute(select(users).where(users.c.supabase_uid == uid)).mappings().first()
        return dict(row)


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify(error="Silakan login terlebih dahulu."), 401
        try:
            claims = verify_token(header[7:].strip())
        except AuthError as exc:
            return jsonify(error=str(exc)), 401
        if _rate_limited(str(claims["sub"])):
            return jsonify(error="Terlalu banyak permintaan. Coba lagi sebentar."), 429
        g.claims = claims
        g.user = _upsert_user(claims)
        return view(*args, **kwargs)

    return wrapper
