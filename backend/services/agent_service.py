import logging
import tempfile
import os
from datetime import datetime
from sqlalchemy.orm import Session
from app.rag_setup import setup_vector_db, get_retriever
from app.graph import (
    build_extraction_graph,
    build_generation_graph,
    build_developer_graph,
    build_tester_graph,
    build_log_analyzer_graph
)
from backend.models import Execution, Requirement, UserStory, StatusEnum

logger = logging.getLogger(__name__)

class AgentService:
    
    @staticmethod
    def extract_requirements(document_path: str, project_id: str, db: Session) -> dict:
        """Extract requirements from a document using the RA Agent"""
        try:
            # Setup RAG for this document
            setup_vector_db(document_path)
            
            # Build and invoke extraction graph
            extractor = build_extraction_graph()
            result = extractor.invoke({
                "task_description": "Extract",
                "file_path": document_path
            })
            
            functional_reqs = result.get("functional_requirements", [])
            non_functional_reqs = result.get("non_functional_requirements", [])
            
            return {
                "functional_requirements": functional_reqs,
                "non_functional_requirements": non_functional_reqs
            }
        except Exception as e:
            logger.error(f"Error extracting requirements: {e}")
            raise
    
    @staticmethod
    def generate_stories(functional_requirements: list, project_id: str, db: Session) -> dict:
        """Generate user stories from functional requirements"""
        try:
            gen = build_generation_graph()
            result = gen.invoke({
                "functional_requirements": functional_requirements
            })
            
            user_stories = result.get("user_stories", [])
            
            return {
                "user_stories": user_stories
            }
        except Exception as e:
            logger.error(f"Error generating stories: {e}")
            raise
    
    @staticmethod
    def generate_rtm(
        functional_requirements: list,
        non_functional_requirements: list,
        user_stories: list,
        project_id: str,
        db: Session
    ) -> dict:
        """Generate Requirements Traceability Matrix"""
        try:
            gen = build_generation_graph()
            result = gen.invoke({
                "functional_requirements": functional_requirements,
                "non_functional_requirements": non_functional_requirements,
                "user_stories": user_stories
            })
            
            matrix = result.get("traceability_matrix", [])
            
            return {
                "traceability_matrix": matrix
            }
        except Exception as e:
            logger.error(f"Error generating RTM: {e}")
            raise
    
    @staticmethod
    def generate_unit_tests(
        user_stories: list = None,
        source_code: str = None,
        functional_requirements: list = None,
        non_functional_requirements: list = None,
        project_id: str = None,
        db: Session = None
    ) -> dict:
        """Generate unit tests using the Developer Agent"""
        try:
            dev_graph = build_developer_graph()
            
            input_data = {}
            if user_stories:
                input_data["user_stories"] = user_stories
            if functional_requirements:
                input_data["functional_requirements"] = functional_requirements
            if non_functional_requirements:
                input_data["non_functional_requirements"] = non_functional_requirements
            if not input_data and source_code:
                input_data["source_code_context"] = source_code
            
            result = dev_graph.invoke(input_data)
            
            return {
                "unit_test_cases": result.get("unit_test_cases", [])
            }
        except Exception as e:
            logger.error(f"Error generating unit tests: {e}")
            raise
    
    @staticmethod
    def generate_uml(
        user_stories: list = None,
        source_code: str = None,
        functional_requirements: list = None,
        non_functional_requirements: list = None,
        project_id: str = None,
        db: Session = None
    ) -> dict:
        """Generate UML diagrams using the Developer Agent"""
        try:
            dev_graph = build_developer_graph()
            
            input_data = {}
            if user_stories:
                input_data["user_stories"] = user_stories
            if functional_requirements:
                input_data["functional_requirements"] = functional_requirements
            if non_functional_requirements:
                input_data["non_functional_requirements"] = non_functional_requirements
            if not input_data and source_code:
                input_data["source_code_context"] = source_code
            
            result = dev_graph.invoke(input_data)
            
            return {
                "uml_diagrams": result.get("uml_diagrams", [])
            }
        except Exception as e:
            logger.error(f"Error generating UML: {e}")
            raise
    
    @staticmethod
    def generate_tech_plan(
        user_stories: list = None,
        source_code: str = None,
        functional_requirements: list = None,
        non_functional_requirements: list = None,
        project_id: str = None,
        db: Session = None
    ) -> dict:
        """Generate technical analysis using the Developer Agent"""
        try:
            dev_graph = build_developer_graph()
            
            input_data = {}
            if user_stories:
                input_data["user_stories"] = user_stories
            if functional_requirements:
                input_data["functional_requirements"] = functional_requirements
            if non_functional_requirements:
                input_data["non_functional_requirements"] = non_functional_requirements
            if not input_data and source_code:
                input_data["source_code_context"] = source_code
            
            result = dev_graph.invoke(input_data)
            
            return {
                "technical_plan": result.get("technical_plan", [])
            }
        except Exception as e:
            logger.error(f"Error generating tech plan: {e}")
            raise
    
    @staticmethod
    def generate_manual_tests(user_stories: list, project_id: str, db: Session) -> dict:
        """Generate manual test cases using the Tester Agent"""
        try:
            tester_graph = build_tester_graph()
            result = tester_graph.invoke({
                "user_stories": user_stories
            })
            
            return {
                "manual_test_cases": result.get("manual_test_cases", [])
            }
        except Exception as e:
            logger.error(f"Error generating manual tests: {e}")
            raise
    
    @staticmethod
    def analyze_logs(log_content: str, project_id: str, db: Session) -> dict:
        """Analyze test logs using the Tester Agent"""
        try:
            analyzer = build_log_analyzer_graph()
            result = analyzer.invoke({
                "test_logs_context": log_content
            })
            
            return {
                "log_analysis_report": result.get("log_analysis_report", {})
            }
        except Exception as e:
            logger.error(f"Error analyzing logs: {e}")
            raise
