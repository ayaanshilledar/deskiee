from pathlib import Path
from sandbox.container import WORKSPACE_PATH

IGNORED_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".next",
    ".pytest_cache",
    ".turbo",
}


def resolve_safe_path(rel_path: str) -> Path:
    """
    Resolves relative path inside WORKSPACE_PATH and prevents path traversal (e.g. ../../).
    """
    target = (WORKSPACE_PATH / rel_path).resolve()
    if not target.is_relative_to(WORKSPACE_PATH.resolve()):
        raise PermissionError(f"Access denied: path '{rel_path}' escapes workspace boundary.")
    return target

