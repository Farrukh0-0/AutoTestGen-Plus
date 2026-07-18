import json
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from app.rag_setup import get_retriever
from app.state import RAState
from app.schemas import RequirementsOutput, UserStoriesOutput, MatrixOutput

# Setup LLM
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

# --- AGENT 1: INTELLIGENT REQ ANALYST ---
def extract_requirements_node(state: RAState):
    print("--- AGENT 1: EXTRACTING REQUIREMENTS ---")
    
    # 1. Retrieve Context from the specific file
    # Note: In a real app, we'd pass the file_path to the retriever filter
    retriever = get_retriever() 
    query = "Extract all system requirements, features, and quality attributes."
    docs = retriever.invoke(query)
    context = "\n\n".join([doc.page_content for doc in docs])
    
    # 2. Intelligent Extraction Prompt
    # We conceptually define FR vs NFR so it doesn't rely on tags.
    structured_llm = llm.with_structured_output(RequirementsOutput)
    
    template = """
    You are a Senior Business Analyst. Analyze the text to extract requirements.
    
    DEFINITIONS:
    - Functional Requirements (FR): What the system must DO (features, calculations, workflows).
    - Non-Functional Requirements (NFR): How the system performs (speed, security, scalability).
    
    INSTRUCTIONS:
    1. Read the context below carefully.
    2. Extract all distinct requirements.
    3. Assign a unique ID (FR-xx or NFR-xx).
    4. Infer the Priority (High/Medium/Low) based on the tone (e.g., "must have" = High).
    
    CONTEXT:
    {context}
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"context": context})
    
    # Separate them for the state
    f_reqs = [req.dict() for req in result.requirements if req.type == "Functional"]
    nf_reqs = [req.dict() for req in result.requirements if req.type == "Non-Functional"]
    
    return {
        "functional_requirements": f_reqs,
        "non_functional_requirements": nf_reqs
    }

# --- AGENT 2: USER STORY WRITER ---
def generate_user_stories_node(state: RAState):
    print("--- AGENT 2: GENERATING USER STORIES ---")
    
    f_reqs = state.get("functional_requirements") or []
    
    structured_llm = llm.with_structured_output(UserStoriesOutput)
    
    template = """
    You are an Agile Product Owner. Create User Stories for these requirements.
    
    INPUT REQUIREMENTS:
    {f_reqs}
    
    INSTRUCTIONS:
    1. Write a standard User Story for each Functional Requirement.
    2. Include 2-3 brief Acceptance Criteria for each story.
    3. Ensure you link the correct 'related_req_id'.
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"f_reqs": str(f_reqs)})
    
    return {
        "user_stories": [story.dict() for story in result.stories]
    }

# --- AGENT 3: INDUSTRY STANDARD MATRIX ---
def generate_traceability_matrix_node(state: RAState):
    print("--- AGENT 3: GENERATING RTM ---")
    
    f_reqs = state.get("functional_requirements") or []
    nf_reqs = state.get("non_functional_requirements") or []
    user_stories = state.get("user_stories") or []
    
    structured_llm = llm.with_structured_output(MatrixOutput)
    
    template = """
    You are a QA Lead. Generate a detailed Requirements Traceability Matrix (RTM).
    
    DATA:
    - Requirements: {all_reqs}
    - User Stories: {user_stories}
    
    INSTRUCTIONS:
    1. Create a row for EVERY requirement (Functional AND Non-Functional).
    2. Map it to the corresponding User Story ID.
    3. If a requirement has no story (like some NFRs), mark User Story ID as "N/A" and Status as "No Coverage".
    4. If mapped, set Status to "Covered".
    """
    
    # Combine reqs for the prompt
    all_reqs = f_reqs + nf_reqs
    
    prompt = ChatPromptTemplate.from_template(template)
    chain = prompt | structured_llm
    result = chain.invoke({"all_reqs": str(all_reqs), "user_stories": str(user_stories)})
    
    return {
        "traceability_matrix": [row.dict() for row in result.rows]
    }