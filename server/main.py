import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

SERVER_DIR = Path(__file__).resolve().parent
load_dotenv(SERVER_DIR / ".env")

from harness.runner import run_coding_agent
from database.db import (
    init_db,
    save_run,
    get_all_runs,
    get_all_conversations,
    get_conversation_history,
    create_or_get_conversation,
)

app = FastAPI(title="Deskie AI Coding Harness")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskRequest(BaseModel):
    task: str
    model: str
    base_url: Optional[str] = None
    max_iterations: Optional[int] = 15
    conversation_id: Optional[str] = None


class NewConversationRequest(BaseModel):
    title: Optional[str] = "New Conversation"


@app.on_event("startup")
def startup_event():
    """Initializes the database schema when the server starts."""
    init_db()


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Deskie Harness Backend is running"}


@app.post("/api/run")
def execute_task(req: TaskRequest):
    """
    Triggers the autonomous coding harness for a given task under a conversation thread.
    Injects compressed conversation memory to keep context lean and fast.
    """
    try:
        # Get or create conversation thread and its compressed memory
        conv = create_or_get_conversation(req.conversation_id, title=req.task)
        conv_id = conv["id"]
        memory = conv.get("memory", "")

        # Run agent with compressed memory
        result = run_coding_agent(
            task=req.task,
            model=req.model,
            base_url=req.base_url,
            max_iterations=req.max_iterations,
            memory=memory
        )

        # Save record in Neon DB associated with conversation
        run_id = save_run(task=req.task, result=result, conversation_id=conv_id)
        result["run_id"] = run_id
        result["conversation_id"] = conv_id

        # Return latest conversation state
        updated_conv = get_conversation_history(conv_id)
        result["conversation_memory"] = updated_conv.get("memory", "")

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations")
def list_conversations():
    """Returns past conversation sessions."""
    return {"conversations": get_all_conversations()}


@app.get("/api/conversations/{conv_id}")
def get_conversation(conv_id: str):
    """Returns full history and compressed memory for a conversation."""
    data = get_conversation_history(conv_id)
    if not data or not data.get("id"):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return data


@app.post("/api/conversations")
def create_conversation(req: NewConversationRequest):
    """Creates a new empty conversation session."""
    return create_or_get_conversation(title=req.title)


@app.get("/api/history")
def history():
    """Returns past execution runs (legacy flat endpoint)."""
    return {"runs": get_all_runs()}


def bundle_html_assets(html_content: str, rel_file_path: str) -> str:
    """
    Inlines local relative CSS and JS assets into the HTML document for sandboxed iframe previewing.
    This resolves relative links like <link rel="stylesheet" href="style.css"> and <script src="app.js">.
    """
    import re
    from tools.common import WORKSPACE_PATH
    target_file = (WORKSPACE_PATH / rel_file_path).resolve()
    base_dir = target_file.parent if target_file.is_file() else WORKSPACE_PATH

    # 1. Inline <link rel="stylesheet" href="...">
    link_pattern = re.compile(
        r'<link\b[^>]*?\brel=["\']stylesheet["\'][^>]*?\bhref=["\']([^"\']+)["\'][^>]*>|'
        r'<link\b[^>]*?\bhref=["\']([^"\']+)["\'][^>]*?\brel=["\']stylesheet["\'][^>]*>',
        re.IGNORECASE
    )

    def replace_link(match):
        href = match.group(1) or match.group(2)
        if not href or href.startswith(("http://", "https://", "//", "data:")):
            return match.group(0)
        clean_href = href.split("?")[0].split("#")[0].strip()
        css_path = (base_dir / clean_href).resolve()
        try:
            if css_path.is_relative_to(WORKSPACE_PATH.resolve()):
                if css_path.exists() and css_path.is_file():
                    css_code = css_path.read_text(encoding="utf-8", errors="replace")
                    return f'<style data-inlined-from="{clean_href}">\n/* Inlined from {clean_href} */\n{css_code}\n</style>'
        except Exception:
            pass
        return match.group(0)

    bundled = link_pattern.sub(replace_link, html_content)

    # 2. Inline local <script src="..."> if relative
    script_pattern = re.compile(
        r'<script\b([^>]*?)\bsrc=["\']([^"\']+)["\']([^>]*)>\s*</script>',
        re.IGNORECASE
    )

    def replace_script(match):
        attrs_before = match.group(1)
        src = match.group(2)
        attrs_after = match.group(3)
        if not src or src.startswith(("http://", "https://", "//", "data:")):
            return match.group(0)
        clean_src = src.split("?")[0].split("#")[0].strip()
        js_path = (base_dir / clean_src).resolve()
        try:
            if js_path.is_relative_to(WORKSPACE_PATH.resolve()):
                if js_path.exists() and js_path.is_file():
                    js_code = js_path.read_text(encoding="utf-8", errors="replace")
                    return f'<script {attrs_before} {attrs_after} data-inlined-from="{clean_src}">\n// Inlined from {clean_src}\n{js_code}\n</script>'
        except Exception:
            pass
        return match.group(0)

    bundled = script_pattern.sub(replace_script, bundled)
    return bundled


@app.get("/api/file")
def get_file_content(path: str):
    """Fetches the content of a workspace file for the UI previewer."""
    from tools.file_tools import tool_read_file
    content = tool_read_file(path)
    if content.startswith("Error:"):
        raise HTTPException(status_code=404, detail=content)
    is_html = path.lower().endswith(".html") or "<!doctype html" in content.lower() or "<html" in content.lower()
    preview_html = None
    if is_html:
        preview_html = bundle_html_assets(content, path)
    return {
        "path": path,
        "content": content,
        "preview_html": preview_html or content,
        "is_html": is_html
    }


@app.get("/api/workspace/{file_path:path}")
def serve_workspace_file(file_path: str):
    """Directly serves files from the workspace directory with correct mime types."""
    from tools.common import WORKSPACE_PATH
    from fastapi.responses import FileResponse
    target = (WORKSPACE_PATH / file_path).resolve()
    if not target.is_relative_to(WORKSPACE_PATH.resolve()) or not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found in workspace")
    return FileResponse(path=target)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 4000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)