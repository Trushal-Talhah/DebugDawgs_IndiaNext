from langchain_groq import ChatGroq
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from app.config import settings

def get_llm(temperature: float = 0.1):
    if settings.LLM_PROVIDER == "nvidia" and settings.NVIDIA_API_KEY:
        return ChatNVIDIA(
            api_key=settings.NVIDIA_API_KEY,
            model="meta/llama-3.3-70b-instruct",
            temperature=temperature,
            max_tokens=1024
        )
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model="llama-3.3-70b-versatile",
        temperature=temperature,
        max_tokens=1024
    )
