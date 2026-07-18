import { useState, useRef, useEffect } from "react";
import "./setting.css";
import { useAppContext } from "./AppContext";

// ── Static ────────────────────────────────────────────────────────────────────

const CircuitBg = () => (
  <svg className="st-circuit" viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
    <line x1="0"    y1="120" x2="300"  y2="120" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300"  y1="120" x2="300"  y2="220" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300"  y1="220" x2="580"  y2="220" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="300" cy="120" r="4" fill="#4fc3f7"/>
    <circle cx="580" cy="220" r="4" fill="#4fc3f7"/>
    <line x1="1000" y1="60"  x2="1400" y2="60"  stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="1000" y1="60"  x2="1000" y2="280" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="1000" cy="60"  r="4" fill="#4fc3f7"/>
    <line x1="1200" y1="180" x2="1200" y2="420" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="1200" cy="280" r="5" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <line x1="0"   y1="450" x2="180" y2="450" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="900" y1="560" x2="900" y2="780" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="900" cy="680" r="5" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <circle cx="60"  cy="330" r="3" fill="#38bdf8"/>
    <line x1="60"  y1="330" x2="200" y2="330" stroke="#38bdf8" strokeWidth="1"/>
    <line x1="700" y1="0"   x2="700" y2="180" stroke="#38bdf8" strokeWidth="1"/>
    <circle cx="700" cy="180" r="3" fill="#38bdf8"/>
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

const Toggle = ({ on, onChange }) => (
  <div className="st-toggle" onClick={() => onChange(!on)}>
    <div className={`st-toggle__track${on ? " st-toggle__track--on" : ""}`} />
    <div className={`st-toggle__thumb${on ? " st-toggle__thumb--on" : " st-toggle__thumb--off"}`} />
  </div>
);

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

const ResetModal = ({ onConfirm, onCancel }) => (
  <div className="logout-overlay" onClick={onCancel}>
    <div className="logout-modal" onClick={e => e.stopPropagation()}>
      <div className="logout-modal__title">Clear Current Session?</div>
      <p className="logout-modal__body">
        This clears all outputs generated in the current session — requirements, stories, RTM, unit tests, diagrams, tech plan, manual tests and log analysis.<br/><br/>
        Your previously saved data in storage is <strong style={{color:'#4ade80'}}>not affected</strong>. It will be restored the next time you open the app.
      </p>
      <div className="logout-modal__btns">
        <button className="logout-btn-yes" onClick={onConfirm}>Clear Session</button>
        <button className="logout-btn-no"  onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

// ── Stat cell used in session summary ─────────────────────────────────────────
const StatCell = ({ label, value, color }) => (
  <div className="st-stat-cell">
    <div className="st-stat-cell__val" style={{ color: color || 'var(--accent)' }}>{value}</div>
    <div className="st-stat-cell__lbl">{label}</div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsPreview({ onNav }) {
  const {
    user, setUser, logout, project: sharedProject,
    apiHealthy,
    raRequirements, raUserStories, raRtm,
    devUnitTests, devUml, devTechPlan,
    testerManualTests, testerLogAnalysis, testerBugs,
    clearSessionState,
  } = useAppContext();

  const sharedUser = user?.name || "";

  // ── Local UI state ────────────────────────────────────────────────────────
  const [activeNav,   setActiveNav]   = useState("Settings");
  const [showLogout,  setShowLogout]  = useState(false);
  const [showReset,   setShowReset]   = useState(false);

  // Profile fields
  const [name,        setName]        = useState(user?.name  || "");
  const [email,       setEmail]       = useState(user?.email || "");
  const [dirty,       setDirty]       = useState(false);
  const [saved,       setSaved]       = useState(false);
  const saveTimer = useRef(null);

  // Pipeline preferences (stored locally — informational / display)
  const [defaultDiagram,  setDefaultDiagram]  = useState("Flowchart");
  const [autoAdvance,     setAutoAdvance]      = useState(true);
  const [showRawMermaid,  setShowRawMermaid]   = useState(false);

  // System / backend
  const [backendUrl, setBackendUrl] = useState(
    process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1"
  );
  const [urlDirty,   setUrlDirty]   = useState(false);
  const [urlSaved,   setUrlSaved]   = useState(false);

  useEffect(() => {
    if (user?.name)  setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user]);

  const initials = name.trim().split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const change = setter => val => { setter(val); setSaved(false); setDirty(true); };

  // ── Derived session stats ─────────────────────────────────────────────────
  const raFR     = raRequirements?.functionalRequirements    || [];
  const raNFR    = raRequirements?.nonFunctionalRequirements || [];
  const stories  = Array.isArray(raUserStories) ? raUserStories : [];
  const rtmRows  = Array.isArray(raRtm) ? raRtm : [];
  const openBugs = (testerBugs || []).filter(b => b.status === 'Open').length;

  const pipelineComplete =
    raFR.length > 0 && stories.length > 0 && rtmRows.length > 0 &&
    devUnitTests.length > 0 && testerManualTests.length > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    clearTimeout(saveTimer.current);
    setUser({ ...(user || {}), name: name.trim(), email: email.trim() });
    setSaved(true); setDirty(false);
    saveTimer.current = setTimeout(() => setSaved(false), 2600);
  };

  const handleUrlSave = () => {
    setUrlSaved(true); setUrlDirty(false);
    setTimeout(() => setUrlSaved(false), 2600);
    // The URL change takes effect on the next page reload because axios
    // reads process.env at bundle time — inform the user of this.
  };

  const handleNav = label => {
    if (label === "Logout") { setShowLogout(true); return; }
    setActiveNav(label);
    if (onNav) onNav(label);
  };

  const handleLogoutConfirm = () => {
    setShowLogout(false);
    logout();
    setName(""); setEmail(""); setDirty(false); setSaved(false);
    if (onNav) onNav("__logout__");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="st-root">
        <CircuitBg />
        <div className="st-orb st-orb--tr" />
        <div className="st-orb st-orb--bl" />
        <div className="st-orb st-orb--c"  />

        {/* Sidebar */}
        <aside className="st-sidebar">
          <div className="st-sidebar__logo">
            <div className="st-logo-badge"><span>ATG+</span></div>
            <span className="st-logo-name">AutoTestGen+</span>
          </div>
          <nav className="st-sidebar__nav">
            {navLinks.map(n => (
              <button key={n.label}
                className={`st-nav-item${activeNav === n.label ? " st-nav-item--active" : ""}`}
                onClick={() => handleNav(n.label)}>
                <span className="st-nav-item__icon">{n.icon}</span>
                <span className="st-nav-item__label">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="st-sidebar__user">
            <div className="st-user-avatar">
              {initials || <span style={{ fontSize: 15, opacity: .35 }}>?</span>}
            </div>
            <span className="st-user-name" style={{ opacity: name ? 1 : .35 }}>
              {name || "Your Name"}
            </span>
          </div>
        </aside>

        {/* Main */}
        <main className="st-main">
          <div className="st-header">
            <h1 className="st-header__title">Settings</h1>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-b)', marginTop: 3 }}>
              Profile, pipeline preferences and system configuration
            </div>
          </div>

          <div className="st-layout">

            {/* ── Left column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Profile */}
              <div className="st-card" style={{ animationDelay: '0.05s' }}>
                <div className="st-card__title">👤 Profile</div>
                <div className="st-card__sub">Your display name and email are shown across all modes</div>

                <div className="st-field">
                  <label className="st-field__label">Full Name</label>
                  <input className="st-input" value={name}
                    onChange={e => change(setName)(e.target.value)}
                    placeholder="Enter your full name…" />
                </div>

                <div className="st-field">
                  <label className="st-field__label">Email</label>
                  <input className="st-input" type="email" value={email}
                    onChange={e => change(setEmail)(e.target.value)}
                    placeholder="Enter your email address…" />
                </div>

                <div className="st-save-row">
                  <button className="st-save-btn" onClick={handleSave} disabled={!dirty}>
                    💾 Save Profile
                  </button>
                  {saved && <span className="st-saved-badge">✓ Saved!</span>}
                </div>

                <div className="user-strip">
                  <div className="user-strip__dot" />
                  <span className="user-strip__label">Logged in as:</span>
                  {name.trim()
                    ? <span className="user-strip__name">{name.trim()}</span>
                    : <span className="user-strip__empty">Enter your name above and save</span>}
                </div>
              </div>

              {/* Pipeline Preferences */}
              <div className="st-card" style={{ animationDelay: '0.1s' }}>
                <div className="st-card__title">⚙ Pipeline Preferences</div>
                <div className="st-card__sub">Controls how the AI pipeline behaves across modes</div>

                {/* Default diagram type */}
                <div className="st-field">
                  <label className="st-field__label">Default Diagram Type (Developer Mode)</label>
                  <select className="st-input st-select"
                    value={defaultDiagram}
                    onChange={e => setDefaultDiagram(e.target.value)}>
                    <option>Flowchart</option>
                    <option>Use Case</option>
                    <option>Both</option>
                  </select>
                  <div className="st-field__hint">
                    The diagram type the LLM will prioritise when generating UML outputs.
                  </div>
                </div>

                <div className="st-prefs-label">Display Options</div>

                <div className="st-pref-row">
                  <div className="st-pref-row__info">
                    <span className="st-pref-row__name">Auto-advance Pipeline</span>
                    <span className="st-pref-row__desc">Show RA banner in Dev / Tester modes when RA data is ready</span>
                  </div>
                  <div className="st-pref-right">
                    <Toggle on={autoAdvance} onChange={setAutoAdvance} />
                    <span className={`st-toggle-lbl st-toggle-lbl--${autoAdvance ? "on" : "off"}`}>
                      {autoAdvance ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                <div className="st-pref-row" style={{ borderBottom: 'none' }}>
                  <div className="st-pref-row__info">
                    <span className="st-pref-row__name">Show Mermaid Source by Default</span>
                    <span className="st-pref-row__desc">Open diagrams in code view instead of rendered SVG</span>
                  </div>
                  <div className="st-pref-right">
                    <Toggle on={showRawMermaid} onChange={setShowRawMermaid} />
                    <span className={`st-toggle-lbl st-toggle-lbl--${showRawMermaid ? "on" : "off"}`}>
                      {showRawMermaid ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Right column ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Current Session Summary */}
              <div className="st-card" style={{ animationDelay: '0.08s' }}>
                <div className="st-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  📊 Current Session
                  {pipelineComplete && (
                    <span style={{
                      background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)',
                      color: '#4ade80', borderRadius: 6, padding: '1px 8px', fontSize: 10,
                      fontFamily: 'var(--font-d)', fontWeight: 700
                    }}>Pipeline Complete</span>
                  )}
                </div>
                <div className="st-card__sub">Live output counts from the current pipeline run</div>

                <div className="st-stat-grid">
                  <StatCell label="Functional Reqs"     value={raFR.length}              color="#4fc3f7" />
                  <StatCell label="Non-Functional Reqs" value={raNFR.length}             color="#38bdf8" />
                  <StatCell label="User Stories"        value={stories.length}           color="#4fc3f7" />
                  <StatCell label="RTM Rows"            value={rtmRows.length}           color="#38bdf8" />
                  <StatCell label="Unit Tests"          value={devUnitTests.length}      color="#a78bfa" />
                  <StatCell label="UML Diagrams"        value={devUml.length}            color="#c084fc" />
                  <StatCell label="Risk Tasks"          value={devTechPlan.length}       color="#a78bfa" />
                  <StatCell label="Manual Tests"        value={testerManualTests.length} color="#4ade80" />
                  <StatCell label="Log Issues"
                    value={testerLogAnalysis?.issues?.length ?? 0}
                    color="#fb923c" />
                  <StatCell label="Open Bugs"           value={openBugs}
                    color={openBugs > 0 ? '#f87171' : '#4ade80'} />
                </div>

                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-b)', marginBottom: 10 }}>
                    Clear outputs generated in this session only. Your previously saved data in storage is not affected — it will be restored when you reopen the app.
                  </div>
                  <button className="st-reset-btn" onClick={() => setShowReset(true)}>
                    ↺ Clear Current Session
                  </button>
                </div>
              </div>

              {/* AI Model Info */}
              <div className="st-card" style={{ animationDelay: '0.12s' }}>
                <div className="st-card__title">🤖 AI Model</div>
                <div className="st-card__sub">LLM configuration used by all pipeline agents</div>

                {[
                  { label: 'Model',       value: 'Llama 3.3 70B Versatile' },
                  { label: 'Provider',    value: 'Groq API' },
                  { label: 'Framework',   value: 'LangGraph + LangChain' },
                  { label: 'Temperature', value: '0 (deterministic)' },
                  { label: 'Embeddings',  value: 'all-MiniLM-L6-v2 (HuggingFace)' },
                  { label: 'Vector DB',   value: 'ChromaDB (local)' },
                ].map(r => (
                  <div key={r.label} className="st-info-row">
                    <span className="st-info-row__label">{r.label}</span>
                    <span className="st-info-row__value">{r.value}</span>
                  </div>
                ))}
              </div>

              {/* System / Backend */}
              <div className="st-card" style={{ animationDelay: '0.16s' }}>
                <div className="st-card__title">🔌 System</div>
                <div className="st-card__sub">Backend connection and runtime info</div>

                {/* Health status */}
                <div className="st-health-row">
                  <div className="st-health-dot-wrap">
                    <div className={`st-health-dot ${
                      apiHealthy === true  ? 'st-health-dot--up' :
                      apiHealthy === false ? 'st-health-dot--down' : 'st-health-dot--checking'
                    }`} />
                    <span className="st-health-label">
                      {apiHealthy === true  ? 'Backend online' :
                       apiHealthy === false ? 'Backend offline' : 'Checking…'}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-b)' }}>
                    FastAPI / Python
                  </span>
                </div>

                {/* Backend URL (read-only — informational) */}
                <div className="st-field" style={{ marginTop: 12 }}>
                  <label className="st-field__label">Backend API URL</label>
                  <input className="st-input st-token-field"
                    value={backendUrl}
                    onChange={e => { setBackendUrl(e.target.value); setUrlDirty(true); setUrlSaved(false); }}
                    placeholder="http://localhost:8000/api/v1" />
                  <div className="st-field__hint">
                    Changing this takes effect after rebuilding the frontend (.env REACT_APP_API_URL).
                  </div>
                </div>

                {/* App info rows */}
                {[
                  { label: 'App Version',  value: '1.0.0' },
                  { label: 'Frontend',     value: 'React 19 + CRA' },
                  { label: 'Database',     value: 'SQLite (autotestgen.db)' },
                  { label: 'Auth',         value: 'Token-based (UUID + pbkdf2)' },
                ].map(r => (
                  <div key={r.label} className="st-info-row">
                    <span className="st-info-row__label">{r.label}</span>
                    <span className="st-info-row__value">{r.value}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </main>
      </div>

      {showLogout && <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogout(false)} />}
      {showReset  && <ResetModal  onConfirm={() => { clearSessionState(); setShowReset(false); }} onCancel={() => setShowReset(false)} />}
    </>
  );
}
