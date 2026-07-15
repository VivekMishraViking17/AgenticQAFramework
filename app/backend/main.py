from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import Base, engine, SessionLocal
from .models import Story
from .routers import catalog, dashboard, stories
from .seed import seed_database

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic QE Framework", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stories.router)
app.include_router(dashboard.router)
app.include_router(catalog.router)

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND), name="static")


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        if db.query(Story).count() == 0:
            seed_database(db)
    finally:
        db.close()


@app.get("/")
def serve_app():
    return FileResponse(FRONTEND / "index.html")


@app.get("/health")
def health():
    return {"status": "ok", "service": "agentic-qe-framework"}
