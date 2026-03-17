import re
import torch
from pathlib import Path
from typing import Dict, Any, List

# ── Model path ────────────────────────────────────────────────────────────────
_BASE     = Path(__file__).resolve().parent.parent.parent / "models" / "prompt_injection_model"

# ── Lazy-loaded model state ───────────────────────────────────────────────────
_tokenizer = None
_model     = None
_model_ok  = False
import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[model] Running on: {DEVICE} {'(' + torch.cuda.get_device_name(0) + ')' if DEVICE == 'cuda' else '(no GPU)'}")


def _load_model() -> bool:
    global _tokenizer, _model, _model_ok
    if _model_ok:
        return True
    try:
        from transformers import DistilBertTokenizerFast, DistilBertForSequenceClassification
        _tokenizer = DistilBertTokenizerFast.from_pretrained(str(_BASE))
        _model     = DistilBertForSequenceClassification.from_pretrained(str(_BASE))
        _model.to(DEVICE)
        _model.eval()
        _model_ok = True
        print(f"[prompt_injection_detector] Model loaded on {DEVICE} ✅")
        return True
    except Exception as e:
        print(f"[prompt_injection_detector] Model load failed — using regex fallback. Reason: {e}")
        _model_ok = False
        return False


def _ml_infer(text: str) -> tuple:
    """Returns (risk_score_0_100, confidence_0_100)."""
    inputs = _tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=256,        # matches training max_length
        padding=True,
    ).to(DEVICE)

    with torch.no_grad():
        logits = _model(**inputs).logits

    probs      = torch.softmax(logits, dim=-1)[0]
    injection_p = probs[1].item()   # index 1 = injection
    safe_p      = probs[0].item()   # index 0 = benign

    risk_score = round(injection_p * 100, 1)
    confidence = round(abs(injection_p - safe_p) * 100, 1)
    return risk_score, confidence


# ── Regex patterns (fallback + explainability) ────────────────────────────────
INJECTION_PATTERNS = [
    (r'ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|constraints?)', 30, "Instruction override attempt"),
    (r'disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)',                   28, "Instruction disregard attack"),
    (r'forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)',                      28, "Memory wipe attempt"),
    (r'you\s+are\s+now\s+(a|an|the)\s+\w+',                                                             25, "Role-switching attack"),
    (r'act\s+as\s+(a|an|the)\s+\w+',                                                                    22, "Unrestricted role impersonation"),
    (r'pretend\s+(you\s+are|to\s+be)\s+(a|an|the)',                                                     20, "Identity impersonation"),
    (r'(reveal|show|print|display|output|repeat)\s+(your\s+)?(system\s+prompt|initial\s+instructions?)', 35, "System prompt extraction"),
    (r'what\s+(are|were)\s+your\s+(original\s+)?(instructions?|system\s+prompt|rules?)',                 25, "System prompt probing"),
    (r'\bDAN\b.{0,30}(mode|prompt|activated)',                                                           35, "DAN jailbreak"),
    (r'\bjailbreak\b',                                                                                    28, "Explicit jailbreak keyword"),
    (r'developer\s+mode\s+(enabled|activated|on)',                                                       25, "Developer mode exploit"),
    (r'(god|admin|root|sudo)\s+mode',                                                                    22, "Privilege escalation attempt"),
    (r'```\s*\n?\s*(system|user|assistant)\b',                                                           25, "Markdown delimiter injection"),
    (r'<\|?(system|user|assistant|im_start|im_end)\|?>',                                                 28, "Token delimiter injection"),
    (r'\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>',                                                            28, "Llama prompt format injection"),
    (r'do\s+anything\s+now',                                                                             25, "DAN variant"),
    (r'(bypass|override|circumvent)\s+(safety|filter|restriction|guideline)',                            30, "Safety bypass attempt"),
    (r'(without\s+)?(any\s+)?(ethical|moral)\s+(consideration|constraint|restriction)',                  20, "Ethics bypass"),
    (r'translate\s+the\s+following\s+and\s+then\s+(ignore|forget)',                                     22, "Translation injection"),
    (r'the\s+above\s+was\s+a\s+(test|joke|simulation)',                                                  18, "Context manipulation"),
]


def _regex_score(content: str):
    """Returns (risk_score, matched_patterns, signals)."""
    total_score = 0.0
    matched     = []
    signals     = []

    for pattern, weight, description in INJECTION_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            total_score += weight
            matched.append({"feature": description, "weight": weight})
            signals.append(description)

    risk_score = min(total_score, 100)
    total_w    = sum(m["weight"] for m in matched)
    if total_w > 0:
        for m in matched:
            m["weight"] = round(m["weight"] / total_w * 100, 1)
    matched.sort(key=lambda x: x["weight"], reverse=True)

    return risk_score, matched, signals


# ── Public API — signature unchanged from tools.py ────────────────────────────
def detect_prompt_injection(content: str) -> Dict[str, Any]:
    """
    Primary:  DistilBERT fine-tuned on deepset/prompt-injections
    Fallback: Regex pattern matching
    Return dict keys are unchanged — tools.py needs zero updates.
    """
    regex_score, matched_patterns, regex_signals = _regex_score(content)

    if _load_model():
        try:
            ml_score, ml_confidence = _ml_infer(content)

            # Blend: 70% ML + 30% regex
            # Regex catches explicit known patterns ML might miss on short inputs
            final_score = round(min(0.70 * ml_score + 0.30 * regex_score, 100), 1)

            # If ML is confident it's safe but regex fires strongly → trust regex
            if ml_score < 20 and regex_score >= 50:
                final_score = round(min(0.40 * ml_score + 0.60 * regex_score, 100), 1)

            # Build signals — ML signal first if firing
            signals = []
            if ml_score >= 70:
                signals.append(f"DistilBERT flagged as prompt injection (confidence: {ml_confidence:.1f}%)")
            elif ml_score >= 40:
                signals.append(f"DistilBERT flagged as likely injection (score: {ml_score:.1f})")
            signals.extend(regex_signals)

            # Use regex matched_patterns for explainability (feature names are meaningful)
            # If no regex fired, build feature weight from ML score
            if not matched_patterns:
                matched_patterns = [{"feature": "ML Injection Classifier", "weight": 100.0}]

            confidence = min(ml_confidence + len(matched_patterns) * 5, 95.0)

            return {
                "risk_score"         : final_score,
                "confidence"         : confidence,
                "matched_patterns"   : matched_patterns[:6],
                "signals"            : signals[:6],
                "needs_llm_review"   : 15 <= final_score < 55,
                "highlighted_segments": list(set(s.lower() for s in regex_signals))[:8],
            }

        except Exception as e:
            print(f"[prompt_injection_detector] Inference failed — using regex. Reason: {e}")

    # ── Regex-only fallback ───────────────────────────────────────────────────
    confidence = min(60.0 + len(matched_patterns) * 10, 95.0) if matched_patterns else 30.0
    return {
        "risk_score"         : regex_score,
        "confidence"         : confidence,
        "matched_patterns"   : matched_patterns[:6],
        "signals"            : regex_signals,
        "needs_llm_review"   : 15 <= regex_score < 55,
        "highlighted_segments": list(set(s.lower() for s in regex_signals))[:8],
    }
