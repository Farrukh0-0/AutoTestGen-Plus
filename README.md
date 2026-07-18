# AutoTestGen+

**An Agentic AI application that automates three core modules of the Software Development Life Cycle (SDLC) — Requirements Analysis, Development, and Test Case Generation — using a multi-agent LangGraph pipeline powered by Groq's Llama 3.3 70B.**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [The Three Modes](#the-three-modes)
- [Bug Tracking Loop](#bug-tracking-loop)
- [Dashboard](#dashboard)
- [Screenshots](#screenshots)

---

## Overview

AutoTestGen+ takes a plain-text, PDF, or Word document describing what a user wants to build, and autonomously produces:

- Functional & Non-Functional Requirements
- User Stories with Acceptance Criteria
- Requirements Traceability Matrix (RTM)
- Unit Test Cases
- UML / Flowchart Diagrams (rendered as SVG via Mermaid.js)
- Risk, Priority & Dependency Analysis
- Manual Test Cases (step-by-step)
- Test Log Analysis with health scoring and flaky test detection

All three modes are connected — outputs from Requirement Analysis flow automatically into Developer Mode, which flows into Tester Mode, forming a complete automated SDLC pipeline.

---

## Features

- **Multi-agent pipeline** — LangGraph orchestrates 8 specialised AI agents across 3 modes
- **RAG-powered extraction** — Documents are chunked, embedded (HuggingFace `all-MiniLM-L6-v2`), and stored in ChromaDB for context-aware requirement extraction
- **Mermaid.js diagram rendering** — UML flowcharts and use case diagrams rendered graphically in-browser with a raw code toggle and auto-sanitiser for LLM output
- **Cross-mode data flow** — RA outputs (requirements, user stories) are automatically available in Developer and Tester modes via shared context
- **Persistent outputs** — All generated data is persisted to `localStorage` per user, surviving page refreshes and logouts. Restored on re-login
- **Bug tracking loop** — Tester reports bugs manually → Developer sees them, marks them In Progress → resolves with a note → Tester sees resolution status live
- **Usage dashboard** — Tracks per-mode usage counts, file history, pipeline completion status, and session output summary
- **Token-based auth** — UUID tokens, pbkdf2_sha256 password hashing, per-user data isolation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│   Login → Dashboard → RA Mode → Developer Mode → Tester Mode   │
│                    AppContext (shared state)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (axios)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│   /api/v1/auth/*   /api/v1/agents/*   /api/v1/projects          │
│   /api/v1/documents                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌─────────────────────┐   ┌─────────────────────────────────────┐
│  SQLite Database    │   │      LangGraph Agent Pipeline       │
│  users              │   │                                     │
│  projects           │   │  RA Mode:                           │
│  documents          │   │    extract_requirements_node        │
│  executions         │   │    generate_user_stories_node       │
│  requirements       │   │    generate_traceability_matrix_node│
│  user_stories       │   │                                     │
└─────────────────────┘   │  Developer Mode:                    │
                          │    generate_unit_tests_node         │
                          │    generate_uml_node                │
                          │    generate_tech_plan_node          │
                          │                                     │
                          │  Tester Mode:                       │
                          │    generate_manual_tests_node       │
                          │    analyze_test_logs_node           │
                          └──────────────┬──────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                    ┌──────────────────┐  ┌──────────────────────┐
                    │   Groq API       │  │  ChromaDB            │
                    │  Llama 3.3 70B   │  │  (vector store)      │
                    │  (LLM inference) │  │  HuggingFace embeds  │
                    └──────────────────┘  └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Create React App, Mermaid.js 11 |
| State Management | React Context API + localStorage |
| Backend | FastAPI, Python 3.11+ |
| ORM / Database | SQLAlchemy, SQLite |
| AI Orchestration | LangGraph, LangChain |
| LLM | Llama 3.3 70B Versatile via Groq API |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` |
| Vector Database | ChromaDB (local) |
| HTTP Client | Axios |
| Auth | UUID tokens, passlib pbkdf2_sha256 |
| Document Parsing | pypdf, python-docx |

---

## Project Structure

```
AutoTestGen+/
├── frontend/                        # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js            # Axios HTTP client with auth interceptor
│   │   ├── App.jsx                  # Root component, custom state-based routing
│   │   ├── AppContext.jsx           # Global state + localStorage persistence
│   │   ├── dashboard.jsx            # Usage tracking, pipeline status, activity feed
│   │   ├── requriementanalysis.jsx  # RA Mode — upload, extract, stories, RTM
│   │   ├── developermode.jsx        # Dev Mode — unit tests, UML, tech plan, bugs
│   │   ├── testermode.jsx           # Tester Mode — manual tests, log analysis, bug report
│   │   ├── setting.jsx              # Settings — profile, pipeline prefs, system info
│   │   ├── loginpage.jsx
│   │   ├── signup.jsx
│   │   └── MermaidDiagram.jsx       # SVG diagram renderer with sanitiser
│   └── package.json
│
├── backend/
│   ├── main.py                      # FastAPI app, CORS, router registration
│   ├── database.py                  # SQLAlchemy engine + session
│   ├── models/__init__.py           # User, Project, Document, Execution, Requirement, UserStory
│   ├── api/
│   │   ├── auth.py                  # Signup, login, logout, /me endpoints
│   │   ├── agents.py                # 8 agent endpoints
│   │   ├── projects.py
│   │   └── documents.py
│   └── services/
│       └── agent_service.py         # Bridges FastAPI → LangGraph
│
├── app/
│   ├── graph.py                     # 5 LangGraph workflow definitions
│   ├── nodes.py                     # RA Mode agents (3 nodes)
│   ├── dev_nodes.py                 # Developer Mode agents (3 nodes)
│   ├── tester_nodes.py              # Tester Mode agents (2 nodes)
│   ├── schemas.py                   # Pydantic schemas for all LLM structured outputs
│   ├── state.py                     # RAState TypedDict — shared pipeline state
│   └── rag_setup.py                 # ChromaDB setup, HuggingFace embeddings, loaders
│
├── uploads/                         # Uploaded requirement documents
├── chroma_db/                       # ChromaDB vector store (auto-created)
├── autotestgen.db                   # SQLite database (auto-created)
├── run_backend.py                   # Backend launcher script
├── requirements.txt                 # Python dependencies
└── .env                             # API keys (see Environment Variables)
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier available)

### 1. Clone the repository

```bash
git clone https://github.com/Farrukh0-0/AutoTestGen-Plus.git
cd AutoTestGen-Plus
```

### 2. Set up the backend

```bash
# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Start the backend

```bash
python run_backend.py
```

The API will be available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### 5. Set up the frontend

```bash
cd frontend
npm install
```

### 6. Start the frontend

```bash
npm start
```

The app will open at `http://localhost:3000`

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GROQ_API_KEY` | Your Groq API key for Llama 3.3 70B inference | ✅ Yes |
| `DATABASE_URL` | SQLAlchemy DB URL (defaults to `sqlite:///./autotestgen.db`) | ❌ Optional |
| `REACT_APP_API_URL` | Backend API base URL (defaults to `http://localhost:8000/api/v1`) | ❌ Optional |

> **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## The Three Modes

### 📋 Requirement Analysis Mode

The entry point of the pipeline. Upload a `.txt`, `.pdf`, or `.docx` file describing what you want to build.

**Agent pipeline (sequential):**

```
File Upload → ChromaDB (RAG) → Agent 1: Extract FRs & NFRs
                                       ↓
                              Agent 2: Generate User Stories
                                       ↓
                              Agent 3: Generate RTM
```

**Outputs:**
- Functional Requirements (FR-01, FR-02…) with priority
- Non-Functional Requirements (NFR-01, NFR-02…)
- User Stories in standard Agile format with acceptance criteria
- Requirements Traceability Matrix mapping every requirement to a user story

---

### ⌨ Developer Mode

Reads requirements and user stories automatically from RA Mode output.

**Agent pipeline (parallel execution, linear graph):**

```
RA Output (Stories + FRs + NFRs)
        ↓
Agent 1: Generate Unit Test Cases  →  Agent 2: Generate UML Diagrams  →  Agent 3: Risk/Priority/Dependency Analysis
```

**Outputs:**
- Unit test cases with pre-conditions, steps, expected results, story links
- UML Flowchart + Use Case diagrams rendered as interactive SVGs (Mermaid.js)
- Risk/Priority/Dependency table with execution order and risk level per module

Can also accept raw source code as an alternative input.

---

### 🧪 Tester Mode

Reads user stories from RA Mode output.

**Agent pipeline:**

```
RA User Stories → Agent 1: Generate Manual Test Cases

(independently)
Raw Log Input   → Agent 2: Analyze Test Logs → Health Score + Issues Report
```

**Outputs:**
- Manual test cases with step-by-step action/expected result table, priority, type badges
- Log analysis report: total/passed/failed/flaky counts, health score (0–100), per-issue root cause and recommendation
- Manual bug reporting table (tester → developer feedback loop)

---

## Bug Tracking Loop

A complete tester-to-developer feedback loop built into the app:

```
Tester Mode                          Developer Mode
────────────────────────────────     ─────────────────────────────────
1. Tester reports bug                4. Developer sees bug (Open)
   - Title, Type, Priority    ──►    5. Marks "In Progress"
   - Related Test Case ID            6. Adds resolution note
   - Description                     7. Marks "Resolved"
                                              │
2. Bug gets ID: BUG-001       ◄──    8. Tester sees resolution note
3. Status: Open                         Status: Resolved ✓
```

Bugs persist across navigation via `localStorage` — both sides see live updates immediately when switching between modes.

---

## Dashboard

The dashboard tracks real usage data across the session and across page refreshes:

- **Mode usage cards** — how many times each mode was used, last-used timestamp, files processed, cumulative output counts
- **Pipeline status** — live dot indicators for every stage (file uploaded → extracted → stories → RTM → unit tests → UML → tech plan → manual tests → log analysis)
- **Session output summary** — 10-metric grid showing all current pipeline outputs at a glance
- **Recent activity feed** — reverse-chronological log of all three modes' activity
- **Reset All Data** — clears all outputs and usage history for the current user (permanent)


---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/signup` | Register new user |
| POST | `/api/v1/auth/login` | Login, returns token |
| GET  | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/logout` | Logout |
| GET  | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create project |
| POST | `/api/v1/documents/upload` | Upload requirement document |
| POST | `/api/v1/agents/extract-requirements` | Run RA Agent 1 |
| POST | `/api/v1/agents/generate-stories` | Run RA Agent 2 |
| POST | `/api/v1/agents/generate-rtm` | Run RA Agent 3 |
| POST | `/api/v1/agents/generate-unit-tests` | Run Dev Agent 1 |
| POST | `/api/v1/agents/generate-uml` | Run Dev Agent 2 |
| POST | `/api/v1/agents/generate-tech-plan` | Run Dev Agent 3 |
| POST | `/api/v1/agents/generate-manual-tests` | Run Tester Agent 1 |
| POST | `/api/v1/agents/analyze-logs` | Run Tester Agent 2 |

Full interactive documentation available at `http://localhost:8000/docs` when the backend is running.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request


---

## Acknowledgements

- [Groq](https://groq.com) — Ultra-fast LLM inference API
- [LangChain](https://langchain.com) & [LangGraph](https://langchain-ai.github.io/langgraph/) — Agent orchestration
- [ChromaDB](https://www.trychroma.com) — Local vector database
- [Mermaid.js](https://mermaid.js.org) — Diagram rendering
- [HuggingFace](https://huggingface.co) — `all-MiniLM-L6-v2` sentence embeddings
- [FastAPI](https://fastapi.tiangolo.com) — Backend framework
