import { useState, useRef, useEffect } from "react";
import "./developermode.css";
import apiClient from "./api/client";
import { useAppContext } from "./AppContext";
import MermaidDiagram from "./MermaidDiagram";
import "./MermaidDiagram.css";

// ── helpers ──────────────────────────────────────────────────────────────────

const CircuitBg = () => (
  <svg className="dev-circuit" viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
    <line x1="0"   y1="120" x2="300"  y2="120" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300" y1="120" x2="300"  y2="220" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300" y1="220" x2="580"  y2="220" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="300" cy="120" r="4" fill="#4fc3f7"/>
    <circle cx="580" cy="220" r="4" fill="#4fc3f7"/>
    <line x1="1000" y1="60" x2="1400" y2="60" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="1000" y1="60" x2="1000" y2="280" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="1200" y1="180" x2="1200" y2="420" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="1200" cy="280" r="5" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <line x1="0"   y1="450" x2="180" y2="450" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="900" y1="560" x2="900" y2="780" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="900" cy="680" r="5" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <circle cx="60"  cy="330" r="3" fill="#38bdf8"/>
    <line x1="60"  y1="330" x2="200" y2="330" stroke="#38bdf8" strokeWidth="1"/>
  </svg>
);

const navLinks = [
  { icon: "⊞", label: "Dashboard" },
  { icon: "📋", label: "Requirement Analysis Mode" },
  { icon: "⌨", label: "Developer Mode" },
  { icon: "🧪", label: "Tester Mode" },
  { icon: "⚙",  label: "Settings" },
  { icon: "⏻", label: "Logout" },
];

const LogoutModal = ({ onConfirm, onCancel }) => (
  <div className="logout-overlay" onClick={onCancel}>
    <div className="logout-modal" onClick={e => e.stopPropagation()}>
      <div className="logout-modal__title">Confirm Logout</div>
      <p className="logout-modal__body">Are you sure you want to logout?</p>
      <div className="logout-modal__btns">
        <button className="logout-btn-yes" onClick={onConfirm}>Yes</button>
        <button className="logout-btn-no"  onClick={onCancel}>No</button>
      </div>
    </div>
  </div>
);

// Toast notification component
const Toast = ({ toasts }) => (
  <div className="dev-toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`dev-toast dev-toast--${t.type}`}>
        <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
        <span>{t.message}</span>
      </div>
    ))}
  </div>
);

// Risk badge
const RiskBadge = ({ level }) => {
  const color = level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#22c55e';
  return (
    <span style={{
      background: `${color}22`, border: `1px solid ${color}66`,
      color, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700,
      fontFamily: 'var(--font-d)', letterSpacing: '.04em'
    }}>{level}</span>
  );
};

// Priority / type badge (for bugs)
const PillBadge = ({ label }) => {
  const map = {
    Critical: '#c084fc', High: '#f87171', Medium: '#fbbf24', Low: '#4ade80',
    Functional: '#7dd3fc', UI: '#a78bfa', Security: '#f87171',
    Performance: '#fb923c', Logic: '#e879f9', Integration: '#38bdf8',
  };
  const col = map[label] || '#8ab4cc';
  return (
    <span style={{
      background: `${col}22`, border: `1px solid ${col}55`, color: col,
      borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700,
      fontFamily: 'var(--font-d)', letterSpacing: '.03em', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
};

// Bug status badge
const BugStatusBadge = ({ status }) => {
  const map = {
    'Open':        { color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.35)' },
    'In Progress': { color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.35)'  },
    'Resolved':    { color: '#4ade80', bg: 'rgba(74,222,128,.12)',  border: 'rgba(74,222,128,.35)'  },
  };
  const s = map[status] || map['Open'];
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700,
      fontFamily: 'var(--font-d)', letterSpacing: '.04em', whiteSpace: 'nowrap',
    }}>{status}</span>
  );
};

export default function DeveloperMode({ onNav }) {
  const {
    user, project: sharedProject, logout,
    raRequirements, raUserStories,
    devUnitTests,   setDevUnitTests,
    devUml,         setDevUml,
    devTechPlan,    setDevTechPlan,
    devCodeContent, setDevCodeContent,
    devUploadedFile, setDevUploadedFile,
    usageDev, setUsageDev,
    testerBugs, setTesterBugs,
  } = useAppContext();
  const sharedUser = user?.name || "";

  // RA context availability
  const raFR  = raRequirements?.functionalRequirements    || [];
  const raNFR = raRequirements?.nonFunctionalRequirements || [];
  const raStories = Array.isArray(raUserStories) ? raUserStories : [];
  const hasRaData = raFR.length > 0 || raStories.length > 0;

  // Nav / UI state
  const [activeNav,   setActiveNav]   = useState("Developer Mode");
  const [showLogout,  setShowLogout]  = useState(false);
  const [toasts,      setToasts]      = useState([]);

  // Project state
  const [projects,           setProjects]           = useState([]);
  const [selectedProjectId,  setSelectedProjectId]  = useState(null);

  // Code upload state — persisted in context
  const uploadedFile   = devUploadedFile;
  const setUploadedFile = setDevUploadedFile;
  const codeContent    = devCodeContent;
  const setCodeContent = setDevCodeContent;

  // Per-action loading flags (ephemeral — fine as local state)
  const [loadingTests,    setLoadingTests]    = useState(false);
  const [loadingUml,      setLoadingUml]      = useState(false);
  const [loadingTechPlan, setLoadingTechPlan] = useState(false);
  const [loadingAll,      setLoadingAll]      = useState(false);

  // AI results — backed by context so they survive navigation
  const aiUnitTests  = devUnitTests;
  const setAiUnitTests = setDevUnitTests;
  const aiUml        = devUml;
  const setAiUml     = setDevUml;
  const aiTechPlan   = devTechPlan;
  const setAiTechPlan = setDevTechPlan;

  const fileRef = useRef();

  const initials = sharedUser.trim().split(" ").filter(Boolean)
    .map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // ── toast helpers ─────────────────────────────────────────────────────────
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // ── projects fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.listProjects();
        // API returns { projects: [...] }
        const raw = res?.data?.projects || res?.data || [];
        const mapped = Array.isArray(raw)
          ? raw.map(p => ({ id: p.id, name: p.name || `Project ${p.id}` }))
          : [];
        setProjects(mapped);
        if (mapped.length > 0) setSelectedProjectId(mapped[0].id);
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    })();
  }, []);

  // ── code file upload ───────────────────────────────────────────────────────
  const handleFileUpload = file => {
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = e => setCodeContent(e.target.result);
    reader.readAsText(file);
  };

  // ── build request payload ──────────────────────────────────────────────────
  const buildPayload = () => ({
    userStories:              raStories.length  > 0 ? raStories : null,
    sourceCode:               codeContent       || null,
    functionalRequirements:   raFR.length       > 0 ? raFR      : null,
    nonFunctionalRequirements:raNFR.length      > 0 ? raNFR     : null,
  });

  const canGenerate = selectedProjectId && (hasRaData || codeContent);

  // ── individual actions ─────────────────────────────────────────────────────
  const handleGenerateUnitTests = async () => {
    if (!canGenerate) return addToast('Select a project and ensure RA data or code is available.', 'error');
    setLoadingTests(true);
    try {
      const p = buildPayload();
      const res = await apiClient.generateUnitTests(
        selectedProjectId, p.userStories, p.sourceCode,
        p.functionalRequirements, p.nonFunctionalRequirements
      );
      const cases = res?.data?.unit_test_cases || [];
      setAiUnitTests(cases);
      addToast(`Generated ${cases.length} unit test case${cases.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('Unit tests failed', err);
      addToast(err?.response?.data?.detail || 'Unit test generation failed.', 'error');
    } finally { setLoadingTests(false); }
  };

  const handleGenerateUml = async () => {
    if (!canGenerate) return addToast('Select a project and ensure RA data or code is available.', 'error');
    setLoadingUml(true);
    try {
      const p = buildPayload();
      const res = await apiClient.generateUML(
        selectedProjectId, p.userStories, p.sourceCode,
        p.functionalRequirements, p.nonFunctionalRequirements
      );
      const diagrams = res?.data?.uml_diagrams || [];
      setAiUml(diagrams);
      addToast(`Generated ${diagrams.length} UML diagram${diagrams.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('UML failed', err);
      addToast(err?.response?.data?.detail || 'UML generation failed.', 'error');
    } finally { setLoadingUml(false); }
  };

  const handleGenerateTechPlan = async () => {
    if (!canGenerate) return addToast('Select a project and ensure RA data or code is available.', 'error');
    setLoadingTechPlan(true);
    try {
      const p = buildPayload();
      const res = await apiClient.generateTechPlan(
        selectedProjectId, p.userStories, p.sourceCode,
        p.functionalRequirements, p.nonFunctionalRequirements
      );
      const plan = res?.data?.technical_plan || [];
      setAiTechPlan(plan);
      addToast(`Generated tech plan with ${plan.length} task${plan.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('Tech plan failed', err);
      addToast(err?.response?.data?.detail || 'Tech plan generation failed.', 'error');
    } finally { setLoadingTechPlan(false); }
  };

  // ── generate all ───────────────────────────────────────────────────────────
  const handleGenerateAll = async () => {
    if (!canGenerate) return addToast('Select a project and ensure RA data or code is available.', 'error');
    setLoadingAll(true);
    try {
      const p = buildPayload();
      const [resTests, resUml, resPlan] = await Promise.all([
        apiClient.generateUnitTests(selectedProjectId, p.userStories, p.sourceCode,
          p.functionalRequirements, p.nonFunctionalRequirements),
        apiClient.generateUML(selectedProjectId, p.userStories, p.sourceCode,
          p.functionalRequirements, p.nonFunctionalRequirements),
        apiClient.generateTechPlan(selectedProjectId, p.userStories, p.sourceCode,
          p.functionalRequirements, p.nonFunctionalRequirements),
      ]);
      setAiUnitTests(resTests?.data?.unit_test_cases || []);
      setAiUml(resUml?.data?.uml_diagrams || []);
      setAiTechPlan(resPlan?.data?.technical_plan || []);
      addToast('All Developer Mode outputs generated successfully!');
      // Record usage
      setUsageDev(prev => [...prev, {
        file: uploadedFile?.name || (hasRaData ? 'RA requirements' : 'Unknown input'),
        timestamp: new Date().toISOString(),
        outputCounts: {
          unitTests: (resTests?.data?.unit_test_cases || []).length,
          diagrams:  (resUml?.data?.uml_diagrams     || []).length,
          tasks:     (resPlan?.data?.technical_plan  || []).length,
        },
      }]);
    } catch (err) {
      console.error('Generate all failed', err);
      addToast(err?.response?.data?.detail || 'One or more generations failed.', 'error');
    } finally { setLoadingAll(false); }
  };

  // ── Bug resolution state (one resolution note input per bug) ─────────────
  const [resolutionNotes, setResolutionNotes] = useState({});

  const setNote = (bugId, val) =>
    setResolutionNotes(prev => ({ ...prev, [bugId]: val }));

  const handleMarkInProgress = bugId => {
    setTesterBugs(prev => prev.map(b =>
      b.id === bugId ? { ...b, status: "In Progress" } : b
    ));
    addToast(`Bug ${bugId} marked as In Progress.`);
  };

  const handleMarkResolved = bugId => {
    const note = (resolutionNotes[bugId] || "").trim();
    if (!note) return addToast("Add a resolution note before marking as resolved.", "error");
    setTesterBugs(prev => prev.map(b =>
      b.id === bugId
        ? { ...b, status: "Resolved", resolutionNote: note, resolvedAt: new Date().toISOString() }
        : b
    ));
    setResolutionNotes(prev => { const n = { ...prev }; delete n[bugId]; return n; });
    addToast(`Bug ${bugId} resolved. Tester has been notified.`);
  };

  const handleReopenBug = bugId => {
    setTesterBugs(prev => prev.map(b =>
      b.id === bugId ? { ...b, status: "Open", resolutionNote: "", resolvedAt: null } : b
    ));
    addToast(`Bug ${bugId} reopened.`, "info");
  };

  // ── nav ────────────────────────────────────────────────────────────────────
  const handleNav = label => {
    if (label === "Logout") { setShowLogout(true); return; }
    setActiveNav(label);
    if (onNav) onNav(label);
  };
  const handleLogoutConfirm = () => {
    setShowLogout(false);
    logout();
    if (onNav) onNav("__logout__");
  };

  const anyLoading = loadingTests || loadingUml || loadingTechPlan || loadingAll;


  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Toast toasts={toasts} />
      <div className="dev-root">
        <CircuitBg />
        <div className="dev-orb dev-orb--tr" />
        <div className="dev-orb dev-orb--bl" />
        <div className="dev-orb dev-orb--c"  />

        {/* ── Sidebar ── */}
        <aside className="dev-sidebar">
          <div className="dev-sidebar__logo">
            <div className="dev-logo-badge"><span>ATG+</span></div>
            <span className="dev-logo-name">AutoTestGen+</span>
          </div>
          <nav className="dev-sidebar__nav">
            {navLinks.map(n => (
              <button key={n.label}
                className={`dev-nav-item${activeNav === n.label ? " dev-nav-item--active" : ""}`}
                onClick={() => handleNav(n.label)}>
                <span className="dev-nav-item__icon">{n.icon}</span>
                <span className="dev-nav-item__label">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="dev-sidebar__user">
            <div className="dev-user-avatar">
              {initials || <span style={{ fontSize: 15, opacity: .3 }}>?</span>}
            </div>
            <span className="dev-user-name" style={{ opacity: sharedUser ? 1 : .35 }}>
              {sharedUser || "Your Name"}
            </span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="dev-main">

          {/* Header */}
          <div className="dev-header">
            <h1 className="dev-header__title">
              Developer Mode
            </h1>

            {/* RA data status banner */}
            <div className={`dev-ra-banner ${hasRaData ? 'dev-ra-banner--ready' : 'dev-ra-banner--empty'}`}>
              {hasRaData ? (
                <>
                  <span className="dev-ra-banner__dot dev-ra-banner__dot--on" />
                  <span>RA data ready — <strong>{raStories.length}</strong> user stories, <strong>{raFR.length}</strong> functional + <strong>{raNFR.length}</strong> non-functional requirements loaded from Requirement Analysis Mode.</span>
                </>
              ) : (
                <>
                  <span className="dev-ra-banner__dot dev-ra-banner__dot--off" />
                  <span>No RA data found. Run Requirement Analysis Mode first, or upload a code file below to use source code as input.</span>
                </>
              )}
            </div>
          </div>


          {/* ── Input card: code upload + action buttons ── */}
          <div className="dev-card">
            <div className="dev-card__title">Input &amp; Generation Controls</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Code upload area */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
                  Optional: upload source code to augment or replace RA data as input.
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="dev-btn dev-btn--ghost dev-btn--sm" onClick={() => fileRef.current.click()}>
                    ↑ Upload Code File
                  </button>
                  {uploadedFile && (
                    <span className="dev-file-badge">📄 {uploadedFile.name}</span>
                  )}
                  <input ref={fileRef} type="file"
                    accept=".js,.ts,.jsx,.tsx,.py,.java,.cs,.cpp,.go,.rb,.php,.swift,.kt,.vue"
                    style={{ display: "none" }}
                    onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                </div>
                {codeContent && (
                  <div className="dev-code-editor" style={{ marginTop: 10 }}>
                    <div className="dev-code-editor__dots">
                      <span className="dev-dot dev-dot--red"/><span className="dev-dot dev-dot--yellow"/><span className="dev-dot dev-dot--green"/>
                    </div>
                    <div className="dev-code-content">{codeContent}</div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="dev-actions">
                <button className="dev-btn dev-btn--primary" disabled={!canGenerate || anyLoading}
                  onClick={handleGenerateAll}>
                  {loadingAll
                    ? <><span className="dev-spinner"/> Generating All…</>
                    : '⚡ Generate All (Unit Tests + Flow Diagrams + Tech Plan)'}
                </button>
              </div>
              <div className="dev-actions">
                <button className="dev-btn dev-btn--ghost dev-btn--sm" disabled={!canGenerate || anyLoading}
                  onClick={handleGenerateUnitTests}>
                  {loadingTests ? <><span className="dev-spinner"/> Working…</> : '🧪 Unit Tests'}
                </button>
                <button className="dev-btn dev-btn--ghost dev-btn--sm" disabled={!canGenerate || anyLoading}
                  onClick={handleGenerateUml}>
                  {loadingUml ? <><span className="dev-spinner"/> Working…</> : '📊 Flow Diagrams'}
                </button>
                <button className="dev-btn dev-btn--ghost dev-btn--sm" disabled={!canGenerate || anyLoading}
                  onClick={handleGenerateTechPlan}>
                  {loadingTechPlan ? <><span className="dev-spinner"/> Working…</> : '📋 Tech Plan'}
                </button>
              </div>

              {!canGenerate && (
                <div style={{ fontSize: 11, color: 'var(--warn)', fontFamily: 'var(--font-b)' }}>
                  ⚠ Select a project above. Then either run RA Mode first or upload a code file.
                </div>
              )}
            </div>
          </div>


          {/* ── Unit Test Cases ── */}
          <div className="dev-card">
            <div className="dev-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🧪 Unit Test Cases
              {loadingTests && <span className="dev-spinner"/>}
              {aiUnitTests.length > 0 && (
                <span className="dev-count-badge">{aiUnitTests.length}</span>
              )}
            </div>
            {loadingTests ? (
              <div className="dev-loading"><span className="dev-spinner"/><span className="dev-loading-text">Generating unit test cases…</span></div>
            ) : aiUnitTests.length === 0 ? (
              <div className="dev-empty-msg">Unit test cases will appear here after generation.</div>
            ) : (
              <div className="dev-table-wrap">
                <table className="dev-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Description</th>
                      <th>Pre-conditions</th>
                      <th>Steps</th>
                      <th>Expected Result</th>
                      <th>Story</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiUnitTests.map((tc, i) => (
                      <tr key={i}>
                        <td><span className="dev-id-chip">{tc.test_id || `TC-${String(i+1).padStart(2,'0')}`}</span></td>
                        <td>{tc.description || '—'}</td>
                        <td style={{ fontSize: 11 }}>{tc.pre_conditions || tc.preconditions || '—'}</td>
                        <td style={{ fontSize: 11 }}>
                          {Array.isArray(tc.steps)
                            ? <ol style={{ paddingLeft: 14, margin: 0 }}>{tc.steps.map((s, si) => (
                                <li key={si}>{typeof s === 'string' ? s : s.action || JSON.stringify(s)}</li>
                              ))}</ol>
                            : tc.steps || '—'}
                        </td>
                        <td style={{ fontSize: 11 }}>{tc.expected_result || '—'}</td>
                        <td><span style={{ fontSize: 10, color: 'var(--accent)' }}>{tc.related_story_id || '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          {/* ── Diagrams ── */}
          <div className="dev-card">
            <div className="dev-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 Flow Diagrams
              {loadingUml && <span className="dev-spinner"/>}
              {aiUml.length > 0 && (
                <span className="dev-count-badge">{aiUml.length}</span>
              )}
            </div>
            {loadingUml ? (
              <div className="dev-loading"><span className="dev-spinner"/><span className="dev-loading-text">Generating diagrams…</span></div>
            ) : aiUml.length === 0 ? (
              <div className="dev-empty-msg">Flowchart & Use Case diagram will appear here after generation.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {aiUml.map((d, i) => (
                  <MermaidDiagram
                    key={i}
                    code={d.mermaid_code || d.content || ""}
                    title={d.title || `Diagram ${i + 1}`}
                    diagramType={d.diagram_type}
                    explanation={d.explanation}
                  />
                ))}
              </div>
            )}
          </div>


          {/* ── Technical Plan (Risk / Priority / Dependency table) ── */}
          <div className="dev-card">
            <div className="dev-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Risk, Priority &amp; Dependency Analysis
              {loadingTechPlan && <span className="dev-spinner"/>}
              {aiTechPlan.length > 0 && (
                <span className="dev-count-badge">{aiTechPlan.length}</span>
              )}
            </div>
            {loadingTechPlan ? (
              <div className="dev-loading"><span className="dev-spinner"/><span className="dev-loading-text">Generating technical plan…</span></div>
            ) : aiTechPlan.length === 0 ? (
              <div className="dev-empty-msg">Risk, priority and dependency table will appear here after generation.</div>
            ) : (
              <div className="dev-table-wrap">
                <table className="dev-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Task / Module</th>
                      <th>Risk Level</th>
                      <th>Dependencies</th>
                      <th>Exec. Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiTechPlan
                      .slice()
                      .sort((a, b) => (a.execution_order || 0) - (b.execution_order || 0))
                      .map((task, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center', color: 'var(--accent)', fontFamily: 'var(--font-d)', fontSize: 11 }}>
                          {task.execution_order ?? i + 1}
                        </td>
                        <td style={{ fontWeight: 600 }}>{task.task_name || '—'}</td>
                        <td><RiskBadge level={task.risk_level || 'Medium'} /></td>
                        <td style={{ fontSize: 11 }}>
                          {Array.isArray(task.dependencies) && task.dependencies.length > 0
                            ? <ul style={{ paddingLeft: 14, margin: 0 }}>
                                {task.dependencies.map((dep, di) => <li key={di}>{dep}</li>)}
                              </ul>
                            : <span style={{ color: 'var(--muted)' }}>None</span>}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                          {task.execution_order ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Bugs Reported by Tester ── */}
          <div className="dev-card">
            <div className="dev-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🐛 Bugs Reported by Tester
              {testerBugs.filter(b => b.status === 'Open').length > 0 && (
                <span className="dev-bug-badge dev-bug-badge--open">
                  {testerBugs.filter(b => b.status === 'Open').length} Open
                </span>
              )}
              {testerBugs.filter(b => b.status === 'In Progress').length > 0 && (
                <span className="dev-bug-badge dev-bug-badge--progress">
                  {testerBugs.filter(b => b.status === 'In Progress').length} In Progress
                </span>
              )}
              {testerBugs.filter(b => b.status === 'Resolved').length > 0 && (
                <span className="dev-bug-badge dev-bug-badge--resolved">
                  {testerBugs.filter(b => b.status === 'Resolved').length} Resolved
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-b)', margin: '0 0 14px' }}>
              Bugs the tester reported manually. Mark them In Progress while working, then add a resolution note and mark Resolved — the tester will see the update instantly.
            </p>

            {testerBugs.length === 0 ? (
              <div className="dev-empty-msg">No bugs reported by the tester yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {testerBugs.map(bug => (
                  <div key={bug.id} className={`dev-bug-item ${bug.status === 'Resolved' ? 'dev-bug-item--resolved' : bug.status === 'In Progress' ? 'dev-bug-item--progress' : ''}`}>

                    {/* Bug header row */}
                    <div className="dev-bug-item__header">
                      <span className="dev-id-chip" style={{ fontSize: 9 }}>{bug.id}</span>
                      <span className="dev-bug-item__title">{bug.title}</span>
                      <div style={{ display: 'flex', gap: 5, marginLeft: 'auto', flexShrink: 0, alignItems: 'center' }}>
                        <PillBadge label={bug.type} />
                        <PillBadge label={bug.priority} />
                        <BugStatusBadge status={bug.status} />
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="dev-bug-item__meta">
                      {bug.relatedTestId && bug.relatedTestId !== '—' && (
                        <span><strong>Test Case:</strong> {bug.relatedTestId}</span>
                      )}
                      {bug.description && bug.description !== '—' && (
                        <span><strong>Description:</strong> {bug.description}</span>
                      )}
                      <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>
                        Reported {new Date(bug.reportedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Resolution area — only for Open / In Progress */}
                    {bug.status !== 'Resolved' && (
                      <div className="dev-bug-item__resolve">
                        <input
                          className="dev-input"
                          style={{ flex: 1, fontSize: 12 }}
                          placeholder="Add resolution note (required before marking resolved)…"
                          value={resolutionNotes[bug.id] || ''}
                          onChange={e => setNote(bug.id, e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {bug.status === 'Open' && (
                            <button className="dev-btn dev-btn--ghost dev-btn--sm"
                              style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,.3)' }}
                              onClick={() => handleMarkInProgress(bug.id)}>
                              ⏳ In Progress
                            </button>
                          )}
                          <button className="dev-btn dev-btn--ghost dev-btn--sm"
                            style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,.3)' }}
                            disabled={!(resolutionNotes[bug.id] || '').trim()}
                            onClick={() => handleMarkResolved(bug.id)}>
                            ✓ Mark Resolved
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Resolution note display — for Resolved bugs */}
                    {bug.status === 'Resolved' && (
                      <div className="dev-bug-item__resolution-done">
                        <span style={{ color: '#4ade80', marginRight: 6 }}>✓</span>
                        <span><strong>Resolution:</strong> {bug.resolutionNote}</span>
                        <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontSize: 11 }}>
                          {bug.resolvedAt && new Date(bug.resolvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button className="dev-btn dev-btn--ghost dev-btn--sm"
                          style={{ color: '#f87171', borderColor: 'rgba(248,113,113,.25)', marginLeft: 8 }}
                          onClick={() => handleReopenBug(bug.id)}>
                          ↺ Reopen
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>

      {showLogout && <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogout(false)} />}
    </>
  );
}
