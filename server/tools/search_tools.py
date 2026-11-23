import re
from pathlib import Path
from typing import Dict, Any, List
from sandbox.container import WORKSPACE_PATH
from tools.common import resolve_safe_path, IGNORED_DIRS


def tool_grep_search(query: str, path: str = ".", case_sensitive: bool = False, max_results: int = 50) -> str:
    """
    Searches for a text pattern or regex query across workspace files.
    Skips binary files, dependencies, and git metadata.
    """
    target = resolve_safe_path(path)
    if not target.exists():
        return f"Error: Path '{path}' does not exist."

    flags = 0 if case_sensitive else re.IGNORECASE
    try:
        pattern = re.compile(query, flags)
    except re.error:
        pattern = re.compile(re.escape(query), flags)

    matches: List[str] = []
    scan_files = [target] if target.is_file() else sorted(target.rglob("*"))

    for p in scan_files:
        if len(matches) >= max_results:
            break
        if not p.is_file() or any(part in IGNORED_DIRS for part in p.parts):
            continue

        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                rel_path = p.relative_to(WORKSPACE_PATH).as_posix()
                for line_num, line in enumerate(f, start=1):
                    if pattern.search(line):
                        clean_line = line.rstrip("\r\n")
                        matches.append(f"{rel_path}:{line_num}: {clean_line}")
                        if len(matches) >= max_results:
                            break
        except Exception:
            continue

    if not matches:
        return f"No matches found for query '{query}' in '{path}'."

    result = "\n".join(matches)
    if len(matches) >= max_results:
        result += f"\n... (truncated at {max_results} results)"
    return result


def tool_file_search(pattern: str, directory: str = ".") -> str:
    """
    Finds files and directories matching a glob pattern (e.g. '*.py', '*test*', '**/*.ts')
    inside the workspace, ignoring build and dependency artifacts.
    """
    target = resolve_safe_path(directory)
    if not target.is_dir():
        return f"Error: Directory '{directory}' does not exist."

    glob_pattern = f"**/{pattern}" if not pattern.startswith("**") else pattern
    matched = []

    for p in sorted(target.glob(glob_pattern)):
        if any(part in IGNORED_DIRS for part in p.parts):
            continue
        rel = p.relative_to(WORKSPACE_PATH).as_posix()
        matched.append(f"{'[DIR] ' if p.is_dir() else '[FILE]'} {rel}")

    if not matched:
        return f"No files found matching pattern '{pattern}' in '{directory}'."

    return "\n".join(matched[:100])


SEARCH_TOOLS_SCHEMA: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "grep_search",
            "description": "Search for a regex or string pattern across files in the workspace. Returns matching file paths, line numbers, and contents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Regex or string pattern to search for."},
                    "path": {"type": "string", "description": "Subdirectory or file path to search within.", "default": "."},
                    "case_sensitive": {"type": "boolean", "description": "Whether to perform case-sensitive search.", "default": False},
                    "max_results": {"type": "integer", "description": "Maximum number of matching lines to return.", "default": 50}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "file_search",
            "description": "Find files matching a glob pattern (e.g. '*.py', '*test*', '**/*.ts') inside the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {"type": "string", "description": "Glob pattern to match file names against."},
                    "directory": {"type": "string", "description": "Directory to search within.", "default": "."}
                },
                "required": ["pattern"]
            }
        }
    }
]

