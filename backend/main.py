from fastapi import FastAPI
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
import os
import logging

print("DEBUG: Starting backend.main imports...")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("DEBUG: Importing database...")
from backend.database import engine, Base

logger.info("DEBUG: Importing auth...")
from backend.api import auth

logger.info("DEBUG: Importing projects...")
from backend.api import projects

logger.info("DEBUG: Importing documents...")
from backend.api import documents

print("DEBUG: Main router imports complete")

# Agents will be imported lazily if available
agents = None
agents_available = False

try:
    logger.info("DEBUG: Importing agents endpoints...")
    from backend.api import agents
    agents_available = True
    logger.info("DEBUG: Agents endpoints imported successfully")
except Exception as exc:
    agents_available = False
    logger.warning(f"Agents endpoint disabled due to import failure: {exc}")

def ensure_user_token_column():
    """Ensure the users table has a token column for auth persistence."""
    try:
        with engine.connect() as connection:
            if engine.dialect.name == "sqlite":
                result = connection.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
                if "token" not in columns:
                    logger.info("Adding missing token column to users table")
                    connection.execute(text("ALTER TABLE users ADD COLUMN token VARCHAR(255)"))
    except Exception as exc:
        logger.warning(f"Could not ensure token column exists: {exc}")

# Create database tables
try:
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    ensure_user_token_column()
    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")
    import traceback
    logger.error(traceback.format_exc())

# Initialize FastAPI app
app = FastAPI(
    title="AutoTestGen+ Backend API",
    description="Backend API for multi-agent AI testing automation system",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
if agents_available:
    app.include_router(agents.router)
else:
    logger.warning("Agents endpoint disabled due to missing dependencies or import error")
app.include_router(projects.router)
app.include_router(documents.router)

# Root endpoint
@app.get("/")
async def root():
    """Welcome endpoint"""
    return {
        "message": "Welcome to AutoTestGen+ Backend API",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/v1/health"
    }

# Health check
@app.get("/health")
async def health():
    """Basic health check"""
    return {"status": "healthy"}


@app.get("/api/v1/health")
async def api_health():
    """API health check for client-side base URL"""
    return {
        "status": "healthy",
        "service": "AutoTestGen+ Backend",
        "timestamp": datetime.utcnow().isoformat()
    }

logger.info("AutoTestGen+ Backend API initialized successfully")
logger.info("API Documentation available at http://localhost:8000/docs")
