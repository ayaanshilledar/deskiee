"""
Legacy re-export module for backward compatibility.
All tool implementations are now cleanly modularized in the `tools/` package:
- tools/file_tools.py
- tools/search_tools.py
- tools/git_tools.py
- tools/exec_tools.py
- tools/registry.py
"""

from tools.registry import TOOL_REGISTRY, TOOLS_SCHEMA, execute_tool
from tools.common import resolve_safe_path
from tools.file_tools import (
    tool_write_file,
    tool_read_file,
    tool_list_files,
    tool_delete_file,
)
from tools.search_tools import (
    tool_grep_search,
    tool_file_search,
)
from tools.git_tools import (
    tool_git_checkpoint,
    tool_git_diff,
    tool_git_rollback,
)
from tools.exec_tools import (
    tool_run_command,
)

__all__ = [
    "TOOL_REGISTRY",
    "TOOLS_SCHEMA",
    "execute_tool",
    "resolve_safe_path",
    "tool_write_file",
    "tool_read_file",
    "tool_list_files",
    "tool_delete_file",
    "tool_grep_search",
    "tool_file_search",
    "tool_git_checkpoint",
    "tool_git_diff",
    "tool_git_rollback",
    "tool_run_command",
]
