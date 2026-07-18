# AutoTestGen+ Backend & Frontend Integration Setup Guide

## Overview
This guide explains how to set up and run the integrated AutoTestGen+ system with:
- **Backend**: FastAPI with SQLAlchemy ORM and SQLite database
- **Frontend**: React with Context API for state management
- **API Layer**: RESTful endpoints connecting both sides

## Project Structure
```
d:\AutoTestGen+
├── backend/                          # FastAPI backend
│   ├── __init__.py
│   ├── main.py                      # FastAPI app entry point
│   ├── database.py                  # SQLAlchemy configuration
│   ├── api/
│   │   ├── __init__.py
│   │   ├── agents.py               # Agent endpoints (8 endpoints)
│   │   └── projects.py             # Project management endpoints
│   ├── models/
│   │   └── __init__.py            # SQLAlchemy ORM models
│   └── services/
│       ├── __init__.py
│       └── agent_service.py        # Business logic layer
├── frontend/                        # React frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js           # Axios HTTP client
│   │   │   └── context.jsx         # React Context + API integration
│   │   ├── App.jsx
│   │   ├── dashboard.jsx
│   │   ├── requriementanalysis.jsx
│   │   ├── developermode.jsx
│   │   └── testermode.jsx
│   └── package.json
├── app/                             # Existing LangGraph agents (UNMODIFIED)
│   ├── graph.py
│   ├── nodes.py
│   ├── dev_nodes.py
│   ├── tester_nodes.py
│   ├── rag_setup.py
│   ├── schemas.py
│   └── state.py
├── run_backend.py                   # Backend launcher script
└── backend_requirements.txt         # Python dependencies
```

## Installation & Setup

### Step 1: Install Python Dependencies
```bash
# Navigate to project root
cd d:\AutoTestGen+

# Create/activate virtual environment (if not already done)
python -m venv venv
venv\Scripts\activate  # On Windows

# Install backend dependencies
pip install -r backend_requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Database Initialization
The database is automatically created on first run. SQLite file will be at:
```
d:\AutoTestGen+\autotestgen.db
```

To manually initialize:
```bash
python -c "from backend.database import engine, Base; Base.metadata.create_all(bind=engine); print('Database initialized!')"
```

### Step 3: Environment Configuration (Optional)
Create `.env` file in project root:
```
DATABASE_URL=sqlite:///./autotestgen.db
REACT_APP_API_URL=http://localhost:8000/api/v1
```

## Running the Application

### Option A: Run Backend and Frontend Separately

**Terminal 1 - Backend API:**
```bash
cd d:\AutoTestGen+
python run_backend.py
# Or: uvicorn backend.main:app --reload --port 8000
```
✅ Backend will be available at: `http://localhost:8000`
✅ API Docs at: `http://localhost:8000/docs`

**Terminal 2 - Frontend:**
```bash
cd d:\AutoTestGen+\frontend
npm start
```
✅ Frontend will be available at: `http://localhost:3000` (or 5173 for Vite)

### Option B: Run Everything with One Script (TODO)
Will implement a concurrent launcher script later.

## API Endpoints

### Projects Management
```
POST   /api/v1/projects              Create project
GET    /api/v1/projects              List all projects
GET    /api/v1/projects/{id}         Get project details
PUT    /api/v1/projects/{id}         Update project
DELETE /api/v1/projects/{id}         Delete project
```

### Document Operations
```
POST   /api/v1/documents/upload      Upload document for analysis
```

### Agent Endpoints (AI Processing)
```
POST   /api/v1/agents/extract-requirements    Extract requirements from document
POST   /api/v1/agents/generate-stories        Generate user stories from requirements
POST   /api/v1/agents/generate-rtm            Generate Requirements Traceability Matrix
POST   /api/v1/agents/generate-unit-tests     Generate unit tests
POST   /api/v1/agents/generate-uml            Generate UML diagrams
POST   /api/v1/agents/generate-tech-plan      Generate technical analysis
POST   /api/v1/agents/generate-manual-tests   Generate manual test cases
POST   /api/v1/agents/analyze-logs            Analyze test logs
```

### Health Check
```
GET    /api/v1/health                Health check
GET    /health                       Basic health check
```

## Frontend Integration

### Using the API Context
Components now use the `ATGContext` for state management and API calls:

```jsx
import { useATG } from './api/context';

function MyComponent() {
  const { 
    currentProject,
    requirements,
    extractRequirements,
    loading,
    error
  } = useATG();

  const handleAnalyze = async () => {
    try {
      await extractRequirements();
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={handleAnalyze}>Analyze</button>
    </div>
  );
}
```

### Workflow Example
```jsx
// 1. Create/select project
const project = await createProject('My Project', 'Description');

// 2. Upload document
const doc = await uploadDocument(file);

// 3. Extract requirements
const reqs = await extractRequirements();

// 4. Generate stories
const stories = await generateStories(reqs.functional_requirements);

// 5. Generate RTM
const rtm = await generateRTM(
  reqs.functional_requirements,
  reqs.non_functional_requirements,
  stories.user_stories
);

// 6. Generate test cases
const tests = await generateManualTests(stories.user_stories);
```

## Database Schema

### Projects Table
- `id` (UUID) - Primary key
- `name` (String)
- `description` (Text)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Documents Table
- `id` (UUID)
- `project_id` (Foreign Key)
- `filename` (String)
- `file_path` (String)
- `file_size` (Integer)
- `created_at` (DateTime)

### Executions Table
- `id` (UUID)
- `project_id` (Foreign Key)
- `agent_name` (String)
- `status` (Enum: queued, running, completed, failed)
- `input_data` (JSON)
- `output_data` (JSON)
- `error_message` (Text)
- `started_at` (DateTime)
- `completed_at` (DateTime)
- `created_at` (DateTime)

### Requirements & UserStories Tables
- Store extracted requirements and generated user stories
- Link to projects and executions for traceability

## Troubleshooting

### CORS Issues
If frontend can't communicate with backend, check:
1. Backend is running on port 8000
2. CORS middleware is configured (already done in `backend/main.py`)
3. Frontend API URL is correct in environment

### Database Lock
If you get "database is locked" error:
- Close all connections to the database
- Delete `autotestgen.db` and restart (data will be lost)
- Use SQLite Browser to inspect: https://sqlitebrowser.org/

### Agent Not Working
1. Verify `app/` agent files are unmodified
2. Check ChromaDB is initialized properly
3. Verify Groq API key is available
4. Check logs in terminal for detailed errors

## Next Steps

1. ✅ Backend API created
2. ✅ Frontend API client created
3. ✅ React Context for state management created
4. ⏳ Update React components to use API context (pages/*.jsx)
5. ⏳ Add authentication/JWT endpoints
6. ⏳ Add file upload persistence
7. ⏳ Add error handling and retry logic
8. ⏳ Test end-to-end workflows

## Development Mode

To run with auto-reload and debugging:

**Backend:**
```bash
uvicorn backend.main:app --reload --port 8000 --log-level debug
```

**Frontend:**
```bash
npm start  # With hot reload
```

## Production Deployment

For production, you would:
1. Replace SQLite with PostgreSQL
2. Add proper authentication (JWT tokens)
3. Add rate limiting
4. Use HTTPS
5. Deploy with Gunicorn/Nginx
6. Add monitoring and logging

## File Manifest

**Created:**
- `backend/database.py` - SQLAlchemy configuration
- `backend/models/__init__.py` - ORM models
- `backend/services/agent_service.py` - Business logic
- `backend/api/agents.py` - Agent endpoints (8 endpoints)
- `backend/api/projects.py` - Project endpoints (5 endpoints)
- `backend/main.py` - FastAPI application
- `frontend/src/api/client.js` - Axios HTTP client
- `frontend/src/api/context.jsx` - React Context provider
- `run_backend.py` - Backend launcher script
- `BACKEND_SETUP.md` - This file

**Unmodified:**
- All `app/` files remain untouched
- All existing React components remain as-is initially
- `streamlit_app.py` can continue to work (optional)

## Support & Questions

For issues or questions:
1. Check API docs at `http://localhost:8000/docs` (interactive Swagger UI)
2. Review error messages in backend console
3. Check browser developer console for frontend errors
4. Review database using SQLite Browser
