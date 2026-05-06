from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from datetime import datetime, timedelta, timezone
from database import init_db, get_db, get_demo_user_id
from summariser import summarise
from retention import start_retention_scheduler

app = Flask(__name__)
app.secret_key = "neurolearn-demo-secret-key"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_prefs(user_id):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM preferences WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "theme_mode": "default",
        "font_size": 16,
        "line_spacing": 1.5,
        "reduced_motion": 0,
    }


def has_valid_consent(user_id):
    conn = get_db()
    row = conn.execute(
        """SELECT id FROM consent_events
           WHERE user_id = ? AND consent_given = 1 AND purpose = 'summarisation'
             AND expiry_date > ?
           ORDER BY timestamp DESC LIMIT 1""",
        (user_id, now_iso()),
    ).fetchone()
    conn.close()
    return row is not None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    user_id = get_demo_user_id()
    consented = has_valid_consent(user_id)
    prefs = get_prefs(user_id)
    # Recent summaries for the home page list
    conn = get_db()
    recent = conn.execute(
        """SELECT s.id, s.created_at, substr(s.summary_text, 1, 120) AS preview
           FROM summaries s
           JOIN inputs i ON s.input_id = i.id
           WHERE i.user_id = ? AND i.deleted_at IS NULL
           ORDER BY s.created_at DESC LIMIT 5""",
        (user_id,),
    ).fetchall()
    conn.close()
    return render_template("home.html", consented=consented, prefs=prefs, recent=recent)


@app.route("/summarise", methods=["POST"])
def do_summarise():
    user_id = get_demo_user_id()
    if not has_valid_consent(user_id):
        return jsonify({"error": "consent_required"}), 403

    text = request.form.get("text", "").strip()
    if not text:
        return jsonify({"error": "No text provided."}), 400
    if len(text) > 20000:
        return jsonify({"error": "Text too long (max 20,000 characters)."}), 400

    summary_text = summarise(text)

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO inputs (user_id, type, text_content, created_at) VALUES (?, 'text', ?, ?)",
        (user_id, text, now_iso()),
    )
    input_id = cur.lastrowid
    cur2 = conn.execute(
        "INSERT INTO summaries (input_id, summary_text, reading_level, created_at) VALUES (?, ?, 'standard', ?)",
        (input_id, summary_text, now_iso()),
    )
    summary_id = cur2.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"summary_id": summary_id})


@app.route("/reader/<int:summary_id>")
def reader(summary_id):
    user_id = get_demo_user_id()
    conn = get_db()
    row = conn.execute(
        """SELECT s.id, s.summary_text, s.created_at, i.text_content
           FROM summaries s
           JOIN inputs i ON s.input_id = i.id
           WHERE s.id = ? AND i.user_id = ? AND i.deleted_at IS NULL""",
        (summary_id, user_id),
    ).fetchone()
    conn.close()
    if not row:
        return "Summary not found.", 404
    prefs = get_prefs(user_id)
    return render_template("reader.html", summary=dict(row), prefs=prefs)


@app.route("/focus")
def focus():
    user_id = get_demo_user_id()
    prefs = get_prefs(user_id)
    # Load any active session's tasks (session without ended_at)
    conn = get_db()
    active_session = conn.execute(
        "SELECT id FROM focus_sessions WHERE user_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    tasks = []
    active_session_id = None
    if active_session:
        active_session_id = active_session["id"]
        tasks = conn.execute(
            "SELECT * FROM micro_tasks WHERE session_id = ? ORDER BY id",
            (active_session_id,),
        ).fetchall()
        tasks = [dict(t) for t in tasks]
    conn.close()
    return render_template("focus.html", prefs=prefs, tasks=tasks, active_session_id=active_session_id)


@app.route("/focus/start", methods=["POST"])
def focus_start():
    user_id = get_demo_user_id()
    duration = int(request.form.get("duration", 25))
    conn = get_db()
    # Close any existing open session first
    conn.execute(
        "UPDATE focus_sessions SET ended_at = ? WHERE user_id = ? AND ended_at IS NULL",
        (now_iso(), user_id),
    )
    cur = conn.execute(
        "INSERT INTO focus_sessions (user_id, duration_minutes, started_at) VALUES (?, ?, ?)",
        (user_id, duration, now_iso()),
    )
    session_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"session_id": session_id})


@app.route("/focus/end", methods=["POST"])
def focus_end():
    user_id = get_demo_user_id()
    session_id = request.form.get("session_id")
    conn = get_db()
    conn.execute(
        "UPDATE focus_sessions SET ended_at = ? WHERE id = ? AND user_id = ?",
        (now_iso(), session_id, user_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/tasks/add", methods=["POST"])
def tasks_add():
    user_id = get_demo_user_id()
    session_id = request.form.get("session_id")
    title = request.form.get("title", "").strip()
    if not title or not session_id:
        return jsonify({"error": "Missing data"}), 400
    # Verify session belongs to user
    conn = get_db()
    sess = conn.execute(
        "SELECT id FROM focus_sessions WHERE id = ? AND user_id = ?",
        (session_id, user_id),
    ).fetchone()
    if not sess:
        conn.close()
        return jsonify({"error": "Invalid session"}), 403
    cur = conn.execute(
        "INSERT INTO micro_tasks (session_id, title, is_done) VALUES (?, ?, 0)",
        (session_id, title),
    )
    task_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"task_id": task_id, "title": title, "is_done": False})


@app.route("/tasks/toggle", methods=["POST"])
def tasks_toggle():
    user_id = get_demo_user_id()
    task_id = request.form.get("task_id")
    conn = get_db()
    task = conn.execute(
        """SELECT t.* FROM micro_tasks t
           JOIN focus_sessions s ON t.session_id = s.id
           WHERE t.id = ? AND s.user_id = ?""",
        (task_id, user_id),
    ).fetchone()
    if not task:
        conn.close()
        return jsonify({"error": "Not found"}), 404
    new_done = 0 if task["is_done"] else 1
    done_at = now_iso() if new_done else None
    conn.execute(
        "UPDATE micro_tasks SET is_done = ?, done_at = ? WHERE id = ?",
        (new_done, done_at, task_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"task_id": int(task_id), "is_done": bool(new_done)})


@app.route("/settings")
def settings():
    user_id = get_demo_user_id()
    prefs = get_prefs(user_id)
    consented = has_valid_consent(user_id)
    return render_template("settings.html", prefs=prefs, consented=consented)


@app.route("/settings/save", methods=["POST"])
def settings_save():
    user_id = get_demo_user_id()
    theme_mode = request.form.get("theme_mode", "default")
    font_size = int(request.form.get("font_size", 16))
    line_spacing = float(request.form.get("line_spacing", 1.5))
    reduced_motion = 1 if request.form.get("reduced_motion") == "1" else 0

    if theme_mode not in ("default", "low_stim", "high_contrast", "dark_high_contrast"):
        theme_mode = "default"
    font_size = max(12, min(24, font_size))
    line_spacing = max(1.2, min(2.0, round(line_spacing, 1)))

    conn = get_db()
    conn.execute(
        """INSERT INTO preferences (user_id, theme_mode, font_size, line_spacing, reduced_motion, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             theme_mode=excluded.theme_mode,
             font_size=excluded.font_size,
             line_spacing=excluded.line_spacing,
             reduced_motion=excluded.reduced_motion,
             updated_at=excluded.updated_at""",
        (user_id, theme_mode, font_size, line_spacing, reduced_motion, now_iso()),
    )
    conn.commit()
    conn.close()

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        return jsonify({"ok": True})
    return redirect(url_for("settings"))


@app.route("/consent", methods=["POST"])
def consent():
    user_id = get_demo_user_id()
    given = request.form.get("consent_given", "0") == "1"
    expiry = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    conn = get_db()
    conn.execute(
        "INSERT INTO consent_events (user_id, purpose, consent_given, timestamp, expiry_date) VALUES (?, 'summarisation', ?, ?, ?)",
        (user_id, 1 if given else 0, now_iso(), expiry),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "consent_given": given})


@app.route("/delete-my-data", methods=["POST"])
def delete_my_data():
    user_id = get_demo_user_id()
    conn = get_db()
    # Delete summaries linked to this user's inputs
    input_ids = [
        r["id"] for r in conn.execute(
            "SELECT id FROM inputs WHERE user_id = ?", (user_id,)
        ).fetchall()
    ]
    if input_ids:
        ph = ",".join("?" * len(input_ids))
        conn.execute(f"DELETE FROM summaries WHERE input_id IN ({ph})", input_ids)
    conn.execute("DELETE FROM inputs WHERE user_id = ?", (user_id,))

    # Delete focus sessions and their tasks
    session_ids = [
        r["id"] for r in conn.execute(
            "SELECT id FROM focus_sessions WHERE user_id = ?", (user_id,)
        ).fetchall()
    ]
    if session_ids:
        ph = ",".join("?" * len(session_ids))
        conn.execute(f"DELETE FROM micro_tasks WHERE session_id IN ({ph})", session_ids)
    conn.execute("DELETE FROM focus_sessions WHERE user_id = ?", (user_id,))

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/preferences")
def api_preferences():
    user_id = get_demo_user_id()
    prefs = get_prefs(user_id)
    return jsonify({
        "theme_mode": prefs["theme_mode"],
        "font_size": prefs["font_size"],
        "line_spacing": prefs["line_spacing"],
        "reduced_motion": bool(prefs["reduced_motion"]),
    })


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    start_retention_scheduler()
    app.run(debug=True, use_reloader=False)  # use_reloader=False avoids double-starting the scheduler
