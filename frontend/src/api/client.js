import axios from 'axios';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with defaults
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Get token from localStorage
const getToken = () => localStorage.getItem('atg_token');

// Request interceptor to attach auth token when available
axiosInstance.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('atg_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// API client object
const apiClient = {
  
  // =============== AUTH ===============
  
  signup: (email, password, name) => 
    axiosInstance.post('/auth/signup', { email, password, name }),
  
  login: (email, password) => 
    axiosInstance.post('/auth/login', { email, password }),
  
  getMe: () => 
    axiosInstance.get('/auth/me'),
  
  logout: () => 
    axiosInstance.post('/auth/logout'),
  
  // =============== PROJECTS ===============
  
  createProject: (name, description) => 
    axiosInstance.post('/projects', { name, description }),
  
  getProject: (projectId) => 
    axiosInstance.get(`/projects/${projectId}`),
  
  listProjects: () => 
    axiosInstance.get('/projects'),
  
  updateProject: (projectId, name, description) => 
    axiosInstance.put(`/projects/${projectId}`, { name, description }),
  
  deleteProject: (projectId) => 
    axiosInstance.delete(`/projects/${projectId}`),
  
  // =============== DOCUMENTS ===============
  
  uploadDocument: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Do not set Content-Type header manually; the browser will add the multipart boundary.
    return axiosInstance.post(`/documents/upload?projectId=${projectId}`, formData);
  },
  
  listDocuments: (projectId) => 
    axiosInstance.get('/documents', { params: { projectId } }),
  
  getDocument: (documentId) => 
    axiosInstance.get(`/documents/${documentId}`),
  
  // =============== AGENTS ===============
  
  extractRequirements: (projectId, documentId) =>
    axiosInstance.post('/agents/extract-requirements', {
      projectId,
      documentId
    }),
  
  generateStories: (projectId, functionalRequirements) =>
    axiosInstance.post('/agents/generate-stories', {
      projectId,
      functionalRequirements
    }),
  
  generateRTM: (projectId, functionalRequirements, nonFunctionalRequirements, userStories) =>
    axiosInstance.post('/agents/generate-rtm', {
      projectId,
      functionalRequirements,
      nonFunctionalRequirements,
      userStories
    }),
  
  generateUnitTests: (
    projectId,
    userStories = null,
    sourceCode = null,
    functionalRequirements = null,
    nonFunctionalRequirements = null
  ) =>
    axiosInstance.post('/agents/generate-unit-tests', {
      projectId,
      userStories,
      sourceCode,
      functionalRequirements,
      nonFunctionalRequirements
    }),
  
  generateUML: (
    projectId,
    userStories = null,
    sourceCode = null,
    functionalRequirements = null,
    nonFunctionalRequirements = null
  ) =>
    axiosInstance.post('/agents/generate-uml', {
      projectId,
      userStories,
      sourceCode,
      functionalRequirements,
      nonFunctionalRequirements
    }),
  
  generateTechPlan: (
    projectId,
    userStories = null,
    sourceCode = null,
    functionalRequirements = null,
    nonFunctionalRequirements = null
  ) =>
    axiosInstance.post('/agents/generate-tech-plan', {
      projectId,
      userStories,
      sourceCode,
      functionalRequirements,
      nonFunctionalRequirements
    }),
  
  generateManualTests: (projectId, userStories) =>
    axiosInstance.post('/agents/generate-manual-tests', {
      projectId,
      userStories
    }),
  
  analyzeLogs: (projectId, logContent) =>
    axiosInstance.post('/agents/analyze-logs', {
      projectId,
      logContent
    }),
  
  // =============== HEALTH ===============
  
  getHealth: () =>
    axiosInstance.get('/health')
};

export default apiClient;
