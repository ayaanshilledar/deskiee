import os
import json
import uuid
import psycopg2
from pathlib import Path
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

SERVER_DIR = Path(__file__).resolve().parent.parent
load_dotenv(SERVER_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Connects to Neon Postgres."""
    return psycopg2.connect(DATABASE_URL)


def init_db():
    """Initializes tables for conversations and runs with conversation threading."""
    if not DATABASE_URL:
        print("Warning: DATABASE_URL not set in .env. Skipping DB init.")
        return

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = [r[0] for r in cur.fetchall()]

            if "conversations" not in tables:
                cur.execute("""
                CREATE TABLE conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    memory TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)

            if "runs" not in tables:
                cur.execute("""
                CREATE TABLE runs (
                    id SERIAL PRIMARY KEY,
                    task TEXT NOT NULL,
                    status TEXT NOT NULL,
                    iterations INT,
                    final_answer TEXT,
                    logs JSONB,
                    conversation_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)
            else:
                cur.execute("ALTER TABLE runs ADD COLUMN IF NOT EXISTS conversation_id TEXT;")

            # Auto-backfill any legacy runs without a conversation_id
            cur.execute("SELECT id, task FROM runs WHERE conversation_id IS NULL ORDER BY id ASC;")
            legacy_runs = cur.fetchall()
            for r_id, r_task in legacy_runs:
                conv_id = f"legacy-conv-{r_id}"
                title = (r_task[:45] + "...") if len(r_task) > 45 else r_task
                cur.execute(
                    "INSERT INTO conversations (id, title, memory) VALUES (%s, %s, %s) ON CONFLICT (id) DO NOTHING;",
                    (conv_id, title, f"- {title}")
                )
                cur.execute("UPDATE runs SET conversation_id = %s WHERE id = %s;", (conv_id, r_id))

        conn.commit()


def create_or_get_conversation(conv_id: Optional[str] = None, title: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves an existing conversation or creates a new one."""
    if not DATABASE_URL:
        return {"id": conv_id or str(uuid.uuid4()), "title": title or "New Conversation", "memory": ""}

    if not conv_id:
        conv_id = f"conv-{uuid.uuid4().hex[:10]}"

    clean_title = (title[:45] + "...") if title and len(title) > 45 else (title or "New Conversation")

    query = """
    INSERT INTO conversations (id, title, memory)
    VALUES (%s, %s, '')
    ON CONFLICT (id) DO NOTHING
    RETURNING id, title, memory, created_at, updated_at;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (conv_id, clean_title))
            row = cur.fetchone()
            if not row:
                cur.execute("SELECT id, title, memory, created_at, updated_at FROM conversations WHERE id = %s;", (conv_id,))
                row = cur.fetchone()

            conn.commit()
            if row:
                return {
                    "id": row[0],
                    "title": row[1],
                    "memory": row[2] or "",
                    "created_at": str(row[3]),
                    "updated_at": str(row[4])
                }

    return {"id": conv_id, "title": clean_title, "memory": ""}


def get_all_conversations(limit: int = 30) -> List[Dict[str, Any]]:
    """Fetches list of conversations ordered by most recently updated."""
    if not DATABASE_URL:
        return []

    query = """
    SELECT c.id, c.title, c.memory, c.updated_at, COUNT(r.id) as run_count
    FROM conversations c
    LEFT JOIN runs r ON r.conversation_id = c.id
    GROUP BY c.id, c.title, c.memory, c.updated_at
    ORDER BY c.updated_at DESC
    LIMIT %s;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()
            return [
                {
                    "id": r[0],
                    "title": r[1],
                    "memory": r[2] or "",
                    "updated_at": str(r[3]),
                    "run_count": r[4] or 0
                }
                for r in rows
            ]


def get_conversation_history(conv_id: str) -> Dict[str, Any]:
    """Fetches full conversation state, compressed memory, and all task runs."""
    if not DATABASE_URL:
        return {"id": conv_id, "title": "", "memory": "", "runs": []}

    conv_query = "SELECT id, title, memory, created_at, updated_at FROM conversations WHERE id = %s;"
    runs_query = """
    SELECT id, task, status, iterations, final_answer, logs, created_at
    FROM runs
    WHERE conversation_id = %s
    ORDER BY created_at ASC;
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(conv_query, (conv_id,))
            c_row = cur.fetchone()
            if not c_row:
                return {"id": conv_id, "title": "", "memory": "", "runs": []}

            cur.execute(runs_query, (conv_id,))
            r_rows = cur.fetchall()

            runs = []
            for r in r_rows:
                logs_data = r[5]
                if isinstance(logs_data, str):
                    try:
                        logs_data = json.loads(logs_data)
                    except Exception:
                        logs_data = []

                runs.append({
                    "id": r[0],
                    "task": r[1],
                    "status": r[2],
                    "iterations": r[3],
                    "final_answer": r[4],
                    "logs": logs_data or [],
                    "created_at": str(r[6])
                })

            return {
                "id": c_row[0],
                "title": c_row[1],
                "memory": c_row[2] or "",
                "created_at": str(c_row[3]),
                "updated_at": str(c_row[4]),
                "runs": runs
            }


def update_compressed_memory(conv_id: str, task: str, result: dict):
    """
    Compresses the outcome of a task into a concise 1-line key bullet point.
    Prunes memory so it never exceeds 6 bullet points (~150-250 tokens max).
    """
    if not DATABASE_URL or not conv_id:
        return

    # 1. Identify files created or modified
    logs = result.get("logs", [])
    files = []
    for line in logs:
        if isinstance(line, str):
            if "Action: write_file" in line or "Saved " in line:
                for word in line.split():
                    if "." in word and not word.endswith(".") and not word.startswith("Action"):
                        clean_w = word.strip("'\",(){}:")
                        if clean_w and clean_w not in files:
                            files.append(clean_w)

    # 2. Extract first sentence of final answer or status
    answer = (result.get("final_answer") or "").strip().split("\n")[0]
    if len(answer) > 80:
        answer = answer[:80] + "..."

    file_note = f" (Files: {', '.join(files[:3])})" if files else ""
    new_bullet = f"- {task[:50]}: {answer or 'Completed'}{file_note}"

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT memory FROM conversations WHERE id = %s;", (conv_id,))
            row = cur.fetchone()
            current_memory = (row[0] if row else "") or ""

            bullets = [b.strip() for b in current_memory.split("\n") if b.strip().startswith("-")]
            bullets.append(new_bullet)

            # Cap memory at max 6 bullets: keep foundational first bullet + latest 5
            if len(bullets) > 6:
                bullets = [bullets[0]] + bullets[-5:]

            updated_memory = "\n".join(bullets)
            cur.execute(
                "UPDATE conversations SET memory = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s;",
                (updated_memory, conv_id)
            )
            conn.commit()


def save_run(task: str, result: dict, conversation_id: Optional[str] = None):
    """Saves an agent execution run associated with a conversation."""
    if not DATABASE_URL:
        return None

    insert_sql = """
    INSERT INTO runs (task, status, iterations, final_answer, logs, conversation_id)
    VALUES (%s, %s, %s, %s, %s, %s)
    RETURNING id;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                insert_sql,
                (
                    task,
                    result.get("status"),
                    result.get("iterations"),
                    result.get("final_answer"),
                    json.dumps(result.get("logs", [])),
                    conversation_id
                )
            )
            run_id = cur.fetchone()[0]
            conn.commit()

    if conversation_id:
        update_compressed_memory(conversation_id, task, result)

    return run_id


def get_all_runs(limit: int = 20):
    """Legacy helper for flat history."""
    if not DATABASE_URL:
        return []

    query = """
    SELECT id, task, status, iterations, final_answer, created_at, conversation_id
    FROM runs 
    ORDER BY created_at DESC 
    LIMIT %s;
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (limit,))
            rows = cur.fetchall()
            return [
                {
                    "id": r[0],
                    "task": r[1],
                    "status": r[2],
                    "iterations": r[3],
                    "final_answer": r[4],
                    "created_at": str(r[5]),
                    "conversation_id": r[6]
                }
                for r in rows
            ]
