import { useState, useRef, useEffect } from "react";
import "./testermode.css";
import apiClient from "./api/client";
import { useAppContext } from "./AppContext";

// ── Static bits ───────────────────────────────────────────────────────────────

const CircuitBg = () => (
  <svg className="tm-circuit" viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
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

// Toast
const Toast = ({ toasts }) => (
  <div className="tm-toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`tm-toast tm-toast--${t.type}`}>
        <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
        <span>{t.message}</span>
      </div>
    ))}
  </div>
);

// Priority / status badge
const Badge = ({ label }) => {
  const map = {
    Critical: '#c084fc', High: '#f87171', Medium: '#fbbf24', Low: '#4ade80',
    Failed: '#f87171', Flaky: '#fbbf24', Passed: '#4ade80',
    Functional: '#7dd3fc', UI: '#a78bfa', Security: '#f87171', Performance: '#fb923c',
    Logic: '#e879f9', Integration: '#38bdf8',
  };
  const col = map[label] || '#8ab4cc';
  return (
    <span style={{
      background: `${col}22`, border: `1px solid ${col}55`,
      color: col, borderRadius: 4, padding: '1px 7px',
      fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-d)',
      letterSpacing: '.03em', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
};

// Bug status badge
const BugStatusBadge = ({ status }) => {
  const map = {
    Open:        { color: '#f87171', bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.35)' },
    'In Progress':{ color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.35)'  },
    Resolved:    { color: '#4ade80', bg: 'rgba(74,222,128,.12)',   border: 'rgba(74,222,128,.35)'  },
  };
  const s = map[status] || map.Open;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700,
      fontFamily: 'var(--font-d)', letterSpacing: '.04em', whiteSpace: 'nowrap',
    }}>{status}</span>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function TesterMode({ onNav }) {
  const {
    user, project: sharedProject, logout,
    raUserStories,
    testerManualTests, setTesterManualTests,
    testerLogAnalysis, setTesterLogAnalysis,
    testerLogContent,  setTesterLogContent,
    testerBugs,        setTesterBugs,
    usageTester, setUsageTester,
  } = useAppContext();
  const sharedUser = user?.name || "";

  // RA context — the data flowing in from Requirement Analysis Mode
  const raStories = Array.isArray(raUserStories) ? raUserStories : [];
  const hasRaData = raStories.length > 0;

  // Nav
  const [activeNav,  setActiveNav]  = useState("Tester Mode");
  const [showLogout, setShowLogout] = useState(false);
  const [toasts,     setToasts]     = useState([]);

  // Projects
  const [projects,          setProjects]          = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // AI results — backed by context so they survive navigation
  const manualTests    = testerManualTests;
  const setManualTests = setTesterManualTests;
  const logAnalysis    = testerLogAnalysis;
  const setLogAnalysis = setTesterLogAnalysis;

  // Log input — persisted in context so pasted text survives navigation
  const logContent    = testerLogContent;
  const setLogContent = setTesterLogContent;

  const logFileRef = useRef();

  // Per-action loading flags (ephemeral — local state is correct)
  const [loadingManual, setLoadingManual] = useState(false);
  const [loadingLogs,   setLoadingLogs]   = useState(false);

  const initials = sharedUser.trim().split(" ").filter(Boolean)
    .map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // ── toast helpers ─────────────────────────────────────────────────────────
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  // ── fetch projects (BUG #1 fixed: res.data.projects not res.data) ─────────
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
        if (mapped.length > 0) {
          const match = mapped.find(p => sharedProject && `${p.id}` === `${sharedProject?.id}`);
          setSelectedProjectId(match ? match.id : mapped[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    })();
  }, [sharedProject]);

  // ── Generate Manual Tests (BUG #2 fixed: pass raStories not manualTests) ──
  const handleGenerateManualTests = async () => {
    if (!selectedProjectId) return addToast('Select a project first.', 'error');
    if (!hasRaData) return addToast('No user stories from RA Mode. Run Requirement Analysis first.', 'error');
    setLoadingManual(true);
    try {
      const resp = await apiClient.generateManualTests(selectedProjectId, raStories);
      const tests = resp?.data?.manual_test_cases || [];
      setManualTests(tests);
      addToast(`Generated ${tests.length} manual test case${tests.length !== 1 ? 's' : ''}.`);
      // Record usage
      setUsageTester(prev => [...prev, {
        file: 'RA user stories',
        timestamp: new Date().toISOString(),
        outputCounts: { manualTests: tests.length },
      }]);
    } catch (err) {
      console.error('Manual tests failed', err);
      addToast(err?.response?.data?.detail || 'Failed to generate manual tests.', 'error');
    } finally { setLoadingManual(false); }
  };

  // ── Analyze Logs ──────────────────────────────────────────────────────────
  const handleAnalyzeLogs = async () => {
    if (!selectedProjectId) return addToast('Select a project first.', 'error');
    if (!logContent.trim())  return addToast('Paste or upload log content first.', 'error');
    setLoadingLogs(true);
    try {
      const resp = await apiClient.analyzeLogs(selectedProjectId, logContent);
      const report = resp?.data?.log_analysis_report || null;
      setLogAnalysis(report);
      if (report) addToast(`Log analysis complete. Health score: ${report.health_score ?? '?'}/100`);
    } catch (err) {
      console.error('Log analysis failed', err);
      addToast(err?.response?.data?.detail || 'Failed to analyze logs.', 'error');
    } finally { setLoadingLogs(false); }
  };

  // ── Log file upload ───────────────────────────────────────────────────────
  const handleLogFileUpload = file => {
    const reader = new FileReader();
    reader.onload = e => setLogContent(e.target.result);
    reader.readAsText(file);
  };

  // ── Bug report form (local — transient input fields only) ────────────────
  const [bugTitle,         setBugTitle]         = useState("");
  const [bugType,          setBugType]          = useState("Functional");
  const [bugPriority,      setBugPriority]      = useState("High");
  const [bugRelatedTestId, setBugRelatedTestId] = useState("");
  const [bugDescription,   setBugDescription]   = useState("");

  // Build next sequential bug ID
  const nextBugId = () => {
    const max = testerBugs.reduce((m, b) => {
      const n = parseInt((b.id || "BUG-000").split("-")[1] || "0", 10);
      return n > m ? n : m;
    }, 0);
    return `BUG-${String(max + 1).padStart(3, "0")}`;
  };

  const handleReportBug = () => {
    if (!bugTitle.trim()) return addToast("Bug title is required.", "error");
    const bug = {
      id:            nextBugId(),
      title:         bugTitle.trim(),
      type:          bugType,
      priority:      bugPriority,
      relatedTestId: bugRelatedTestId.trim() || "—",
      description:   bugDescription.trim() || "—",
      status:        "Open",
      reportedAt:    new Date().toISOString(),
      resolvedAt:    null,
      resolutionNote: "",
    };
    setTesterBugs(prev => [bug, ...prev]);
    setBugTitle(""); setBugRelatedTestId(""); setBugDescription("");
    addToast(`Bug ${bug.id} reported and sent to Developer Mode.`);
  };

  const handleDeleteBug = id =>
    setTesterBugs(prev => prev.filter(b => b.id !== id));

  // ── Nav ───────────────────────────────────────────────────────────────────
  const handleNav = label => {
    if (label === "Logout") { setShowLogout(true); return; }
    setActiveNav(label);
    if (onNav) onNav(label);
  };
  const handleLogoutConfirm = () => {
    setShowLogout(false); logout();
    if (onNav) onNav("__logout__");
  };


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Toast toasts={toasts} />
      <div className="tm-root">
        <CircuitBg />
        <div className="tm-orb tm-orb--tr" />
        <div className="tm-orb tm-orb--bl" />
        <div className="tm-orb tm-orb--c"  />

        {/* ── Sidebar ── */}
        <aside className="tm-sidebar">
          <div className="tm-sidebar__logo">
            <div className="tm-logo-badge"><span>ATG+</span></div>
            <span className="tm-logo-name">AutoTestGen+</span>
          </div>
          <nav className="tm-sidebar__nav">
            {navLinks.map(n => (
              <button key={n.label}
                className={`tm-nav-item${activeNav === n.label ? " tm-nav-item--active" : ""}`}
                onClick={() => handleNav(n.label)}>
                <span className="tm-nav-item__icon">{n.icon}</span>
                <span className="tm-nav-item__label">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="tm-sidebar__user">
            <div className="tm-user-avatar">
              {initials || <span style={{ fontSize: 15, opacity: .3 }}>?</span>}
            </div>
            <span className="tm-user-name" style={{ opacity: sharedUser ? 1 : .35 }}>
              {sharedUser || "Your Name"}
            </span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="tm-main">

          {/* Header */}
          <div className="tm-header">
            <h1 className="tm-header__title">
              Tester Mode
            </h1>

            {/* RA data status banner */}
            <div className={`tm-ra-banner ${hasRaData ? 'tm-ra-banner--ready' : 'tm-ra-banner--empty'}`}>
              {hasRaData ? (
                <>
                  <span className="tm-ra-dot tm-ra-dot--on" />
                  <span>RA data ready — <strong>{raStories.length}</strong> user stories loaded from Requirement Analysis Mode. Ready to generate manual test cases.</span>
                </>
              ) : (
                <>
                  <span className="tm-ra-dot tm-ra-dot--off" />
                  <span>No RA data found. Run Requirement Analysis Mode first to load user stories, then come back here to generate test cases.</span>
                </>
              )}
            </div>
          </div>


          {/* ── Controls card ── */}
          <div className="tm-card">
            <div className="tm-card__title">Generation Controls</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="tm-btn tm-btn--primary" disabled={!hasRaData || !selectedProjectId || loadingManual || loadingLogs}
                onClick={handleGenerateManualTests}>
                {loadingManual
                  ? <><span className="tm-spinner" /> Generating Tests…</>
                  : '🧪 Generate Manual Test Cases'}
              </button>
              {!hasRaData && (
                <span style={{ fontSize: 11, color: 'var(--warn)', fontFamily: 'var(--font-b)' }}>
                  ⚠ Run Requirement Analysis Mode first.
                </span>
              )}
            </div>
          </div>

          {/* ── Manual Test Cases table (BUG #3 fixed) ── */}
          <div className="tm-card">
            <div className="tm-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Manual Test Cases
              {loadingManual && <span className="tm-spinner" />}
              {manualTests.length > 0 && <span className="tm-count-badge">{manualTests.length}</span>}
            </div>

            {loadingManual ? (
              <div className="tm-loading"><span className="tm-spinner" /><span className="tm-loading-text">Writing manual test cases…</span></div>
            ) : manualTests.length === 0 ? (
              <div className="tm-empty-msg">Manual test cases will appear here after generation.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {manualTests.map((tc, i) => (
                  <div key={i} className="tm-tc-block">
                    {/* TC header row */}
                    <div className="tm-tc-header">
                      <span className="tm-id-chip">{tc.test_id || `TC-${String(i+1).padStart(3,'0')}`}</span>
                      <span className="tm-tc-title">{tc.title || '—'}</span>
                      <div style={{ display: 'flex', gap: 5, marginLeft: 'auto', flexShrink: 0 }}>
                        {tc.priority  && <Badge label={tc.priority}  />}
                        {tc.test_type && <Badge label={tc.test_type} />}
                      </div>
                    </div>
                    {/* Meta row */}
                    <div className="tm-tc-meta">
                      <span><strong>Story:</strong> {tc.related_story_id || '—'}</span>
                      <span><strong>Pre-conditions:</strong> {tc.preconditions || '—'}</span>
                    </div>
                    {/* Steps table */}
                    {Array.isArray(tc.steps) && tc.steps.length > 0 && (
                      <div className="tm-table-wrap">
                        <table className="tm-table">
                          <thead>
                            <tr>
                              <th style={{ width: 36 }}>#</th>
                              <th>Action</th>
                              <th>Expected Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tc.steps.map((step, si) => (
                              <tr key={si}>
                                <td style={{ textAlign: 'center', color: 'var(--accent)', fontFamily: 'var(--font-d)', fontSize: 10 }}>
                                  {step.step_number ?? si + 1}
                                </td>
                                <td>{step.action || (typeof step === 'string' ? step : '—')}</td>
                                <td style={{ color: 'var(--text2)' }}>{step.expected_result || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* ── Log Analysis section ── */}
          <div className="tm-card">
            <div className="tm-card__title">🔍 Test Log Analysis</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-b)' }}>
                Paste execution logs or upload a log file. The AI will detect failures, flaky tests and suggest fixes.
              </div>

              {/* Log textarea + file upload */}
              <textarea className="tm-textarea" rows={6}
                value={logContent}
                onChange={e => setLogContent(e.target.value)}
                placeholder={"Paste test execution logs here…\n\nExample:\n[10:22:01] ✓  Login test — PASSED\n[10:22:03] ✗  Checkout flow — FAILED: ElementNotFound #submit-btn\n[10:22:05] ✓  Search — PASSED"} />

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="tm-btn tm-btn--primary" style={{ flex: 'none' }}
                  disabled={!logContent.trim() || !selectedProjectId || loadingLogs || loadingManual}
                  onClick={handleAnalyzeLogs}>
                  {loadingLogs
                    ? <><span className="tm-spinner" /> Analyzing…</>
                    : '🔎 Analyze Logs'}
                </button>
                <button className="tm-btn tm-btn--ghost tm-btn--sm"
                  onClick={() => logFileRef.current.click()}>
                  ↑ Upload Log File
                </button>
                {logContent && (
                  <button className="tm-btn tm-btn--ghost tm-btn--sm"
                    style={{ color: 'rgba(248,113,113,.7)' }}
                    onClick={() => { setLogContent(''); setLogAnalysis(null); }}>
                    ✕ Clear
                  </button>
                )}
                <input ref={logFileRef} type="file" accept=".txt,.log,.out,.text"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && handleLogFileUpload(e.target.files[0])} />
              </div>
            </div>
          </div>

          {/* ── Log Analysis Report (BUG #4 fixed) ── */}
          <div className="tm-card">
            <div className="tm-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              📊 Log Analysis Report
              {loadingLogs && <span className="tm-spinner" />}
            </div>

            {loadingLogs ? (
              <div className="tm-loading"><span className="tm-spinner" /><span className="tm-loading-text">Analyzing logs…</span></div>
            ) : !logAnalysis ? (
              <div className="tm-empty-msg">Log analysis results will appear here after running analysis.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Summary stats row */}
                <div className="tm-stats-row">
                  <div className="tm-stat-card tm-stat-card--total">
                    <div className="tm-stat-card__num">{logAnalysis.total_tests ?? '—'}</div>
                    <div className="tm-stat-card__lbl">Total Tests</div>
                  </div>
                  <div className="tm-stat-card tm-stat-card--pass">
                    <div className="tm-stat-card__num">{logAnalysis.passed ?? '—'}</div>
                    <div className="tm-stat-card__lbl">Passed</div>
                  </div>
                  <div className="tm-stat-card tm-stat-card--fail">
                    <div className="tm-stat-card__num">{logAnalysis.failed ?? '—'}</div>
                    <div className="tm-stat-card__lbl">Failed</div>
                  </div>
                  <div className="tm-stat-card tm-stat-card--flaky">
                    <div className="tm-stat-card__num">{logAnalysis.flaky ?? '—'}</div>
                    <div className="tm-stat-card__lbl">Flaky</div>
                  </div>
                  {/* Health score gauge */}
                  <div className="tm-stat-card tm-stat-card--health">
                    <div className="tm-stat-card__num" style={{
                      color: (logAnalysis.health_score ?? 0) >= 70 ? '#22c55e'
                           : (logAnalysis.health_score ?? 0) >= 40 ? '#f59e0b' : '#ef4444'
                    }}>
                      {logAnalysis.health_score ?? '—'}<span style={{ fontSize: 11, fontWeight: 400 }}>/100</span>
                    </div>
                    <div className="tm-stat-card__lbl">Health Score</div>
                  </div>
                </div>

                {/* Issues table */}
                {Array.isArray(logAnalysis.issues) && logAnalysis.issues.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-b)', fontWeight: 700, letterSpacing: '.04em' }}>
                      ISSUES DETECTED ({logAnalysis.issues.length})
                    </div>
                    <div className="tm-table-wrap">
                      <table className="tm-table">
                        <thead>
                          <tr>
                            <th>Test Name</th>
                            <th>Status</th>
                            <th>Error Message</th>
                            <th>Root Cause</th>
                            <th>Recommendation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logAnalysis.issues.map((issue, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{issue.test_name || '—'}</td>
                              <td><Badge label={issue.status || 'Failed'} /></td>
                              <td style={{ fontSize: 11, color: '#f87171', fontFamily: 'var(--font-c)' }}>{issue.error_message || '—'}</td>
                              <td style={{ fontSize: 11, color: 'var(--warn)' }}>{issue.root_cause_hypothesis || '—'}</td>
                              <td style={{ fontSize: 11, color: '#4ade80' }}>{issue.recommendation || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>


          {/* ── Bug Report Card ── */}
          <div className="tm-card">
            <div className="tm-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              🐛 Bug Report
              {testerBugs.filter(b => b.status === "Open").length > 0 && (
                <span className="tm-bug-badge tm-bug-badge--open">
                  {testerBugs.filter(b => b.status === "Open").length} Open
                </span>
              )}
              {testerBugs.filter(b => b.status === "Resolved").length > 0 && (
                <span className="tm-bug-badge tm-bug-badge--resolved">
                  {testerBugs.filter(b => b.status === "Resolved").length} Resolved
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-b)", margin: "0 0 14px" }}>
              Report bugs the AI missed. Developer Mode will show these for the developer to fix and mark resolved.
            </p>

            {/* ── Form ── */}
            <div className="tm-bug-form">
              <div className="tm-bug-form__row">
                <div className="tm-bug-form__field" style={{ flex: 2 }}>
                  <label className="tm-bug-form__label">Bug Title *</label>
                  <input className="tm-input" placeholder="e.g. Login button unresponsive on mobile"
                    value={bugTitle} onChange={e => setBugTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleReportBug()} />
                </div>
                <div className="tm-bug-form__field">
                  <label className="tm-bug-form__label">Type</label>
                  <select className="tm-input tm-select" value={bugType} onChange={e => setBugType(e.target.value)}>
                    {["Functional","UI","Performance","Security","Logic","Integration"].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="tm-bug-form__field">
                  <label className="tm-bug-form__label">Priority</label>
                  <select className="tm-input tm-select" value={bugPriority} onChange={e => setBugPriority(e.target.value)}>
                    {["Critical","High","Medium","Low"].map(p => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="tm-bug-form__row">
                <div className="tm-bug-form__field" style={{ flex: 1 }}>
                  <label className="tm-bug-form__label">Related Test Case ID</label>
                  <input className="tm-input" placeholder="e.g. TC-002 (optional)"
                    value={bugRelatedTestId} onChange={e => setBugRelatedTestId(e.target.value)} />
                </div>
                <div className="tm-bug-form__field" style={{ flex: 3 }}>
                  <label className="tm-bug-form__label">Description</label>
                  <input className="tm-input" placeholder="Steps to reproduce, actual vs expected behaviour…"
                    value={bugDescription} onChange={e => setBugDescription(e.target.value)} />
                </div>
              </div>
              <button className="tm-btn tm-btn--primary" style={{ marginTop: 4 }}
                disabled={!bugTitle.trim()} onClick={handleReportBug}>
                🐛 Report Bug
              </button>
            </div>

            {/* ── Bug list ── */}
            {testerBugs.length > 0 && (
              <div className="tm-bug-list">
                <div className="tm-table-wrap" style={{ marginTop: 16 }}>
                  <table className="tm-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Priority</th>
                        <th>Test Case</th>
                        <th>Status</th>
                        <th>Resolution Note</th>
                        <th style={{ width: 32 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {testerBugs.map(bug => (
                        <tr key={bug.id} className={bug.status === "Resolved" ? "tm-bug-row--resolved" : ""}>
                          <td>
                            <span className="tm-id-chip" style={{ fontSize: 9 }}>{bug.id}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{bug.title}</td>
                          <td><Badge label={bug.type} /></td>
                          <td><Badge label={bug.priority} /></td>
                          <td style={{ fontSize: 11, color: "var(--accent)" }}>{bug.relatedTestId}</td>
                          <td><BugStatusBadge status={bug.status} /></td>
                          <td style={{ fontSize: 11, color: bug.resolutionNote ? "#4ade80" : "var(--muted)", fontStyle: bug.resolutionNote ? "normal" : "italic" }}>
                            {bug.resolutionNote || (bug.status === "Resolved" ? "—" : "Awaiting developer…")}
                          </td>
                          <td>
                            {bug.status === "Open" && (
                              <button onClick={() => handleDeleteBug(bug.id)}
                                style={{ background: "none", border: "none", color: "rgba(248,113,113,.45)", fontSize: 13, cursor: "pointer", padding: "2px 4px" }}
                                title="Delete bug">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {testerBugs.length === 0 && (
              <div className="tm-empty-msg" style={{ marginTop: 12 }}>
                No bugs reported yet. Use the form above to report a bug for the developer.
              </div>
            )}
          </div>

        </main>
      </div>

      {showLogout && <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogout(false)} />}
    </>
  );
}
