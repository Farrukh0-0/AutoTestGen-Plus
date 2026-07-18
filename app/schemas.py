from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# --- RA MODE SCHEMAS ---
class Requirement(BaseModel):
    id: str = Field(description="Unique ID (e.g., FR-01, NFR-01)")
    description: str = Field(description="The full requirement text")
    type: Literal["Functional", "Non-Functional"] = Field(description="Type of requirement")
    priority: Literal["High", "Medium", "Low"] = Field(description="Inferred priority")

class RequirementsOutput(BaseModel):
    requirements: List[Requirement]

class UserStory(BaseModel):
    id: str = Field(description="Story ID (e.g., US-01)")
    story: str = Field(description="As a <role>, I want <feature>, so that <benefit>")
    acceptance_criteria: List[str] = Field(description="List of acceptance criteria")
    related_req_id: str = Field(description="The ID of the requirement this story covers")

class UserStoriesOutput(BaseModel):
    stories: List[UserStory]

class MatrixRow(BaseModel):
    req_id: str
    req_description: str
    req_priority: str
    user_story_id: str
    user_story_desc: str
    status: str

class MatrixOutput(BaseModel):
    rows: List[MatrixRow]

# --- DEV MODE SCHEMAS ---
class TestCase(BaseModel):
    test_id: str = Field(description="TC-01")
    description: str = Field(description="What is being tested")
    pre_conditions: str = Field(description="Setup required")
    steps: List[str] = Field(description="Execution steps")
    expected_result: str = Field(description="Expected outcome")
    related_story_id: Optional[str] = Field(description="Link to User Story (if Scenario A)")

class TestSuiteOutput(BaseModel):
    test_cases: List[TestCase]

class Diagram(BaseModel):
    title: str = Field(description="Title of the diagram")
    diagram_type: Literal["Flowchart", "Sequence", "Class", "Use Case"]
    mermaid_code: str = Field(description="The DSL code for the diagram")
    explanation: str = Field(description="Brief explanation of the logic")

class DiagramOutput(BaseModel):
    diagrams: List[Diagram]

class TaskAnalysis(BaseModel):
    task_name: str = Field(description="Feature or Module name")
    risk_level: Literal["High", "Medium", "Low"] = Field(description="Risk of failure/complexity")
    dependencies: List[str] = Field(description="List of other tasks/modules this depends on")
    change_frequency: Literal["High", "Medium", "Low"] = Field(description="How often this is likely to change")
    execution_order: int = Field(description="Suggested sequence number (1 = First)")

class TechnicalPlanOutput(BaseModel):
    analysis: List[TaskAnalysis]

# --- TESTER MODE SCHEMAS (UPDATED) ---
class TestStep(BaseModel):
    step_number: int
    action: str
    expected_result: str

class ManualTestCase(BaseModel):
    test_id: str = Field(description="TC-001")
    title: str = Field(description="Short title of the test")
    related_story_id: str = Field(description="Linked User Story ID")
    preconditions: str = Field(description="What must be true before starting")
    steps: List[TestStep]
    priority: Literal["Critical", "High", "Medium", "Low"]
    test_type: Literal["Functional", "UI", "Security", "Performance"]

class TestCaseOutput(BaseModel):
    test_cases: List[ManualTestCase]

class LogIssue(BaseModel):
    test_name: str
    status: Literal["Failed", "Flaky", "Passed"]
    error_message: str
    root_cause_hypothesis: str
    # FIXED: Added default value to prevent 400 Error if LLM forgets it
    recommendation: str = Field(description="Suggested fix", default="Check logs and retry")

class LogAnalysisOutput(BaseModel):
    total_tests: int
    passed: int
    failed: int
    flaky: int
    issues: List[LogIssue]
    health_score: int = Field(description="0-100 score of test suite health")