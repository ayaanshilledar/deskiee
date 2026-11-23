import shutil
from pathlib import Path
from typing import Dict, Any, List
from sandbox.container import WORKSPACE_PATH
from tools.common import resolve_safe_path, IGNORED_DIRS


def tool_write_file(path: str, content: str) -> str:
    """Creates or overwrites a file inside the workspace."""
    target = resolve_safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return f"Successfully saved {path} ({len(content)} characters)."


def tool_read_file(path: str) -> str:
    """Reads file content from the workspace."""
    target = resolve_safe_path(path)
    if not target.is_file():
        return f"Error: File '{path}' does not exist."
    return target.read_text(encoding="utf-8")


def tool_list_files(directory: str = ".") -> str:
    """Lists files and folders recursively in the workspace."""
    target = resolve_safe_path(directory)
    if not target.is_dir():
        return f"Error: Directory '{directory}' does not exist."

    items = [
        f"{'[DIR] ' if p.is_dir() else '[FILE]'} {p.relative_to(WORKSPACE_PATH)}"
        for p in sorted(target.rglob("*"))
        if not any(part in IGNORED_DIRS for part in p.parts)
    ]
    return "\n".join(items) if items else "Workspace directory is empty."


def tool_delete_file(path: str) -> str:
    """Deletes a file or directory from the workspace."""
    target = resolve_safe_path(path)
    if not target.exists():
        return f"Error: Path '{path}' not found."

    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return f"Successfully deleted {path}."


FILE_TOOLS_SCHEMA: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Create or update a file in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path."},
                    "content": {"type": "string", "description": "Full file content."}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read file contents from the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path."}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List files and directories in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "directory": {"type": "string", "description": "Subdirectory to list (defaults to root).", "default": "."}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Delete a file or directory from the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path to delete."}
                },
                "required": ["path"]
            }
        }
    }
]

