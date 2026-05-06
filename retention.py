import threading
from datetime import datetime, timedelta, timezone
from database import get_db

RETENTION_DAYS = 7
PURGE_INTERVAL_SECONDS = 3600  # run every hour


def purge_expired():
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    conn = get_db()
    try:
        # Find expired input IDs
        expired_inputs = conn.execute(
            "SELECT id FROM inputs WHERE created_at < ? AND deleted_at IS NULL",
            (cutoff,),
        ).fetchall()
        expired_ids = [row["id"] for row in expired_inputs]

        if expired_ids:
            placeholders = ",".join("?" * len(expired_ids))
            conn.execute(
                f"DELETE FROM summaries WHERE input_id IN ({placeholders})",
                expired_ids,
            )
            conn.execute(
                f"UPDATE inputs SET deleted_at = ? WHERE id IN ({placeholders})",
                [datetime.now(timezone.utc).isoformat()] + expired_ids,
            )
            conn.commit()
    finally:
        conn.close()


def _schedule_next():
    t = threading.Timer(PURGE_INTERVAL_SECONDS, _run_and_reschedule)
    t.daemon = True  # won't block process exit
    t.start()


def _run_and_reschedule():
    purge_expired()
    _schedule_next()


def start_retention_scheduler():
    purge_expired()  # run immediately on startup
    _schedule_next()
