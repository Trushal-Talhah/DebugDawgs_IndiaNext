import re
import json
import math
from typing import Dict, Any, List, Tuple
from collections import Counter


def _sentence_std(text: str) -> float:
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 10]
    if len(sentences) < 3:
        return 999.0
    lengths = [len(s.split()) for s in sentences]
    mean = sum(lengths) / len(lengths)
    return math.sqrt(sum((l - mean) ** 2 for l in lengths) / len(lengths))


def _lexical_diversity(text: str) -> float:
    words = re.findall(r'\b\w+\b', text.lower())
    return len(set(words)) / len(words) if words else 1.0


def _repeated_bigrams(text: str) -> int:
    words = text.lower().split()
    bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words) - 1)]
    counts = Counter(bigrams)
    return sum(1 for c in counts.values() if c > 2)


def _punctuation_monotony(text: str) -> float:
    punct = re.findall(r'[.!?;,:]', text)
    if not punct:
        return 0.0
    return Counter(punct).get('.', 0) / len(punct)


def _statistical_analysis(text: str) -> Tuple[float, List[Dict], List[str]]:
    score = 0.0
    attributions = []
    signals = []

    std = _sentence_std(text)
    if std < 10:
        score += 30
        attributions.append({"feature": "Uniform Sentence Structure", "weight": 30})
        signals.append("Unnaturally uniform sentence lengths — strong AI indicator")
    elif std < 16:
        score += 15
        attributions.append({"feature": "Low Sentence Variance", "weight": 15})
        signals.append("Low sentence length variation — possible AI generation")

    lex = _lexical_diversity(text)
    if lex < 0.52:
        score += 28
        attributions.append({"feature": "Low Lexical Diversity", "weight": 28})
        signals.append("Limited vocabulary variation — AI text pattern")
    elif lex < 0.65:
        score += 14
        attributions.append({"feature": "Moderate Repetition", "weight": 14})

    repeats = _repeated_bigrams(text)
    if repeats > 5:
        c = min(repeats * 3, 22)
        score += c
        attributions.append({"feature": "Repetitive Phrase Patterns", "weight": c})
        signals.append(f"High phrase repetition ({repeats} repeated bigrams) — AI writing marker")

    mono = _punctuation_monotony(text)
    if mono > 0.88:
        score += 15
        attributions.append({"feature": "Monotone Punctuation", "weight": 15})
        signals.append("Punctuation uniformity typical of language model output")

    final = min(score, 100)
    total_w = sum(a["weight"] for a in attributions)
    if total_w > 0:
        for a in attributions:
            a["weight"] = round(a["weight"] / total_w * 100, 1)
    attributions.sort(key=lambda x: x["weight"], reverse=True)
    return final, attributions[:5], signals


async def detect(text: str) -> Dict[str, Any]:
    from app.llm.groq_client import get_llm
    from app.llm.prompts import AI_CONTENT_JUDGE_PROMPT
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    stat_score, attributions, stat_signals = _statistical_analysis(text)

    if len(text.split()) < 40:
        return {
            "risk_score": stat_score, "confidence": 55.0,
            "verdict": _verdict(stat_score), "threat_type": "AI-Generated Content",
            "signals": stat_signals or ["Text too short for definitive analysis"],
            "feature_weights": attributions, "highlighted_segments": []
        }

    try:
        chain = (
            ChatPromptTemplate.from_template(AI_CONTENT_JUDGE_PROMPT)
            | get_llm(temperature=0.1)
            | StrOutputParser()
        )
        raw = await chain.ainvoke({"content": text[:2500]})
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if not json_match:
            raise ValueError("No JSON found in LLM response")

        llm_result = json.loads(json_match.group())
        llm_score = float(llm_result.get("ai_probability", 0.5)) * 100
        llm_signals = llm_result.get("evidence", [])
        suspicious_phrases = llm_result.get("suspicious_phrases", [])
        llm_attrs = llm_result.get("attribution", [])

        final_score = round(stat_score * 0.35 + llm_score * 0.65, 1)
        all_signals = list(dict.fromkeys(stat_signals + llm_signals))

        merged_attrs = attributions.copy()
        for la in llm_attrs:
            if not any(a["feature"] == la.get("feature") for a in merged_attrs):
                merged_attrs.append(la)

        return {
            "risk_score": final_score,
            "confidence": round(min(55 + len(all_signals) * 8, 93), 1),
            "verdict": _verdict(final_score),
            "threat_type": "AI-Generated Malicious Content",
            "signals": all_signals[:6],
            "feature_weights": merged_attrs[:5],
            "highlighted_segments": suspicious_phrases[:8]
        }

    except Exception:
        return {
            "risk_score": stat_score, "confidence": 58.0,
            "verdict": _verdict(stat_score), "threat_type": "AI-Generated Content",
            "signals": stat_signals, "feature_weights": attributions, "highlighted_segments": []
        }


def _verdict(score: float) -> str:
    if score >= 75: return "HIGH"
    elif score >= 50: return "MEDIUM"
    elif score >= 25: return "LOW"
    return "SAFE"
