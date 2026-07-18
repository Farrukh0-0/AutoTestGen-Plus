from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from backend.database import Base
import enum

class StatusEnum(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    password = Column(String(255), nullable=False)
    token = Column(String(255), nullable=True, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    executions = relationship("Execution", back_populates="project", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="documents")

class Execution(Base):
    __tablename__ = "executions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    status = Column(Enum(StatusEnum), default=StatusEnum.QUEUED, index=True)
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="executions")

class Requirement(Base):
    __tablename__ = "requirements"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, nullable=False)
    execution_id = Column(String, nullable=True)
    requirement_id = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # 'Functional', 'Non-Functional'
    description = Column(Text, nullable=False)
    priority = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserStory(Base):
    __tablename__ = "user_stories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, nullable=False)
    execution_id = Column(String, nullable=True)
    story_id = Column(String(100), nullable=False)
    story_text = Column(Text, nullable=False)
    acceptance_criteria = Column(JSON, nullable=True)  # List of criteria
    related_req_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
