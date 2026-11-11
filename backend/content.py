"""Memuat konten pelajaran dari folder content/ (dibaca sekali lalu disimpan)."""
import json
from functools import lru_cache
from pathlib import Path

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
CONTENT_FILES = {"modules", "quiz", "problems", "badges"}


@lru_cache(maxsize=None)
def load(name: str):
    if name not in CONTENT_FILES:
        raise KeyError(name)
    with open(CONTENT_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def module_ids() -> set[str]:
    return {m["id"] for m in load("modules")["modules"]}


def quiz_by_id(quiz_id: str) -> dict | None:
    quiz = load("quiz")
    return quiz if quiz["id"] == quiz_id else None


def problems_by_id() -> dict:
    return {p["id"]: p for p in load("problems")["problems"]}
