from typing import TypedDict, List, Optional

class RAState(TypedDict):
    """
    Unified State for both RA and Developer Modes.
    """
    # Meta Data
    task_description: str 
    file_path: str
    mode: str # "analysis" or "developer"
    source_code_context: str # For Scenario B (Raw code text)
    
    # RA Outputs (Phase 1)
    functional_requirements: List[dict] 
    non_functional_requirements: List[dict]
    user_stories: List[dict]
    traceability_matrix: List[dict]
    
    # Developer Outputs (Phase 2 - New!)
    unit_test_cases: List[dict]
    uml_diagrams: List[dict]
    technical_plan: List[dict]

    # --- NEW: TESTER DATA ---
    manual_test_cases: List[dict]
    test_logs_context: str # Raw log text uploaded by user
    log_analysis_report: dict # Structured analysis output