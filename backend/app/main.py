from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import scan, scan_image, incidents


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🛡️  CyberSentinel — Cyber Defense Platform")
    print(f"   LLM Provider  : {settings.LLM_PROVIDER.upper()}")
    print(f"   Threat Areas  : 5/6 (Phishing | URL | Deepfake | Prompt Injection | Anomaly | AI Content)")
    print(f"   Agent Mode    : LangChain Tool-Calling AgentExecutor")
    print(f"   API Docs      : http://localhost:8000/docs")
    yield
    print("Shutting down CyberSentinel.")


app = FastAPI(
    title="CyberSentinel — AI Cyber Defense Platform",
    description="AI-powered multi-threat detection covering 5/6 threat areas with Explainable AI and Agentic tool-calling.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
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
        "llm_provider": settings.LLM_PROVIDER,
        "threat_areas": ["phishing", "url", "deepfake", "prompt_injection", "anomaly_login", "ai_content"],
        "version": "1.0.0"
    }
