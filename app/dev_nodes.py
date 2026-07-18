import re
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.state import RAState
from app.schemas import TestSuiteOutput, DiagramOutput, TechnicalPlanOutput

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

# --- AGENT 1: UNIT TEST GENERATOR ---
def generate_unit_tests_node(state: RAState):
    print("--- DEV AGENT 1: GENERATING TEST CASES ---")
    if state.get("source_code_context"):
        input_data = f"SOURCE CODE:\n{state['source_code_context']}"
        context_type = "Source Code"
    else:
        stories = state.get('user_stories') or []
        func_reqs = state.get('functional_requirements') or []
        nonfunc_reqs = state.get('non_functional_requirements') or []
        input_data = "USER STORIES:\n" + str(stories)
        if func_reqs:
            input_data += "\n\nFUNCTIONAL REQUIREMENTS:\n" + str(func_reqs)
        if nonfunc_reqs:
            input_data += "\n\nNON-FUNCTIONAL REQUIREMENTS:\n" + str(nonfunc_reqs)
        context_type = "User Stories and Requirements"

    structured_llm = llm.with_structured_output(TestSuiteOutput)
    template = """
    You are a QA Automation Engineer. Generate Unit Test Cases.
    CONTEXT TYPE: {context_type}
    INPUT:
    {input_data}
    """
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"context_type": context_type, "input_data": input_data})
    return {"unit_test_cases": [t.dict() for t in result.test_cases]}

# --- AGENT 2: SYSTEM ARCHITECT (UML) ---
def generate_uml_node(state: RAState):
    print("--- DEV AGENT 2: GENERATING UML ---")
    
    if state.get("source_code_context"):
        input_data = state['source_code_context']
    else:
        stories = state.get('user_stories') or []
        func_reqs = state.get('functional_requirements') or []
        nonfunc_reqs = state.get('non_functional_requirements') or []
        input_data = "USER STORIES:\n" + str(stories)
        if func_reqs:
            input_data += "\n\nFUNCTIONAL REQUIREMENTS:\n" + str(func_reqs)
        if nonfunc_reqs:
            input_data += "\n\nNON-FUNCTIONAL REQUIREMENTS:\n" + str(nonfunc_reqs)
        
    structured_llm = llm.with_structured_output(DiagramOutput)
    
    template = """
    You are a System Architect. Generate exactly 2 Mermaid.js diagrams.

    INPUT:
    {input_data}

    RULES — follow these exactly or the diagram will break:
    1. Diagram 1: a FLOWCHART. First line MUST be exactly: flowchart TD
    2. Diagram 2: a USE CASE diagram rendered as a flowchart. First line MUST be exactly: flowchart LR
    3. Node IDs: use only letters and numbers, no spaces (e.g. A, B, UserLogin).
    4. Node labels in square brackets: A[Label text here]
    5. Arrows: A --> B  or  A -->|action| B  (no other arrow styles)
    6. NO special characters inside labels: no parentheses (), no quotes, no slashes, no ampersands, no angle brackets.
    7. Replace spaces in labels with underscores only if the label is used as an ID. Inside brackets [] spaces are fine.
    8. DO NOT use: graph, sequenceDiagram, classDiagram, usecase, actor, -.->, ==>, -->, -.->
    9. DO NOT wrap in markdown fences.
    10. Keep diagrams simple — max 12 nodes each.

    VALID EXAMPLE:
    flowchart TD
        A[User Opens App] --> B[Login Screen]
        B -->|Valid credentials| C[Dashboard]
        B -->|Invalid credentials| D[Show Error]
        C --> E[Select Feature]
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"input_data": str(input_data)})
    
    return {"uml_diagrams": [d.dict() for d in result.diagrams]}

# --- AGENT 3: TECH LEAD (PLANNING) ---
def generate_tech_plan_node(state: RAState):
    print("--- DEV AGENT 3: TECHNICAL ANALYSIS ---")
    if state.get("source_code_context"):
        input_data = state['source_code_context']
        task = "Analyze code."
    else:
        input_data = state.get('user_stories')
        task = "Analyze stories."
        
    structured_llm = llm.with_structured_output(TechnicalPlanOutput)
    template = """
    You are a Technical Lead. Perform risk analysis.
    TASK: {task}
    INPUT: {input_data}
    """
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"task": task, "input_data": str(input_data)})
    return {"technical_plan": [p.dict() for p in result.analysis]}