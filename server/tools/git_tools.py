import subprocess
from typing import Dict, Any, List
from sandbox.container import WORKSPACE_PATH


def ensure_git_repo() -> None:
    """Ensures that the workspace is initialized as a git repository."""
    git_dir = WORKSPACE_PATH / ".git"
    if not git_dir.exists():
        subprocess.run(["git", "init"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)
        subprocess.run(["git", "config", "user.name", "Deskie Agent"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)
        subprocess.run(["git", "config", "user.email", "agent@deskie.local"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)
        gitignore = WORKSPACE_PATH / ".gitignore"
        if not gitignore.exists():
            gitignore.write_text("__pycache__/\n*.pyc\nnode_modules/\n.venv/\n.next/\n", encoding="utf-8")


def tool_git_checkpoint(message: str = "Checkpoint") -> str:
    """
    Creates a git commit checkpoint of all current workspace files,
    allowing safe rollback if subsequent changes or tests fail.
    """
    ensure_git_repo()
    subprocess.run(["git", "add", "-A"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)
    status_proc = subprocess.run(["git", "status", "--porcelain"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)

    if not status_proc.stdout.strip():
        return "No changes to checkpoint (working tree is clean)."

    commit_proc = subprocess.run(
        ["git", "commit", "-m", message],
        cwd=str(WORKSPACE_PATH),
        capture_output=True,
        text=True
    )
    if commit_proc.returncode != 0:
        return f"Checkpoint failed: {commit_proc.stderr.strip()}"

    log_proc = subprocess.run(["git", "log", "-1", "--oneline"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)
    return f"Checkpoint created successfully: {log_proc.stdout.strip()}"


def tool_git_diff(cached: bool = False) -> str:
    """
    Displays unstaged or staged diffs showing what has changed in the workspace.
    """
    ensure_git_repo()
    cmd = ["git", "diff", "--cached"] if cached else ["git", "diff"]
    diff_proc = subprocess.run(cmd, cwd=str(WORKSPACE_PATH), capture_output=True, text=True)
    untracked_proc = subprocess.run(["git", "status", "-s"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)

    output_parts = []
    if diff_proc.stdout.strip():
        output_parts.append(diff_proc.stdout.strip())
    if untracked_proc.stdout.strip():
        output_parts.append("File Status:\n" + untracked_proc.stdout.strip())

    if not output_parts:
        return "Workspace is clean. No uncommitted modifications or diffs."

    return "\n\n".join(output_parts)


def tool_git_rollback(target: str = "HEAD") -> str:
    """
    Rolls back workspace files to a previous checkpoint (default: HEAD),
    discarding broken edits and untracked files.
    """
    ensure_git_repo()
    reset_proc = subprocess.run(["git", "reset", "--hard", target], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)
    clean_proc = subprocess.run(["git", "clean", "-fd"], cwd=str(WORKSPACE_PATH), capture_output=True, text=True)

    if reset_proc.returncode != 0:
        return f"Rollback failed: {reset_proc.stderr.strip()}"

    return f"Rollback to {target} completed.\n{reset_proc.stdout.strip()}\n{clean_proc.stdout.strip()}".strip()


GIT_TOOLS_SCHEMA: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "git_checkpoint",
            "description": "Commit all current workspace changes as a restore checkpoint before testing new implementations or refactoring.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Descriptive message for the checkpoint.", "default": "Checkpoint"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "git_diff",
            "description": "Inspect uncommitted code changes and modified files in the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cached": {"type": "boolean", "description": "Whether to show staged changes.", "default": False}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "git_rollback",
            "description": "Discard broken changes and revert workspace files back to the last clean git checkpoint or a specific commit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {"type": "string", "description": "Git target to reset to (defaults to HEAD).", "default": "HEAD"}
                }
            }
        }
    }
]

