"""Pembuat aplikasi Flask: API + penyaji file frontend (PWA)."""
import json
import mimetypes

from flask import Flask, Response, abort, jsonify, request, send_from_directory

from . import content
from .api import bp as api_bp
from .config import ROOT_DIR, load_config
from .db import init_db, make_engine

FRONTEND_DIR = ROOT_DIR / "frontend"

# Windows kadang salah mendaftarkan tipe file; modul JS wajib "application/javascript".
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("application/manifest+json", ".webmanifest")

CSP = "; ".join([
    "default-src 'self'",
    "script-src 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co "
    "https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
])


def create_app(overrides: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
    app.config.update(load_config())
    if overrides:
        app.config.update(overrides)

    engine = make_engine(app.config["DATABASE_URL"], serverless=app.config["DB_SERVERLESS"])
    init_db(engine)
    app.extensions["db_engine"] = engine
    app.register_blueprint(api_bp)

    @app.get("/")
    def index():
        resp = send_from_directory(FRONTEND_DIR, "index.html")
        resp.headers["Cache-Control"] = "no-cache"
        return resp

    @app.get("/sw.js")
    def service_worker():
        resp = send_from_directory(FRONTEND_DIR, "sw.js", mimetype="application/javascript")
        resp.headers["Cache-Control"] = "no-cache"
        resp.headers["Service-Worker-Allowed"] = "/"
        return resp

    @app.get("/config.js")
    def config_js():
        # Hanya nilai yang aman untuk browser (URL & kunci anon). Tanpa rahasia.
        cfg = {
            "mode": "dev" if app.config["DEV_LOGIN"] else "supabase",
            "supabaseUrl": app.config["SUPABASE_URL"],
            "supabaseAnonKey": app.config["SUPABASE_ANON_KEY"],
            # Hanya status AI; kunci DeepSeek tidak pernah dikirim ke browser.
            "aiEnabled": bool(app.config["DEEPSEEK_API_KEY"]),
        }
        body = f"window.APP_CONFIG = {json.dumps(cfg)};\n"
        return Response(body, mimetype="application/javascript",
                        headers={"Cache-Control": "no-cache"})

    @app.get("/content/<name>.json")
    def content_file(name: str):
        if name not in content.CONTENT_FILES:
            abort(404)
        return send_from_directory(content.CONTENT_DIR, f"{name}.json",
                                   mimetype="application/json", max_age=0)

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("Content-Security-Policy", CSP)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.path.startswith("/api/"):
            resp.headers["Cache-Control"] = "no-store"
        return resp

    @app.errorhandler(404)
    def not_found(err):
        if request.path.startswith("/api/"):
            return jsonify(error="Tidak ditemukan."), 404
        return err

    return app
