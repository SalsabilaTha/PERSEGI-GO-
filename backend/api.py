"""REST API /api. Semua endpoint (kecuali dev-login) membutuhkan login."""
import hashlib
import re
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy import delete, func, select

from . import content, geometry, tutor
from .auth import login_required, make_dev_token
from .db import (activities, module_progress, now_utc, practice_attempts, quiz_results,
                 tutor_messages, users)
from .gamification import Stats, earned_badges, level_for, xp_for

bp = Blueprint("api", __name__, url_prefix="/api")

ACTIVITY_TYPES = {"lesson_done", "quiz_done", "practice_done", "warmup_done"}
ERROR_CODES = {
    "PERIMETER_INSTEAD_OF_AREA", "AREA_INSTEAD_OF_PERIMETER", "DOUBLED_NOT_SQUARED",
    "ONLY_TWO_SIDES", "DIVIDED_AREA_BY_4", "HALVED_AREA", "NO_OPERATION",
    "SQRT_PERIMETER", "HALVED_PERIMETER", "WRONG_UNIT", "WRONG_GENERIC",
    "WRONG_MARKING", "WRONG_FORMULA", "WRONG_SUBSTITUTION",
}
CLIENT_ID_RE = re.compile(r"^[A-Za-z0-9\-]{8,64}$")
MAX_BATCH = 50


def _engine():
    return current_app.extensions["db_engine"]


# ---------------------------------------------------------------- statistik

def _uses_sqrt(problem: dict) -> bool:
    (given_key, _), = problem["given"].items()
    return "s_from_L" in geometry.plan_for(given_key, problem["asked"])


def load_stats(conn, user_id: int) -> Stats:
    problems = content.problems_by_id()
    stats = Stats(
        total_modules=len(content.module_ids()),
        m6_problems={pid for pid, p in problems.items() if p["module"] == "m6"},
    )
    stats.xp = conn.execute(
        select(func.coalesce(func.sum(activities.c.xp), 0)).where(activities.c.user_id == user_id)
    ).scalar_one()
    stats.modules_done = set(conn.execute(
        select(module_progress.c.module_id).where(
            module_progress.c.user_id == user_id, module_progress.c.done_at.is_not(None))
    ).scalars())

    for score, total in conn.execute(
        select(quiz_results.c.score, quiz_results.c.total).where(quiz_results.c.user_id == user_id)
    ):
        stats.quizzes += 1
        stats.best_quiz_score = max(stats.best_quiz_score, score)
        if total:
            stats.best_quiz_percent = max(stats.best_quiz_percent, round(score * 100 / total))

    for problem_id, errors in conn.execute(
        select(practice_attempts.c.problem_id, practice_attempts.c.errors).where(
            practice_attempts.c.user_id == user_id, practice_attempts.c.correct.is_(True))
    ):
        stats.solved_problems.add(problem_id)
        if "WRONG_UNIT" not in (errors or []):
            stats.unit_clean_correct += 1
    stats.sqrt_solved = sum(
        1 for pid in stats.solved_problems if pid in problems and _uses_sqrt(problems[pid])
    )

    for payload in conn.execute(
        select(activities.c.payload).where(
            activities.c.user_id == user_id, activities.c.type == "warmup_done")
    ).scalars():
        stats.warmups_done.add(payload.get("module_id"))
    return stats


def progress_json(stats: Stats) -> dict:
    level_no, level_name = level_for(stats.xp)
    return {
        "xp": stats.xp,
        "level": {"number": level_no, "name": level_name},
        "modules_done": sorted(stats.modules_done),
        "total_modules": stats.total_modules,
        "quizzes": stats.quizzes,
        "best_quiz_percent": stats.best_quiz_percent if stats.quizzes else None,
        "solved_problems": sorted(stats.solved_problems),
        "total_problems": len(content.problems_by_id()),
        "badges": earned_badges(stats),
    }


# ---------------------------------------------------------------- validasi

class InvalidActivity(ValueError):
    pass


def _int(value, low, high, name):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise InvalidActivity(f"{name} tidak valid.")
    return value


def _created_at(raw) -> datetime:
    """Waktu dari perangkat (aktivitas offline) dipakai bila masuk akal."""
    now = now_utc()
    try:
        value = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return now
    if value > now + timedelta(minutes=5) or value < now - timedelta(days=60):
        return now
    return value


def validate_activity(item: dict) -> tuple[str, str, dict, datetime]:
    if not isinstance(item, dict):
        raise InvalidActivity("Format aktivitas salah.")
    client_id = item.get("client_id")
    if not isinstance(client_id, str) or not CLIENT_ID_RE.match(client_id):
        raise InvalidActivity("client_id tidak valid.")
    a_type = item.get("type")
    if a_type not in ACTIVITY_TYPES:
        raise InvalidActivity("Jenis aktivitas tidak dikenal.")
    raw = item.get("payload")
    if not isinstance(raw, dict):
        raise InvalidActivity("payload tidak valid.")

    if a_type in ("lesson_done", "warmup_done"):
        if raw.get("module_id") not in content.module_ids():
            raise InvalidActivity("Modul tidak dikenal.")
        payload = {"module_id": raw["module_id"]}

    elif a_type == "quiz_done":
        quiz = content.quiz_by_id(raw.get("quiz_id"))
        if quiz is None:
            raise InvalidActivity("Kuis tidak dikenal.")
        answers = raw.get("answers")
        questions = quiz["questions"]
        if not isinstance(answers, list) or len(answers) != len(questions):
            raise InvalidActivity("Jawaban kuis tidak lengkap.")
        answers = [_int(a, -1, 3, "Jawaban") for a in answers]
        # Skor dinilai ulang di server, angka dari browser tidak dipercaya.
        score = sum(1 for a, q in zip(answers, questions) if a == q["answer"])
        payload = {"quiz_id": quiz["id"], "answers": answers, "score": score, "total": len(questions)}

    else:  # practice_done
        if raw.get("problem_id") not in content.problems_by_id():
            raise InvalidActivity("Soal tidak dikenal.")
        errors = raw.get("errors", [])
        if not isinstance(errors, list) or len(errors) > 30 or not set(errors) <= ERROR_CODES:
            raise InvalidActivity("Kode kesalahan tidak valid.")
        correct = raw.get("correct")
        if not isinstance(correct, bool):
            raise InvalidActivity("correct harus true/false.")
        effort = raw.get("effort")
        tutor_calls = raw.get("tutor_calls", 0)
        payload = {
            "tutor_calls": _int(tutor_calls, 0, 50, "tutor_calls"),
            "problem_id": raw["problem_id"],
            "tries": _int(raw.get("tries"), 1, 50, "tries"),
            "hints_used": _int(raw.get("hints_used"), 0, 20, "hints_used"),
            "errors": errors,
            "correct": correct,
            "effort": None if effort is None else _int(effort, 1, 9, "effort"),
        }
    return client_id, a_type, payload, _created_at(item.get("created_at"))


def _store_side_tables(conn, user_id, a_type, payload, created_at):
    if a_type == "lesson_done":
        exists = conn.execute(select(module_progress.c.done_at).where(
            module_progress.c.user_id == user_id,
            module_progress.c.module_id == payload["module_id"])).first()
        if exists is None:
            conn.execute(module_progress.insert().values(
                user_id=user_id, module_id=payload["module_id"], step_reached=0, done_at=created_at))
        elif exists.done_at is None:
            conn.execute(module_progress.update().where(
                module_progress.c.user_id == user_id,
                module_progress.c.module_id == payload["module_id"]).values(done_at=created_at))
    elif a_type == "quiz_done":
        conn.execute(quiz_results.insert().values(
            user_id=user_id, quiz_id=payload["quiz_id"], score=payload["score"],
            total=payload["total"], created_at=created_at))
    elif a_type == "practice_done":
        conn.execute(practice_attempts.insert().values(
            user_id=user_id, problem_id=payload["problem_id"], tries=payload["tries"],
            hints_used=payload["hints_used"], errors=payload["errors"], correct=payload["correct"],
            effort=payload["effort"], created_at=created_at))


# ---------------------------------------------------------------- endpoint

@bp.get("/me")
@login_required
def me():
    with _engine().begin() as conn:
        conn.execute(users.update().where(users.c.id == g.user["id"]).values(last_login=now_utc()))
    u = g.user
    return jsonify(email=u["email"], name=u["name"], provider=u["provider"],
                   created_at=u["created_at"].isoformat())


@bp.get("/progress")
@login_required
def progress():
    with _engine().connect() as conn:
        return jsonify(progress_json(load_stats(conn, g.user["id"])))


@bp.post("/activities")
@login_required
def post_activities():
    body = request.get_json(silent=True) or {}
    items = body.get("activities")
    if not isinstance(items, list) or not items or len(items) > MAX_BATCH:
        return jsonify(error=f"Kirim 1–{MAX_BATCH} aktivitas."), 400

    user_id = g.user["id"]
    results, rejected = [], []
    with _engine().begin() as conn:
        stats = load_stats(conn, user_id)
        badges_before = set(earned_badges(stats))
        for item in items:
            try:
                client_id, a_type, payload, created_at = validate_activity(item)
            except InvalidActivity as exc:
                rejected.append({"client_id": item.get("client_id") if isinstance(item, dict) else None,
                                 "error": str(exc)})
                continue
            existing = conn.execute(select(activities.c.xp).where(
                activities.c.user_id == user_id, activities.c.client_id == client_id)).first()
            if existing is not None:   # sudah pernah terkirim (outbox mengirim ulang)
                results.append({"client_id": client_id, "xp": existing.xp, "duplicate": True})
                continue
            xp = xp_for(a_type, payload, stats)
            conn.execute(activities.insert().values(
                user_id=user_id, client_id=client_id, type=a_type, payload=payload,
                xp=xp, created_at=created_at))
            _store_side_tables(conn, user_id, a_type, payload, created_at)
            stats = load_stats(conn, user_id)
            results.append({"client_id": client_id, "xp": xp, "score": payload.get("score")})
        new_badges = [b for b in earned_badges(stats) if b not in badges_before]
        prog = progress_json(stats)

    return jsonify(results=results, rejected=rejected, progress=prog, new_badges=new_badges)


def _history_item(row) -> dict:
    p = row.payload or {}
    keep = {k: p[k] for k in ("module_id", "quiz_id", "score", "total", "problem_id", "correct",
                              "tutor_calls") if k in p}
    return {"type": row.type, "payload": keep, "xp": row.xp, "created_at": row.created_at.isoformat()}


@bp.get("/history")
@login_required
def history():
    limit = min(max(request.args.get("limit", 20, type=int), 1), 100)
    with _engine().connect() as conn:
        rows = conn.execute(
            select(activities).where(activities.c.user_id == g.user["id"])
            .order_by(activities.c.created_at.desc(), activities.c.id.desc()).limit(limit)
        ).all()
    return jsonify(items=[_history_item(r) for r in rows])


@bp.get("/export")
@login_required
def export():
    uid = g.user["id"]

    def rows(table):
        with _engine().connect() as conn:
            out = []
            for r in conn.execute(select(table).where(table.c.user_id == uid)).mappings():
                d = {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in r.items()}
                d.pop("user_id", None)
                d.pop("id", None)
                out.append(d)
            return out

    u = g.user
    data = {
        "aplikasi": "PERSEGI GO!",
        "diekspor_pada": now_utc().isoformat(),
        "akun": {"email": u["email"], "name": u["name"], "provider": u["provider"],
                 "created_at": u["created_at"].isoformat()},
        "aktivitas": rows(activities),
        "progres_materi": rows(module_progress),
        "hasil_kuis": rows(quiz_results),
        "latihan": rows(practice_attempts),
        "percakapan_tutor": rows(tutor_messages),
    }
    return jsonify(data)


@bp.delete("/me")
@login_required
def delete_me():
    uid = g.user["id"]
    with _engine().begin() as conn:
        for table in (activities, module_progress, quiz_results, practice_attempts, tutor_messages):
            conn.execute(delete(table).where(table.c.user_id == uid))
        conn.execute(delete(users).where(users.c.id == uid))
    return jsonify(ok=True)


# ---------------------------------------------------------------- Tutor AI (RMT)

def _optional_int(value, low, high, name):
    return None if value is None else _int(value, low, high, name)


def _validate_tutor(body: dict) -> dict:
    mode = body.get("mode")
    if mode not in tutor.MODES:
        raise InvalidActivity("Mode tutor tidak dikenal.")
    message = body.get("message")
    if mode == "hint" and not message:
        message = "Aku butuh bantuan di tahap ini."
    if not isinstance(message, str) or not message.strip() or len(message) > 500:
        raise InvalidActivity("Pesan harus diisi (maksimal 500 karakter).")
    problem_id = body.get("problem_id")
    problem = None
    if problem_id is not None:
        problem = content.problems_by_id().get(problem_id)
        if problem is None:
            raise InvalidActivity("Soal tidak dikenal.")
    if mode in ("hint", "reflect") and problem is None:
        raise InvalidActivity("Mode ini membutuhkan soal.")
    error_code = body.get("error_code")
    if error_code is not None and error_code not in ERROR_CODES:
        raise InvalidActivity("Kode kesalahan tidak valid.")
    student_input = body.get("student_input")
    if student_input is not None and (not isinstance(student_input, str) or len(student_input) > 100):
        raise InvalidActivity("Isian siswa tidak valid.")
    history = body.get("history") or []
    if not isinstance(history, list) or len(history) > 8:
        raise InvalidActivity("Riwayat percakapan tidak valid.")
    clean_history = []
    for turn in history:
        if (not isinstance(turn, dict) or turn.get("role") not in ("user", "assistant")
                or not isinstance(turn.get("content"), str) or len(turn["content"]) > 1000):
            raise InvalidActivity("Riwayat percakapan tidak valid.")
        clean_history.append({"role": turn["role"], "content": turn["content"]})
    return {
        "mode": mode, "message": message.strip(), "problem": problem, "problem_id": problem_id,
        "stage": _optional_int(body.get("stage"), 0, 5, "stage"),
        "hint_level": _optional_int(body.get("hint_level"), 0, 3, "hint_level") or 0,
        "error_code": error_code, "student_input": student_input, "history": clean_history,
    }


@bp.post("/tutor")
@login_required
def ask_tutor():
    try:
        req = _validate_tutor(request.get_json(silent=True) or {})
    except InvalidActivity as exc:
        return jsonify(error=str(exc)), 400

    cfg = current_app.config
    uid = g.user["id"]
    since = now_utc() - timedelta(minutes=cfg["AI_RATE_WINDOW_MIN"])
    with _engine().connect() as conn:
        recent = conn.execute(select(func.count()).select_from(tutor_messages).where(
            tutor_messages.c.user_id == uid, tutor_messages.c.role == "user",
            tutor_messages.c.created_at >= since)).scalar_one()
    if recent >= cfg["AI_RATE_LIMIT"]:
        return jsonify(error="Kamu sudah banyak bertanya. Istirahat sebentar, lalu coba lagi ya."), 429

    phase = tutor.phase_for(req["mode"], req["stage"], req["error_code"])
    reply, source = None, "fallback"
    if cfg["GEMINI_API_KEY"]:
        # Identitas siswa tidak ikut dikirim: hanya soal, tahap, dan isi percakapan.
        messages = tutor.build_messages(
            req["mode"], req["message"], req["history"], req["problem"], req["stage"],
            req["error_code"], req["hint_level"], req["student_input"])
        try:
            reply = tutor.call_gemini(messages, cfg["GEMINI_API_KEY"], cfg["GEMINI_MODEL"],
                                      cfg["GEMINI_BASE_URL"])
            source = "ai"
        except tutor.TutorError:
            current_app.logger.warning("Tutor AI gagal dihubungi; memakai petunjuk bawaan.")
    guarded = (req["problem"] is not None and req["mode"] != "reflect"
               and (req["stage"] is None or req["stage"] < 4))
    if reply and guarded and tutor.leaks_answer(reply, req["problem"]):
        reply, source = None, "fallback"   # penjaga: AI hampir membocorkan jawaban akhir
    if reply is None:
        reply = tutor.fallback_reply(req["mode"], req["problem"], req["hint_level"], req["error_code"])

    now = now_utc()
    base = {"user_id": uid, "problem_id": req["problem_id"], "mode": req["mode"],
            "stage": req["stage"], "phase": phase}
    with _engine().begin() as conn:
        conn.execute(tutor_messages.insert(), [
            {**base, "role": "user", "content": req["message"][:1000], "source": None, "created_at": now},
            {**base, "role": "assistant", "content": reply[:1000], "source": source,
             "created_at": now + timedelta(microseconds=1)},
        ])
    return jsonify(reply=reply, phase=phase, source=source)


@bp.get("/tutor/history")
@login_required
def tutor_history():
    problem_id = request.args.get("problem_id")
    cond = [tutor_messages.c.user_id == g.user["id"]]
    cond.append(tutor_messages.c.problem_id == problem_id if problem_id
                else tutor_messages.c.problem_id.is_(None))
    with _engine().connect() as conn:
        rows = conn.execute(select(tutor_messages).where(*cond)
                            .order_by(tutor_messages.c.created_at.desc(), tutor_messages.c.id.desc())
                            .limit(30)).mappings().all()
    items = [{"role": r["role"], "content": r["content"], "mode": r["mode"], "phase": r["phase"]}
             for r in reversed(rows)]
    return jsonify(items=items)


@bp.post("/dev-login")
def dev_login():
    """Login mode uji lokal. Hanya aktif bila Supabase belum diatur & bukan production."""
    cfg = current_app.config
    if not cfg["DEV_LOGIN"]:
        return jsonify(error="Mode uji tidak aktif."), 404
    body = request.get_json(silent=True) or {}
    name = str(body.get("name", "")).strip()[:40] or "Penjelajah"
    email = str(body.get("email", "")).strip().lower()[:120]
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify(error="Email tidak valid."), 400
    uid = "dev-" + hashlib.sha256(email.encode()).hexdigest()[:24]
    token = make_dev_token(uid, email, name, cfg["DEV_JWT_SECRET"])
    return jsonify(access_token=token, user={"email": email, "name": name})


@bp.errorhandler(413)
def too_large(_):
    return jsonify(error="Data terlalu besar."), 413
