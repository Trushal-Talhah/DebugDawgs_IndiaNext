from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    GROQ_API_KEY: str
    NVIDIA_API_KEY: str = ""
    HF_API_KEY: str = ""
    LLM_PROVIDER: str = "groq"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    INCIDENTS_FILE: str = "data/incidents.json"

    class Config:
        env_file = ".env"

settings = Settings()
