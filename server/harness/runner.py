import json
from typing import Dict, Any, List
from brain.llm import ask_llm
from brain.prompts import SYSTEM_PROMPT
from harness.tools import TOOLS_SCHEMA, execute_tool


def _sanitize_arguments(raw_args: str) -> str:
    """
    Parse and re-serialize tool call arguments to guarantee valid JSON.
    Some providers (Groq, OpenRouter) emit malformed JSON in tool_calls
    but then reject it when echoed back in conversation history.
    """
    if not raw_args:
        return "{}"
    try:
        parsed = json.loads(raw_args)
        return json.dumps(parsed)
    except json.JSONDecodeError:
        try:
            import ast
            parsed = ast.literal_eval(raw_args)
            return json.dumps(parsed)
        except Exception:
            return "{}"


def run_coding_agent(
    task: str,
    model: str,
    base_url: str = None,
    max_iterations: int = 15,
    memory: str = None,
) -> Dict[str, Any]:
    """
    Autonomous agent execution loop.
    Iteratively queries the LLM, executes requested tools, and feeds results back.
    Includes compressed conversation memory if running inside a continuing session.
    """
    system_content = SYSTEM_PROMPT
    if memory and memory.strip():
        system_content += f"\n\n### CONVERSATION MEMORY (PRIOR ACHIEVEMENTS & CONTEXT)\n{memory.strip()}\n"

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": task}
    ]

    logs = []
    total_prompt_tokens = 0
    total_completion_tokens = 0

    for step in range(1, max_iterations + 1):
        logs.append(f"--- Iteration {step} ---")

        # 1. Ask the Brain
        response_msg, usage = ask_llm(
            messages=messages,
            model=model,
            base_url=base_url,
            tools=TOOLS_SCHEMA
        )

        total_prompt_tokens += usage.get("prompt_tokens", 0)
        total_completion_tokens += usage.get("completion_tokens", 0)

        # 2. Append assistant response to history
        assistant_dict = {"role": "assistant"}
        if response_msg.content:
            assistant_dict["content"] = response_msg.content
        if response_msg.tool_calls:
            assistant_dict["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": _sanitize_arguments(tc.function.arguments)
                    }
                }
                for tc in response_msg.tool_calls
            ]
        messages.append(assistant_dict)

        # 3. Check if LLM is done (no tool calls)
        if not response_msg.tool_calls:
            logs.append("Task completed by agent.")
            return {
                "status": "completed",
                "final_answer": response_msg.content,
                "iterations": step,
                "logs": logs,
                "usage": {
                    "prompt_tokens": total_prompt_tokens,
                    "completion_tokens": total_completion_tokens,
                    "total_tokens": total_prompt_tokens + total_completion_tokens,
                    "limit": 128000,
                }
            }

        # 4. Execute requested tools
        for tool_call in response_msg.tool_calls:
            tool_name = tool_call.function.name
            clean_args = _sanitize_arguments(tool_call.function.arguments)
            tool_args = json.loads(clean_args)

            logs.append(f"Action: {tool_name}({tool_args})")

            observation = execute_tool(tool_name, tool_args)
            logs.append(f"Observation: {observation}")

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": str(observation)
            })

    return {
        "status": "max_iterations_reached",
        "final_answer": "Agent reached maximum iteration limit before completing.",
        "iterations": max_iterations,
        "logs": logs,
        "usage": {
            "prompt_tokens": total_prompt_tokens,
            "completion_tokens": total_completion_tokens,
            "total_tokens": total_prompt_tokens + total_completion_tokens,
            "limit": 128000,
        }
    }
