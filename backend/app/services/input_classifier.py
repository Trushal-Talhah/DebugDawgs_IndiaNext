import json
import re
from openai import AsyncOpenAI
from app.config import settings

_nvidia_client = None

def _get_nvidia_client() -> AsyncOpenAI:
    global _nvidia_client
    if _nvidia_client is None:
        _nvidia_client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=settings.NVIDIA_API_KEY,
        )
    return _nvidia_client

CLASSIFIER_SYSTEM_PROMPT = """You are a cybersecurity input classifier. Your ONLY job is to classify a given input string into exactly one of these 5 threat categories:

- url         → The input is a URL or web address (starts with http/https, or contains domain-like structure)
- email       → The input is an email body, message, or phishing text (contains email-like content, urgency language, account warnings, financial requests)
- prompt      → The input is a prompt injection attack or attempt to manipulate an AI system (contains instruction overrides, jailbreak attempts, role-switching, system prompt extraction)
- ai_text     → The input is a block of prose/text that needs to be checked if it was AI-generated (long-form paragraph content, essays, articles, reports)
- login_log   → The input is a JSON array of login/authentication events (contains timestamp, ip, status, country fields)

Rules:
- If the input is a valid URL or starts with http/https → always return "url"
- If the input is a JSON array with login-related fields → always return "login_log"
- If the input contains instruction manipulation targeting an AI → return "prompt"
- If the input looks like an email or message with suspicious content → return "email"
- Default for long unstructured text → "ai_text"

Respond ONLY with a valid JSON object in this exact format, nothing else:
{"input_type": "<one of: url|email|prompt|ai_text|login_log>", "confidence": <0.0 to 1.0>, "reasoning": "<one sentence>"}"""

async def classify_input(content: str) -> dict:
    """
    Uses NVIDIA NIM (meta/llama-3.1-8b-instruct) to semantically classify
    the input string into one of 5 threat categories.
    Falls back to lightweight heuristics if NVIDIA API is unavailable.
    """
    if settings.NVIDIA_API_KEY:
        try:
            client = _get_nvidia_client()
            response = await client.chat.completions.create(
                model="meta/llama-3.1-8b-instruct",
                messages=[
                    {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Classify this input:\n\n{content[:1500]}"}
                ],
                temperature=0.0,
                max_tokens=120,
            )
            raw = response.choices[0].message.content.strip()
            json_match = re.search(r'\{[\s\S]*?\}', raw)
            if json_match:
                result = json.loads(json_match.group())
                input_type = result.get("input_type", "").lower()
                if input_type in {"url", "email", "prompt", "ai_text", "login_log"}:
                    return {
                        "input_type": input_type,
                        "confidence": float(result.get("confidence", 0.85)),
                        "reasoning": result.get("reasoning", ""),
                        "classifier": "nvidia-nim"
                    }
        except Exception:
            pass

    # ── Heuristic fallback (only used if NVIDIA API fails) ──────────
    return _heuristic_classify(content)


def _heuristic_classify(content: str) -> dict:
    """Lightweight fallback — only triggered if NVIDIA NIM is unavailable."""
    stripped = content.strip()

    # login_log — JSON array with login event fields
    if stripped.startswith("["):
        try:
            data = json.loads(stripped)
            if isinstance(data, list) and len(data) > 0:
                first = data[0] if isinstance(data[0], dict) else {}
                login_keys = {"timestamp", "ip", "status", "country"}
                if login_keys & set(first.keys()):
                    return {"input_type": "login_log", "confidence": 0.97,
                            "reasoning": "JSON array with login event fields detected.",
                            "classifier": "heuristic"}
        except (json.JSONDecodeError, TypeError):
            pass

    # url — clear URL pattern
    if re.match(r'^https?://', stripped, re.IGNORECASE) or \
       re.match(r'^(www\.)[\w\-]+\.\w{2,}', stripped, re.IGNORECASE):
        return {"input_type": "url", "confidence": 0.98,
                "reasoning": "Input matches URL pattern.",
                "classifier": "heuristic"}

    lower = stripped.lower()

    # prompt injection — strong AI manipulation signals
    injection_signals = [
        "ignore all previous", "disregard previous", "forget previous",
        "you are now", "act as", "pretend to be", "dan mode",
        "jailbreak", "bypass safety", "system prompt", "override instructions",
        "[inst]", "<|system|>", "developer mode"
    ]
    if any(sig in lower for sig in injection_signals):
        return {"input_type": "prompt", "confidence": 0.93,
                "reasoning": "Prompt injection patterns detected.",
                "classifier": "heuristic"}

    # email — phishing/email content signals
    email_signals = [
        "dear customer", "dear user", "dear valued", "click here",
        "verify your account", "your account has been", "action required",
        "urgent", "suspended", "from:", "subject:", "kindly provide",
        "bank account", "credit card", "wire transfer"
    ]
    email_hits = sum(1 for sig in email_signals if sig in lower)
    if email_hits >= 2:
        return {"input_type": "email", "confidence": 0.80,
                "reasoning": "Email/phishing content patterns detected.",
                "classifier": "heuristic"}

    # ai_text — default for long prose
    word_count = len(stripped.split())
    if word_count >= 40:
        return {"input_type": "ai_text", "confidence": 0.65,
                "reasoning": "Long-form text defaulting to AI content check.",
                "classifier": "heuristic"}

    # short ambiguous text — default to prompt check
    return {"input_type": "prompt", "confidence": 0.55,
            "reasoning": "Short unstructured text — defaulting to prompt injection check.",
            "classifier": "heuristic"}