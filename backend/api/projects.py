from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from backend.database import get_db
from backend.models import Project

router = APIRouter(prefix="/api/v1", tags=["projects"])

class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: str
    updated_at: str

# =============== CREATE PROJECT ===============

@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    request: ProjectCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new project"""
    try:
        project = Project(
            name=request.name,
            description=request.description
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== GET PROJECT ===============

@router.get("/projects/{projectId}", response_model=ProjectResponse)
async def get_project(
    projectId: str,
    db: Session = Depends(get_db)
):
    """Get project details"""
    try:
        project = db.query(Project).filter(Project.id == projectId).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== LIST PROJECTS ===============

@router.get("/projects")
async def list_projects(db: Session = Depends(get_db)):
    """List all projects"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info("Attempting to query projects...")
        projects = db.query(Project).all()
        logger.info(f"Found {len(projects)} projects")
        return {
            "projects": [
                {
                    "id": p.id,
                    "name": p.name,
                    "description": p.description,
                    "created_at": p.created_at.isoformat(),
                    "updated_at": p.updated_at.isoformat()
                }
                for p in projects
            ]
        }
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error in list_projects: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error listing projects: {str(e)}")

# =============== UPDATE PROJECT ===============

@router.put("/projects/{projectId}", response_model=ProjectResponse)
async def update_project(
    projectId: str,
    request: ProjectCreateRequest,
    db: Session = Depends(get_db)
):
    """Update project"""
    try:
        project = db.query(Project).filter(Project.id == projectId).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project.name = request.name
        project.description = request.description
        project.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(project)
        
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            created_at=project.created_at.isoformat(),
            updated_at=project.updated_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== DELETE PROJECT ===============

@router.delete("/projects/{projectId}")
async def delete_project(
    projectId: str,
    db: Session = Depends(get_db)
):
    """Delete project"""
    try:
        project = db.query(Project).filter(Project.id == projectId).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        db.delete(project)
        db.commit()
        
        return {"message": "Project deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
