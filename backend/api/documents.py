from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import tempfile
import os
import uuid
from datetime import datetime
from backend.database import get_db
from backend.models import Document, Project

router = APIRouter(prefix="/api/v1", tags=["documents"])

# =============== REQUEST/RESPONSE MODELS ===============

class DocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    file_path: str
    created_at: str

# =============== UPLOAD DOCUMENT ===============

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    projectId: str = Query(...),
    db: Session = Depends(get_db)
):
    """Upload a document (PDF, DOCX, TXT) to a project"""
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == projectId).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Save file to temp directory
        upload_dir = os.path.join(tempfile.gettempdir(), "autotestgen_uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        file_extension = os.path.splitext(file.filename)[1]
        file_id = str(uuid.uuid4())
        file_path = os.path.join(upload_dir, f"{file_id}{file_extension}")
        
        # Write file
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Create document record
        doc = Document(
            project_id=projectId,
            filename=file.filename,
            file_path=file_path,
            created_at=datetime.utcnow()
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        return DocumentResponse(
            id=doc.id,
            project_id=doc.project_id,
            filename=doc.filename,
            file_path=doc.file_path,
            created_at=doc.created_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== LIST DOCUMENTS ===============

@router.get("/documents")
async def list_documents(
    projectId: str = Query(...),
    db: Session = Depends(get_db)
):
    """List documents for a project"""
    try:
        documents = db.query(Document).filter(Document.project_id == projectId).all()
        return {
            "documents": [
                {
                    "id": d.id,
                    "project_id": d.project_id,
                    "filename": d.filename,
                    "file_path": d.file_path,
                    "created_at": d.created_at.isoformat()
                }
                for d in documents
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== GET DOCUMENT ===============

@router.get("/documents/{documentId}")
async def get_document(
    documentId: str,
    db: Session = Depends(get_db)
):
    """Get document details"""
    try:
        doc = db.query(Document).filter(Document.id == documentId).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentResponse(
            id=doc.id,
            project_id=doc.project_id,
            filename=doc.filename,
            file_path=doc.file_path,
            created_at=doc.created_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
