from typing import Dict, Any, List
from sandbox.container import run_in_docker


def tool_run_command(command: str) -> str:
    """Executes a shell command inside the Docker sandbox."""
    res = run_in_docker(command)
    exit_code = 0 if res.get("success") else 1
    stdout = res.get("output", "").strip()
    stderr = res.get("error", "").strip()

    parts = [f"Exit Code: {exit_code}"]
    if stdout:
        parts.append(f"Output:\n{stdout}")
    if stderr:
        parts.append(f"Errors:\n{stderr}")
    return "\n".join(parts)


EXEC_TOOLS_SCHEMA: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "run_command",
            "description": "Execute a shell command inside the Docker sandbox.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Shell command to run."}
                },
                "required": ["command"]
            }
        }
    }
]

