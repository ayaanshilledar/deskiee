import os
from openai import OpenAI
from pathlib import Path
from dotenv import load_dotenv

SERVER_DIR = Path(__file__).resolve().parent.parent
load_dotenv(SERVER_DIR / ".env")


def ask_llm(messages: list, model: str, base_url: str = None, tools: list = None):
    """
    Calls any OpenAI-compatible LLM endpoint dynamically with optional tool definitions.
    Returns (message, usage_dict).
    """
    client = OpenAI(
        api_key=os.getenv("LLM_API_KEY"),
        base_url=base_url
    )

    kwargs = {
        "model": model,
        "messages": messages,
    }
    if tools:
        kwargs["tools"] = tools

    response = client.chat.completions.create(**kwargs)

    usage = {
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
    }
    if hasattr(response, "usage") and response.usage:
        usage["prompt_tokens"] = getattr(response.usage, "prompt_tokens", 0) or 0
        usage["completion_tokens"] = getattr(response.usage, "completion_tokens", 0) or 0
        usage["total_tokens"] = getattr(response.usage, "total_tokens", 0) or 0

    return response.choices[0].message, usage
