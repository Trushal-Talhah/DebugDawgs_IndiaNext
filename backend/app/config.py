from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Optional at boot so the API can start without secrets present.
    # Endpoints that rely on GROQ should validate this at call time.
    GROQ_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""
    NIM_API_KEY: str = ""
    HF_API_KEY: str = ""
    EXTENSION_API_KEY: str = "sentinel_secure_key_123"  # Default dev key
    LLM_PROVIDER: str = "groq"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:5173",
        "chrome-extension://eiiogncpmkfbjmbofdjdndfalalbfnal",
        "https://submedian-noncoherent-hellen.ngrok-free.dev"
    ]
    INCIDENTS_FILE: str = "data/incidents.json"

    class Config:
        env_file = ".env"

settings = Settings()
