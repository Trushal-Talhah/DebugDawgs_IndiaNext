import json
import re
from typing import Dict, Any
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.llm.groq_client import get_llm
from app.agent.tools import ALL_TOOLS

SYSTEM_PROMPT = """You are CyberSentinel, an expert AI-powered cyber threat analyst.

You have access to specialized investigation tools. Based on the input type, follow these rules:

INPUT TYPE "email":
  1. Call analyze_phishing_text on the full content.
  2. Call extract_urls_from_text on the full content.
  3. If URLs are found, call analyze_url on each URL (maximum 3 URLs).
  4. Also call detect_ai_generated_content to check if the email itself was AI-crafted.

INPUT TYPE "url":
  1. Call analyze_url on the content directly.

INPUT TYPE "prompt":
  1. Call detect_prompt_injection on the content.
  2. Also call analyze_phishing_text to check for social engineering within the prompt.

INPUT TYPE "login_log":
  1. Call detect_anomalous_login with the full content as the JSON string argument.

INPUT TYPE "ai_text":
  1. Call detect_ai_generated_content on the content.
  2. Also call analyze_phishing_text to check for embedded social engineering.

After ALL tool calls are complete, synthesize every tool result into a single final JSON response.

IMPORTANT: Your final response must be ONLY this JSON object with NO other text:
{{
  "threat_type": "specific descriptive name of the primary threat",
  "risk_score": <integer 0-100, take the highest risk found across all tools>,
  "confidence": <integer 0-100>,
  "verdict": "<HIGH if score>=75 | MEDIUM if score>=50 | LOW if score>=25 | SAFE>",
  "signals": ["up to 5 most important signals from all tool results combined"],
  "explanation": "3-4 sentence paragraph explaining all findings. Be specific. Mention URL analysis results if applicable.",
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "highlighted_segments": ["suspicious phrase 1", "suspicious phrase 2"]
}}"""


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
        max_iterations=8,
        handle_parsing_errors=True,
        return_intermediate_steps=False
    )


_executor: AgentExecutor | None = None


def get_executor() -> AgentExecutor:
    global _executor
    if _executor is None:
        _executor = _build_executor()
    return _executor


def _parse_output(raw: str) -> Dict[str, Any]:
    json_match = re.search(r'\{[\s\S]*\}', raw)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    return {
        "threat_type": "Unknown",
        "risk_score": 0,
        "confidence": 50,
        "verdict": "SAFE",
        "signals": ["Analysis completed but output parsing failed"],
        "explanation": raw[:500] if raw else "No explanation available.",
        "recommendations": ["Review the input manually.", "Consult your IT security team.", "Retry the analysis."],
        "highlighted_segments": []
    }


async def analyze(input_type: str, content: str) -> Dict[str, Any]:
    try:
        result = await get_executor().ainvoke({
            "input_type": input_type,
            "content": content[:3500]
        })
        return _parse_output(result.get("output", ""))
    except Exception as e:
        return {
            "threat_type": "Analysis Error",
            "risk_score": 0, "confidence": 0, "verdict": "SAFE",
            "signals": [f"Agent error: {str(e)}"],
            "explanation": f"The analysis pipeline encountered an error: {str(e)}",
            "recommendations": ["Retry the analysis.", "Check API key validity.", "Contact support if issue persists."],
            "highlighted_segments": []
        }
