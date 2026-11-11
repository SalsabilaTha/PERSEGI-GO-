"""Mencadangkan semua tabel database ke file JSON (satu file per tabel).

Jalankan: python scripts/backup_db.py
Hasil: backups/<tanggal-jam>/<tabel>.json  (folder backups/ tidak di-upload ke GitHub)
"""
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import select  # noqa: E402

from backend.config import load_config  # noqa: E402
from backend.db import ALL_TABLES, make_engine  # noqa: E402


def to_json(value):
    return value.isoformat() if isinstance(value, datetime) else value


def main() -> None:
    engine = make_engine(load_config()["DATABASE_URL"])
    folder = ROOT / "backups" / datetime.now().strftime("%Y-%m-%d_%H%M%S")
    folder.mkdir(parents=True, exist_ok=True)
    with engine.connect() as conn:
        for table in ALL_TABLES:
            rows = [{k: to_json(v) for k, v in r.items()} for r in conn.execute(select(table)).mappings()]
            (folder / f"{table.name}.json").write_text(
                json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"{table.name}: {len(rows)} baris")
    print(f"Cadangan tersimpan di {folder}")


if __name__ == "__main__":
    main()
