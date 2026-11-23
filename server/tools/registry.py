from typing import Any, Callable, Dict, List
from tools.file_tools import (
    tool_write_file,
    tool_read_file,
    tool_list_files,
    tool_delete_file,
    FILE_TOOLS_SCHEMA,
)
from tools.search_tools import (
    tool_grep_search,
    tool_file_search,
    SEARCH_TOOLS_SCHEMA,
)
from tools.git_tools import (
    tool_git_checkpoint,
    tool_git_diff,
    tool_git_rollback,
    GIT_TOOLS_SCHEMA,
)
from tools.exec_tools import (
    tool_run_command,
    EXEC_TOOLS_SCHEMA,
)

TOOL_REGISTRY: Dict[str, Callable[..., str]] = {
    "write_file": tool_write_file,
    "read_file": tool_read_file,
    "list_files": tool_list_files,
    "delete_file": tool_delete_file,
    "run_command": tool_run_command,
    "grep_search": tool_grep_search,
    "file_search": tool_file_search,
    "git_checkpoint": tool_git_checkpoint,
    "git_diff": tool_git_diff,
    "git_rollback": tool_git_rollback,
}

TOOLS_SCHEMA: List[Dict[str, Any]] = [
    *FILE_TOOLS_SCHEMA,
    *SEARCH_TOOLS_SCHEMA,
    *GIT_TOOLS_SCHEMA,
    *EXEC_TOOLS_SCHEMA,
]


def execute_tool(name: str, args: Dict[str, Any]) -> str:
    """Safely dispatches and executes a tool from the registry."""
    func = TOOL_REGISTRY.get(name)
    if not func:
        return f"Error: Unknown tool '{name}'."

    try:
        return func(**args)
    except TypeError as te:
        return f"Error: Invalid arguments for tool '{name}': {te}"
    except Exception as e:
        return f"Error executing '{name}': {str(e)}"

