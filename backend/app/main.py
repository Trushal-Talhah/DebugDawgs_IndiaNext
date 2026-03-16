from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import scan, scan_image, incidents


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🛡️  SentinelAI — Cyber Defense Platform")
    print(f"   LLM Provider  : {settings.LLM_PROVIDER.upper()}")
    print(f"   Threat Areas  : Phishing | URL | Deepfake | Prompt Injection | Anomaly | AI Content")
    print(f"   Fusion Engine : ENABLED — Multi-vector compound threat detection")
    print(f"   Agent Mode    : LangChain Tool-Calling AgentExecutor")
    print(f"   API Docs      : http://localhost:8000/docs")
    yield
    print("Shutting down SentinelAI.")


app = FastAPI(
    title="SentinelAI — AI Cyber Defense Platform",
    description="AI-powered multi-threat detection with Explainable AI, Agentic tool-calling, and Multi-vector Fusion Engine.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r".*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router, prefix="/api", tags=["Threat Scan — Text"])
app.include_router(scan_image.router, prefix="/api", tags=["Threat Scan — Image (Deepfake)"])
app.include_router(incidents.router, prefix="/api", tags=["Incident Log"])


@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "llm_provider": settings.LLM_PROVIDER,
        "fusion_engine": "enabled",
        "threat_areas": [
            "phishing",
            "url",
            "deepfake",
            "prompt_injection",
            "anomaly_login",
            "ai_content",
        ],
        "valid_input_types": [
            "email",
            "url",
            "prompt",
            "login_log",
            "ai_text",
        ],
    }