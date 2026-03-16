import re
from typing import Dict, Any, List

INJECTION_PATTERNS = [
    (r'ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|constraints?)', 30, "Instruction override attempt"),
    (r'disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)', 28, "Instruction disregard attack"),
    (r'forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)', 28, "Memory wipe attempt"),
    (r'you\s+are\s+now\s+(a|an|the)\s+\w+', 25, "Role-switching attack"),
    (r'act\s+as\s+(a|an|the)\s+\w+', 22, "Unrestricted role impersonation"),
    (r'pretend\s+(you\s+are|to\s+be)\s+(a|an|the)', 20, "Identity impersonation"),
    (r'(reveal|show|print|display|output|repeat)\s+(your\s+)?(system\s+prompt|initial\s+instructions?)', 35, "System prompt extraction"),
    (r'what\s+(are|were)\s+your\s+(original\s+)?(instructions?|system\s+prompt|rules?)', 25, "System prompt probing"),
    (r'\bDAN\b.{0,30}(mode|prompt|activated)', 35, "DAN jailbreak"),
    (r'\bjailbreak\b', 28, "Explicit jailbreak keyword"),
    (r'developer\s+mode\s+(enabled|activated|on)', 25, "Developer mode exploit"),
    (r'(god|admin|root|sudo)\s+mode', 22, "Privilege escalation attempt"),
    (r'```\s*\n?\s*(system|user|assistant)\b', 25, "Markdown delimiter injection"),
    (r'<\|?(system|user|assistant|im_start|im_end)\|?>', 28, "Token delimiter injection"),
    (r'\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>', 28, "Llama prompt format injection"),
    (r'do\s+anything\s+now', 25, "DAN variant"),
    (r'(bypass|override|circumvent)\s+(safety|filter|restriction|guideline)', 30, "Safety bypass attempt"),
    (r'(without\s+)?(any\s+)?(ethical|moral)\s+(consideration|constraint|restriction)', 20, "Ethics bypass"),
    (r'translate\s+the\s+following\s+and\s+then\s+(ignore|forget)', 22, "Translation injection"),
    (r'the\s+above\s+was\s+a\s+(test|joke|simulation)', 18, "Context manipulation"),
]


def detect_prompt_injection(content: str) -> Dict[str, Any]:
    total_score = 0.0
    matched = []
    signals = []

    for pattern, weight, description in INJECTION_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            total_score += weight
            matched.append({"feature": description, "weight": weight})
            signals.append(description)

    risk_score = min(total_score, 100)
    total_w = sum(m["weight"] for m in matched)
    if total_w > 0:
        for m in matched:
            m["weight"] = round(m["weight"] / total_w * 100, 1)
    matched.sort(key=lambda x: x["weight"], reverse=True)

    confidence = min(60.0 + len(matched) * 10, 95.0) if matched else 30.0

    return {
        "risk_score": risk_score,
        "confidence": confidence,
        "matched_patterns": matched[:6],
        "signals": signals,
        "needs_llm_review": 15 <= risk_score < 55,
        "highlighted_segments": list(set(s.lower() for s in signals))[:8]
    }
