from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.generate import router as generate_router

app = FastAPI(title="QuickNotes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
