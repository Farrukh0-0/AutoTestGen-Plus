import React, { useEffect, useState } from 'react';
import { useATG } from './api/context';
import './dashboard.css';

function Dashboard({ onNavigate, onSelectProject }) {
  const {
    createProject,
    listProjects,
    currentProject,
    setCurrentProject,
    loading,
    error,
    clearError
  } = useATG();

  const [projects, setProjects] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjectsList();
  }, []);

  const loadProjectsList = async () => {
    setLoadingProjects(true);
    try {
      const projectsList = await listProjects();
      setProjects(projectsList);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const newProject = await createProject(projectName, projectDescription);
      setProjects([...projects, newProject]);
      setProjectName('');
      setProjectDescription('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleSelectProject = (project) => {
    setCurrentProject(project);
    if (onSelectProject) onSelectProject(project.id);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Projects Dashboard</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={clearError}>×</button>
        </div>
      )}

      {showCreateForm && (
        <form className="create-project-form" onSubmit={handleCreateProject}>
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Project description (optional)"
              rows="3"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      <div className="projects-section">
        <h3>Your Projects</h3>
        
        {loadingProjects ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="no-projects">No projects yet. Create one to get started!</p>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`project-card ${currentProject?.id === project.id ? 'active' : ''}`}
                onClick={() => handleSelectProject(project)}
              >
                <h4>{project.name}</h4>
                {project.description && <p>{project.description}</p>}
                <div className="project-meta">
                  <small>{new Date(project.created_at).toLocaleDateString()}</small>
                </div>
                <div className="project-actions">
                  <button
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectProject(project);
                      onNavigate('requirement-analysis');
                    }}
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {currentProject && (
        <div className="current-project-panel">
          <h3>Selected Project</h3>
          <div className="project-details">
            <p><strong>Name:</strong> {currentProject.name}</p>
            {currentProject.description && (
              <p><strong>Description:</strong> {currentProject.description}</p>
            )}
            <p><strong>Created:</strong> {new Date(currentProject.created_at).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
