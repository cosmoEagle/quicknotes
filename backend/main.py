import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.generate import router as generate_router
from .routers.revise import router as revise_router

app = FastAPI(title="QuickNotes API", version="1.0.0")

# ALLOWED_ORIGINS: comma-separated list of allowed frontend origins.
# Defaults to localhost for dev; set to your Vercel URL in production.
_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
)

app.include_router(generate_router, prefix="/api")
app.include_router(revise_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
