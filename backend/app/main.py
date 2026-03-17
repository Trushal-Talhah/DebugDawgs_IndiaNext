from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import json
from app.config import settings
from app.api.routes import scan, scan_image, incidents
from app.api.prediction_routes import router as prediction_router
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🛡️  SentinelAI — Cyber Defense Platform")
    print(f"   LLM Provider  : {settings.LLM_PROVIDER.upper()}")
    print(f"   Chat Engine   : NVIDIA NIM — {settings.NVIDIA_API_KEY[:8]}...")
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

app.include_router(scan.router,        prefix="/api", tags=["Threat Scan — Text"])
app.include_router(scan_image.router,  prefix="/api", tags=["Threat Scan — Image (Deepfake)"])
app.include_router(incidents.router,   prefix="/api", tags=["Incident Log"])
app.include_router(prediction_router)

# scan_video and scan_audio not built yet
# app.include_router(scan_video.router, prefix="/api", tags=["Threat Scan — Video"])
# app.include_router(scan_audio.router, prefix="/api", tags=["Threat Scan — Audio"])


@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "llm_provider": settings.LLM_PROVIDER,
        "chat_engine": "nvidia-nim",
        "fusion_engine": "enabled",
        "threat_areas": [
            "phishing", "url", "deepfake",
            "prompt_injection", "anomaly_login", "ai_content",
        ],
        "valid_input_types": [
            "email", "url", "prompt", "login_log", "ai_text",
        ],
    }


from fastapi.responses import StreamingResponse
import json

@app.post("/api/chat", tags=["Chat"])
async def chat_proxy(payload: dict):
    nim_payload = {
        **payload,
        "model": "meta/llama-3.1-8b-instruct",
        "stream": True,
    }
    async def stream():
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                async with client.stream(
                    "POST",
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=nim_payload,
                ) as res:
                    async for line in res.aiter_lines():
                        if line.startswith("data: "):
                            chunk = line[6:]
                            if chunk.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(chunk)
                                token = data["choices"][0]["delta"].get("content", "")
                                if token:
                                    yield token
                            except Exception:
                                continue
        except Exception as e:
            yield f"\n\n**Stream error: {str(e)}**"

    return StreamingResponse(stream(), media_type="text/plain")