from langgraph.graph import StateGraph, END
from app.state import RAState
from app.tester_nodes import generate_manual_tests_node, analyze_test_logs_node
from app.nodes import (
    extract_requirements_node,
    generate_user_stories_node,
    generate_traceability_matrix_node
)
from app.dev_nodes import (
    generate_unit_tests_node,
    generate_uml_node,
    generate_tech_plan_node
)

# --- RA MODE GRAPHS ---
def build_extraction_graph():
    """Phase 1: Just extracts requirements."""
    workflow = StateGraph(RAState)
    workflow.add_node("req_analyst", extract_requirements_node)
    workflow.set_entry_point("req_analyst")
    workflow.add_edge("req_analyst", END)
    return workflow.compile()

def build_generation_graph():
    """Phase 2: Generates Stories & Matrix."""
    workflow = StateGraph(RAState)
    workflow.add_node("story_writer", generate_user_stories_node)
    workflow.add_node("qa_lead", generate_traceability_matrix_node)
    
    workflow.set_entry_point("story_writer")
    workflow.add_edge("story_writer", "qa_lead")
    workflow.add_edge("qa_lead", END)
    return workflow.compile()

# --- DEVELOPER MODE GRAPH ---
def build_developer_graph():
    """
    Runs the 3 Developer Agents in parallel (conceptually linear for simplicity here).
    """
    workflow = StateGraph(RAState)
    
    # Add Nodes
    workflow.add_node("qa_automator", generate_unit_tests_node)
    workflow.add_node("architect", generate_uml_node)
    workflow.add_node("tech_lead", generate_tech_plan_node)
    
    # Define Flow: QA -> Architect -> Tech Lead -> End
    # (Since they don't depend on each other, we could run them in parallel, 
    # but linear is safer for debugging)
    workflow.set_entry_point("qa_automator")
    workflow.add_edge("qa_automator", "architect")
    workflow.add_edge("architect", "tech_lead")
    workflow.add_edge("tech_lead", END)
    
    return workflow.compile()

# --- TESTER MODE GRAPH ---

def build_tester_graph():
    """
    Tester Mode Workflow.
    Note: Agent 2 (Logs) is optional and triggered separately in UI, 
    but we can put them in one graph with conditional edges if we wanted complex logic.
    For simplicity, we will run them as independent tools in the Graph.
    """
    workflow = StateGraph(RAState)
    
    workflow.add_node("tc_generator", generate_manual_tests_node)
    workflow.add_node("log_analyzer", analyze_test_logs_node)
    
    # We will set the entry point dynamically in the UI code 
    # or just treat this as a collection of nodes. 
    # A simple linear flow isn't ideal because Agent 2 needs specific input.
    # So we define a simple "Test Gen" flow here.
    
    workflow.set_entry_point("tc_generator")
    workflow.add_edge("tc_generator", END)
    
    return workflow.compile()

def build_log_analyzer_graph():
    """Separate graph for the Log Analyzer since it runs ad-hoc."""
    workflow = StateGraph(RAState)
    workflow.add_node("log_analyzer", analyze_test_logs_node)
    workflow.set_entry_point("log_analyzer")
    workflow.add_edge("log_analyzer", END)
    return workflow.compile()