"""Definisi tabel (SQLAlchemy Core) dan koneksi database.

Tabel yang sama dipakai untuk SQLite (lokal/tes) dan PostgreSQL Supabase (produksi).
"""
from datetime import datetime, timezone

from sqlalchemy import (
    JSON, BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, MetaData,
    SmallInteger, String, Table, UniqueConstraint, create_engine, text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.pool import StaticPool

# BIGINT di Postgres, INTEGER di SQLite (agar autoincrement SQLite berjalan).
BigId = BigInteger().with_variant(Integer(), "sqlite")

metadata = MetaData()

users = Table(
    "users", metadata,
    Column("id", BigId, primary_key=True, autoincrement=True),
    Column("supabase_uid", String(64), unique=True, nullable=False),
    Column("email", String(320), nullable=False),
    Column("name", String(80)),
    Column("provider", String(20)),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("last_login", DateTime(timezone=True), nullable=False),
)

activities = Table(
    "activities", metadata,
    Column("id", BigId, primary_key=True, autoincrement=True),
    Column("user_id", BigId, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("client_id", String(64), nullable=False),
    Column("type", String(30), nullable=False),
    Column("payload", JSON, nullable=False),
    Column("xp", Integer, nullable=False, default=0),
    Column("created_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("user_id", "client_id", name="uq_activity_client"),
)

module_progress = Table(
    "module_progress", metadata,
    Column("user_id", BigId, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("module_id", String(20), primary_key=True),
    Column("step_reached", Integer, nullable=False, default=0),
    Column("done_at", DateTime(timezone=True)),
)

quiz_results = Table(
    "quiz_results", metadata,
    Column("id", BigId, primary_key=True, autoincrement=True),
    Column("user_id", BigId, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("quiz_id", String(30), nullable=False),
    Column("score", Integer, nullable=False),
    Column("total", Integer, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

practice_attempts = Table(
    "practice_attempts", metadata,
    Column("id", BigId, primary_key=True, autoincrement=True),
    Column("user_id", BigId, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("problem_id", String(30), nullable=False),
    Column("tries", Integer, nullable=False),
    Column("hints_used", Integer, nullable=False),
    Column("errors", JSON, nullable=False),
    Column("correct", Boolean, nullable=False),
    Column("effort", SmallInteger),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

ALL_TABLES = [users, activities, module_progress, quiz_results, practice_attempts]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def make_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
        if url in ("sqlite://", "sqlite:///:memory:"):
            kwargs["poolclass"] = StaticPool  # satu koneksi bersama untuk tes in-memory
        return create_engine(url, **kwargs)
    # pool_pre_ping: koneksi lama ke Supabase bisa terputus saat server tidur.
    return create_engine(url, pool_pre_ping=True, pool_size=3, max_overflow=2)


def init_db(engine: Engine) -> None:
    """Membuat tabel bila belum ada. Di Postgres, RLS diaktifkan agar browser
    tidak bisa membaca tabel lewat API Supabase (hanya Flask yang mengakses)."""
    metadata.create_all(engine)
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            for table in ALL_TABLES:
                conn.execute(text(f'alter table "{table.name}" enable row level security'))
