"""Entrypoint Vercel (fungsi serverless Python).

Vercel menjalankan file di folder api/ sebagai fungsi. Semua permintaan diarahkan ke sini
oleh vercel.json (rewrites), lalu ditangani aplikasi Flask yang sama dengan `python app.py`.
"""
import sys
from pathlib import Path

# Pastikan paket backend/ di folder induk bisa di-import
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import create_app  # noqa: E402

app = create_app()
