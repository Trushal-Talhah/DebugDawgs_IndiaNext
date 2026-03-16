import json
import re
from typing import Dict, Any, List

from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.llm.groq_client import get_llm
from app.agent.tools import ALL_TOOLS
from app.agent.fusion_engine import compute_fusion


SYSTEM_PROMPT = """You are CyberSentinel, an expert AI-powered cyber threat analyst \
specializing in multi-vector threat detection and compound attack identification.

You have access to specialized investigation tools. Your job is not just to detect \
one threat — it is to investigate the input from EVERY relevant angle and determine \
whether multiple threat types are present simultaneously.

═══════════════════════════════════════════
LAYER 1 — STATIC DETECTION (Always Run First)
═══════════════════════════════════════════

INPUT TYPE "email":
1. ALWAYS call analyze_phishing_text on the full content.
2. ALWAYS call detect_ai_generated_content on the full content.
3. ALWAYS call extract_urls_from_text on the full content.
4. If URLs are found, call analyze_url on EACH URL (max 3).
5. If any injection patterns are visible, ALSO call detect_prompt_injection.

INPUT TYPE "url":
1. ALWAYS call analyze_url on the content directly.

INPUT TYPE "prompt":
1. ALWAYS call detect_prompt_injection on the content.
2. ALWAYS call analyze_phishing_text to check for social engineering.

INPUT TYPE "login_log":
1. ALWAYS call detect_anomalous_login with the full content as JSON string.

INPUT TYPE "ai_text":
1. ALWAYS call detect_ai_generated_content on the content.
2. ALWAYS call analyze_phishing_text to check for embedded social engineering.

═══════════════════════════════════════════
LAYER 2 — DYNAMIC DETECTION (Content-Triggered)
═══════════════════════════════════════════

After Layer 1 completes, inspect your results:

TRIGGER 1 — URLs found in any text input:
→ Always extract and analyze each URL individually.
→ This applies even if the primary input type is not "url".

TRIGGER 2 — Injection patterns inside an email:
→ If phishing analysis finds phrases like "ignore instructions", "act as", "DAN",
  call detect_prompt_injection as well.
→ This is a compound phishing + injection attack.

TRIGGER 3 — High phishing score + high AI content score:
→ If both phishing_score >= 60 AND ai_content_score >= 55 on the same email,
  explicitly flag this as an AI-crafted phishing attack in your final response.

═══════════════════════════════════════════
SYNTHESIS — After ALL tools have run
═══════════════════════════════════════════

When no more tools are needed, synthesize ALL results into ONE final JSON response.

CRITICAL: Your final response must be ONLY this JSON object with NO other text before or after it:

{{
  "threat_type": "primary threat type or compound label like 'AI-Crafted Phishing Attack'",
  "risk_score": <integer 0-100, use the HIGHEST score found across all modules>,
  "confidence": <integer 0-100>,
  "verdict": "<HIGH if score>=75 | MEDIUM if score>=50 | LOW if score>=25 | SAFE>",
  "signals": ["top 5 most critical signals combined from ALL modules"],
  "explanation": "4-5 sentence paragraph explaining ALL findings. If multiple modules fired, explain how the threats INTERACT and reinforce each other. Be specific about which features triggered each module.",
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "highlighted_segments": ["suspicious phrase or feature 1", "suspicious phrase 2"],
  "detector_results": [
    {{
      "threat_type": "module name",
      "risk_score": <score from this module>,
      "confidence": <confidence from this module>,
      "signals": ["signals from this module"]
    }}
  ]
}}

The detector_results array must contain one entry per tool that was called.
This powers the per-module breakdown displayed in the frontend."""


def _build_executor() -> AgentExecutor:
    llm = get_llm(temperature=0.1)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "Input Type: {input_type}\n\nContent:\n{content}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])
    agent = create_tool_calling_agent(llm, ALL_TOOLS, prompt)
    return AgentExecutor(
        agent=agent,
        tools=ALL_TOOLS,
        verbose=True,
        max_iterations=10,
        handle_parsing_errors=True,
        return_intermediate_steps=False,
    )


_executor: AgentExecutor | None = None


def get_executor() -> AgentExecutor:
    global _executor
    if _executor is None:
        _executor = _build_executor()
    return _executor


def _parse_output(raw: str) -> Dict[str, Any]:
    """Extract JSON from agent output and attach fusion analysis."""

    # Find JSON block in the output
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if json_match:
        try:
            parsed = json.loads(json_match.group())

            # Run fusion engine on the detector_results array
            detector_results = parsed.get("detector_results", [])

            # If agent didn't populate detector_results, build it from top-level data
            if not detector_results:
                detector_results = [{
                    "threat_type": parsed.get("threat_type", "Unknown"),
                    "risk_score": parsed.get("risk_score", 0),
                    "confidence": parsed.get("confidence", 50),
                    "signals": parsed.get("signals", []),
                }]

            fusion = compute_fusion(detector_results)

            # Attach fusion fields to the parsed result
            parsed["fusion_score"] = fusion["fusion_score"]
            parsed["fusion_verdict"] = fusion["fusion_verdict"]
            parsed["threats_detected"] = fusion["threats_detected"]
            parsed["per_module_scores"] = fusion["per_module_scores"]
            parsed["is_compound_threat"] = fusion["is_compound_threat"]
            parsed["compound_threat_label"] = fusion["compound_threat_label"]
            parsed["modules_triggered"] = fusion["modules_triggered"]

            # If compound, upgrade the threat_type label
            if fusion["is_compound_threat"]:
                parsed["threat_type"] = fusion["compound_threat_label"]

            # Use fusion score as the canonical risk score
            parsed["risk_score"] = fusion["fusion_score"]
            parsed["verdict"] = fusion["fusion_verdict"]

            return parsed

        except json.JSONDecodeError:
            pass

    # Fallback if parsing fails entirely
    return {
        "threat_type": "Unknown",
        "risk_score": 0,
        "confidence": 50,
        "verdict": "SAFE",
        "signals": ["Analysis completed but output parsing failed"],
        "explanation": raw[:500] if raw else "No explanation available.",
        "recommendations": [
            "Review the input manually.",
            "Consult your IT security team.",
            "Retry the analysis."
        ],
        "highlighted_segments": [],
        "detector_results": [],
        "fusion_score": 0,
        "fusion_verdict": "SAFE",
        "threats_detected": [],
        "per_module_scores": {},
        "is_compound_threat": False,
        "compound_threat_label": "Unknown",
        "modules_triggered": 0,
    }


async def analyze(input_type: str, content: str) -> Dict[str, Any]:
    try:
        result = await get_executor().ainvoke({
            "input_type": input_type,
            "content": content[:3500],
        })
        return _parse_output(result.get("output", ""))
    except Exception as e:
        return {
            "threat_type": "Analysis Error",
            "risk_score": 0,
            "confidence": 0,
            "verdict": "SAFE",
            "signals": [f"Agent error: {str(e)}"],
            "explanation": f"The analysis pipeline encountered an error: {str(e)}",
            "recommendations": [
                "Retry the analysis.",
                "Check API key validity.",
                "Contact support if the issue persists."
            ],
            "highlighted_segments": [],
            "detector_results": [],
            "fusion_score": 0,
            "fusion_verdict": "SAFE",
            "threats_detected": [],
            "per_module_scores": {},
            "is_compound_threat": False,
            "compound_threat_label": "Analysis Error",
            "modules_triggered": 0,
        }