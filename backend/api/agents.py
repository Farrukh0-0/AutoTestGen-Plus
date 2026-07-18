from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from backend.database import get_db
from backend.models import Execution, Document, Project, StatusEnum
from backend.services.agent_service import AgentService

router = APIRouter(prefix="/api/v1", tags=["agents"])

# =============== REQUEST/RESPONSE MODELS ===============

class ExtractReqRequest(BaseModel):
    projectId: str
    documentId: str

class ExtractReqResponse(BaseModel):
    functional_requirements: list
    non_functional_requirements: list

class GenerateStoriesRequest(BaseModel):
    projectId: str
    functionalRequirements: list

class GenerateStoriesResponse(BaseModel):
    user_stories: list

class GenerateRTMRequest(BaseModel):
    projectId: str
    functionalRequirements: list
    nonFunctionalRequirements: list
    userStories: list

class GenerateRTMResponse(BaseModel):
    traceability_matrix: list

class GenerateUnitTestsRequest(BaseModel):
    projectId: str
    userStories: Optional[list] = None
    sourceCode: Optional[str] = None
    functionalRequirements: Optional[list] = None
    nonFunctionalRequirements: Optional[list] = None

class GenerateUnitTestsResponse(BaseModel):
    unit_test_cases: list

class GenerateUMLRequest(BaseModel):
    projectId: str
    userStories: Optional[list] = None
    sourceCode: Optional[str] = None
    functionalRequirements: Optional[list] = None
    nonFunctionalRequirements: Optional[list] = None

class GenerateUMLResponse(BaseModel):
    uml_diagrams: list

class GenerateTechPlanRequest(BaseModel):
    projectId: str
    userStories: Optional[list] = None
    sourceCode: Optional[str] = None
    functionalRequirements: Optional[list] = None
    nonFunctionalRequirements: Optional[list] = None

class GenerateTechPlanResponse(BaseModel):
    technical_plan: list

class GenerateManualTestsRequest(BaseModel):
    projectId: str
    userStories: list

class GenerateManualTestsResponse(BaseModel):
    manual_test_cases: list

class AnalyzeLogsRequest(BaseModel):
    projectId: str
    logContent: str

class AnalyzeLogsResponse(BaseModel):
    log_analysis_report: dict

class ExecutionStatusResponse(BaseModel):
    executionId: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None

# =============== EXTRACTION ENDPOINT ===============

@router.post("/agents/extract-requirements")
async def extract_requirements(
    request: ExtractReqRequest,
    db: Session = Depends(get_db)
) -> ExtractReqResponse:
    """Extract requirements from a document"""
    try:
        # Get document path from database
        document = db.query(Document).filter(Document.id == request.documentId).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Call agent service
        result = AgentService.extract_requirements(
            document.file_path,
            request.projectId,
            db
        )
        
        return ExtractReqResponse(
            functional_requirements=result.get("functional_requirements", []),
            non_functional_requirements=result.get("non_functional_requirements", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== STORY GENERATION ENDPOINT ===============

@router.post("/agents/generate-stories")
async def generate_stories(
    request: GenerateStoriesRequest,
    db: Session = Depends(get_db)
) -> GenerateStoriesResponse:
    """Generate user stories from functional requirements"""
    try:
        result = AgentService.generate_stories(
            request.functionalRequirements,
            request.projectId,
            db
        )
        
        return GenerateStoriesResponse(
            user_stories=result.get("user_stories", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== RTM GENERATION ENDPOINT ===============

@router.post("/agents/generate-rtm")
async def generate_rtm(
    request: GenerateRTMRequest,
    db: Session = Depends(get_db)
) -> GenerateRTMResponse:
    """Generate Requirements Traceability Matrix"""
    try:
        result = AgentService.generate_rtm(
            request.functionalRequirements,
            request.nonFunctionalRequirements,
            request.userStories,
            request.projectId,
            db
        )
        
        return GenerateRTMResponse(
            traceability_matrix=result.get("traceability_matrix", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== UNIT TESTS ENDPOINT ===============

@router.post("/agents/generate-unit-tests")
async def generate_unit_tests(
    request: GenerateUnitTestsRequest,
    db: Session = Depends(get_db)
) -> GenerateUnitTestsResponse:
    """Generate unit tests from user stories or source code"""
    try:
        result = AgentService.generate_unit_tests(
            user_stories=request.userStories,
            source_code=request.sourceCode,
            functional_requirements=request.functionalRequirements,
            non_functional_requirements=request.nonFunctionalRequirements,
            project_id=request.projectId,
            db=db
        )
        
        return GenerateUnitTestsResponse(
            unit_test_cases=result.get("unit_test_cases", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== UML GENERATION ENDPOINT ===============

@router.post("/agents/generate-uml")
async def generate_uml(
    request: GenerateUMLRequest,
    db: Session = Depends(get_db)
) -> GenerateUMLResponse:
    """Generate UML diagrams from user stories or source code"""
    try:
        result = AgentService.generate_uml(
            user_stories=request.userStories,
            source_code=request.sourceCode,
            functional_requirements=request.functionalRequirements,
            non_functional_requirements=request.nonFunctionalRequirements,
            project_id=request.projectId,
            db=db
        )
        
        return GenerateUMLResponse(
            uml_diagrams=result.get("uml_diagrams", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== TECH PLAN ENDPOINT ===============

@router.post("/agents/generate-tech-plan")
async def generate_tech_plan(
    request: GenerateTechPlanRequest,
    db: Session = Depends(get_db)
) -> GenerateTechPlanResponse:
    """Generate technical analysis and risk assessment"""
    try:
        result = AgentService.generate_tech_plan(
            user_stories=request.userStories,
            source_code=request.sourceCode,
            functional_requirements=request.functionalRequirements,
            non_functional_requirements=request.nonFunctionalRequirements,
            project_id=request.projectId,
            db=db
        )
        
        return GenerateTechPlanResponse(
            technical_plan=result.get("technical_plan", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== MANUAL TESTS ENDPOINT ===============

@router.post("/agents/generate-manual-tests")
async def generate_manual_tests(
    request: GenerateManualTestsRequest,
    db: Session = Depends(get_db)
) -> GenerateManualTestsResponse:
    """Generate manual test cases from user stories"""
    try:
        result = AgentService.generate_manual_tests(
            request.userStories,
            request.projectId,
            db
        )
        
        return GenerateManualTestsResponse(
            manual_test_cases=result.get("manual_test_cases", [])
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== LOG ANALYSIS ENDPOINT ===============

@router.post("/agents/analyze-logs")
async def analyze_logs(
    request: AnalyzeLogsRequest,
    db: Session = Depends(get_db)
) -> AnalyzeLogsResponse:
    """Analyze test logs for failures and flaky tests"""
    try:
        result = AgentService.analyze_logs(
            request.logContent,
            request.projectId,
            db
        )
        
        return AnalyzeLogsResponse(
            log_analysis_report=result.get("log_analysis_report", {})
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# NOTE: Document upload and health check belong in their own routers.
# This agents router only exposes /agents/* endpoints.
