import subprocess
from pathlib import Path

# Folder on your computer where the AI saves code
WORKSPACE_PATH = Path(__file__).resolve().parent.parent / "workspace"
WORKSPACE_PATH.mkdir(parents=True, exist_ok=True)

CONTAINER_NAME = "deskie-active-sandbox"
DEFAULT_IMAGE = "python:3.11-slim"


def ensure_sandbox_running(image: str = DEFAULT_IMAGE) -> str:
    """
    Ensures a single warm, long-running Docker container is active in the background.
    Commands are subsequently executed inside this container via `docker exec`,
    avoiding the massive cold-start latency of `docker run --rm` per command
    and preserving installed packages across multiple steps.
    """
    check_proc = subprocess.run(
        ["docker", "ps", "-q", "-f", f"name=^/{CONTAINER_NAME}$"],
        capture_output=True,
        text=True
    )
    if check_proc.returncode == 0 and check_proc.stdout.strip():
        return CONTAINER_NAME

    # Remove any stopped / dead container with the same name
    subprocess.run(["docker", "rm", "-f", CONTAINER_NAME], capture_output=True)

    # Start warm background container
    # -d : run in background
    # --init : clean up zombie processes and handle signals properly
    # --memory=2g : protect host against runaway memory consumption
    # -v ... : mount the workspace
    # tail -f /dev/null : keep container alive indefinitely
    start_cmd = [
        "docker", "run", "-d",
        "--name", CONTAINER_NAME,
        "--init",
        "--memory=2g",
        "-v", f"{WORKSPACE_PATH.resolve()}:/workspace",
        "-w", "/workspace",
        image,
        "tail", "-f", "/dev/null"
    ]

    start_proc = subprocess.run(start_cmd, capture_output=True, text=True)
    if start_proc.returncode != 0:
        raise RuntimeError(
            f"Failed to start warm Docker sandbox: {start_proc.stderr.strip() or start_proc.stdout.strip()}"
        )

    return CONTAINER_NAME


def run_in_docker(command: str, timeout: int = 60):
    """
    Runs a command inside the warm Docker container via `docker exec`
    and returns stdout, stderr, and exit status.
    Fast execution (~20-50ms) instead of seconds.
    """
    try:
        ensure_sandbox_running()

        exec_cmd = [
            "docker", "exec",
            CONTAINER_NAME,
            "sh", "-c", command
        ]

        process = subprocess.run(
            exec_cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        return {
            "output": process.stdout,
            "error": process.stderr,
            "success": process.returncode == 0
        }

    except subprocess.TimeoutExpired:
        return {
            "output": "",
            "error": f"Command timed out after {timeout} seconds.",
            "success": False
        }
    except Exception as e:
        return {
            "output": "",
            "error": f"Sandbox execution error: {str(e)}",
            "success": False
        }
