from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.state import RAState
from app.schemas import TestCaseOutput, LogAnalysisOutput

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

# --- AGENT 1: MANUAL TEST CASE GENERATOR ---
def generate_manual_tests_node(state: RAState):
    print("--- TESTER AGENT 1: WRITING MANUAL TEST CASES ---")
    
    user_stories = state.get("user_stories", [])
    if not user_stories:
        return {"manual_test_cases": []}

    structured_llm = llm.with_structured_output(TestCaseOutput)
    
    template = """
    You are a QA Lead. Write detailed Manual Test Cases based on these User Stories.
    
    USER STORIES:
    {user_stories}
    
    INSTRUCTIONS:
    1. Cover every User Story with at least 1 Positive and 1 Negative test case.
    2. Ensure steps are granular (e.g., "Click 'Login' button").
    3. Define clear Expected Results for each step.
    4. Assign priorities based on the story importance.
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"user_stories": str(user_stories)})
    
    return {"manual_test_cases": [t.dict() for t in result.test_cases]}

# --- AGENT 2: LOG ANALYZER ---
def analyze_test_logs_node(state: RAState):
    print("--- TESTER AGENT 2: ANALYZING LOGS ---")
    
    logs = state.get("test_logs_context")
    if not logs:
        return {"log_analysis_report": {}}
        
    structured_llm = llm.with_structured_output(LogAnalysisOutput)
    
    # UPDATED PROMPT: Explicitly asking for recommendation
    template = """
    You are a Test Automation Architect. Analyze these execution logs.
    
    LOG DATA:
    {logs}
    
    INSTRUCTIONS:
    1. Identify failures and 'flaky' tests.
    2. Extract the specific error message.
    3. Hypothesize the root cause (e.g., "Network timeout", "Element not found").
    4. PROVIDE A RECOMMENDATION: Suggest how to fix the code or environment (e.g. "Increase timeout", "Check CSS selector").
    5. Calculate a Health Score (0-100).
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"logs": logs})
    
    return {"log_analysis_report": result.dict()}