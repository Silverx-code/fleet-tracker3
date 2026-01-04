from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine
from . import models
from .routes import router

app = FastAPI(
    title="Fleet Tracker API",
    description="Real-time vehicle tracking system",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative React dev
    "http://127.0.0.1:5173",
    # Add your GitHub Pages URL later:
    # "https://<your-username>.github.io",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def on_startup():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database ready!")

# Include API routes
app.include_router(router, prefix="/api", tags=["Fleet Tracking"])

# Root endpoint
@app.get("/")
def root():
    return {
        "message": "Fleet Tracker API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "ok", "database": "connected"}