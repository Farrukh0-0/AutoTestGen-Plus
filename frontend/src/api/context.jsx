import React, { createContext, useCallback, useState } from 'react';
import apiClient from './client';

// Create the context
export const ATGContext = createContext();

// Provider component
export const ATGProvider = ({ children }) => {
  const [currentProject, setCurrentProject] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [userStories, setUserStories] = useState(null);
  const [rtm, setRtm] = useState(null);
  const [unitTests, setUnitTests] = useState(null);
  const [umlDiagrams, setUmlDiagrams] = useState(null);
  const [techPlan, setTechPlan] = useState(null);
  const [manualTests, setManualTests] = useState(null);
  const [logAnalysis, setLogAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Project operations
  const createProject = useCallback(async (name, description) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.createProject(name, description);
      setCurrentProject(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getProject(projectId);
      setCurrentProject(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.listProjects();
      return response.data.projects;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Document operations
  const uploadDocument = useCallback(async (file) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.uploadDocument(currentProject.id, file);
      const data = response.data || response;
      setCurrentDocument({
        ...data,
        id: data.id || data.documentId || data.document_id,
        documentId: data.id || data.documentId || data.document_id,
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  // Agent operations
  const extractRequirements = useCallback(async () => {
    if (!currentProject || !currentDocument) {
      setError('Project and document required');
      throw new Error('Project and document required');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.extractRequirements(
        currentProject.id,
        currentDocument.documentId || currentDocument.id
      );
      setRequirements(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject, currentDocument]);

  const generateStories = useCallback(async (functionalRequirements) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateStories(
        currentProject.id,
        functionalRequirements
      );
      setUserStories(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const generateRTM = useCallback(async (funcReqs, nonFuncReqs, stories) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateRTM(
        currentProject.id,
        funcReqs,
        nonFuncReqs,
        stories
      );
      setRtm(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const generateUnitTests = useCallback(async (userStories = null, sourceCode = null) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateUnitTests(
        currentProject.id,
        userStories,
        sourceCode
      );
      setUnitTests(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const generateUML = useCallback(async (userStories = null, sourceCode = null) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateUML(
        currentProject.id,
        userStories,
        sourceCode
      );
      setUmlDiagrams(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const generateTechPlan = useCallback(async (userStories = null, sourceCode = null) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateTechPlan(
        currentProject.id,
        userStories,
        sourceCode
      );
      setTechPlan(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const generateManualTests = useCallback(async (userStories) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateManualTests(
        currentProject.id,
        userStories
      );
      setManualTests(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const analyzeLogs = useCallback(async (logContent) => {
    if (!currentProject) {
      setError('No project selected');
      throw new Error('No project selected');
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.analyzeLogs(
        currentProject.id,
        logContent
      );
      setLogAnalysis(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const value = {
    // State
    currentProject,
    currentDocument,
    requirements,
    userStories,
    rtm,
    unitTests,
    umlDiagrams,
    techPlan,
    manualTests,
    logAnalysis,
    loading,
    error,
    
    // Project operations
    createProject,
    getProject,
    listProjects,
    
    // Document operations
    uploadDocument,
    setCurrentDocument,
    
    // Agent operations
    extractRequirements,
    generateStories,
    generateRTM,
    generateUnitTests,
    generateUML,
    generateTechPlan,
    generateManualTests,
    analyzeLogs,
    
    // Utility
    setCurrentProject,
    clearError: () => setError(null)
  };

  return (
    <ATGContext.Provider value={value}>
      {children}
    </ATGContext.Provider>
  );
};

// Custom hook to use the context
export const useATG = () => {
  const context = React.useContext(ATGContext);
  if (!context) {
    throw new Error('useATG must be used within ATGProvider');
  }
  return context;
};
