import { useState, useEffect } from "react";
import "./dashboard.css";
import apiClient from "./api/client";
import { useAppContext } from "./AppContext";

// ── helpers ───────────────────────────────────────────────────────────────────

const CircuitBg = () => (
  <svg className="db-circuit" viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
    <line x1="0"   y1="120" x2="300"  y2="120" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300" y1="120" x2="300"  y2="220" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300" y1="220" x2="580"  y2="220" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="300" cy="120" r="4" fill="#4fc3f7"/>
    <circle cx="580" cy="220" r="4" fill="#4fc3f7"/>
    <line x1="1000" y1="60" x2="1400" y2="60" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="1000" y1="60" x2="1000" y2="280" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="1000" cy="60" r="4" fill="#4fc3f7"/>
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

// Animated counter
const Counter = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const step = Math.ceil(value / 20);
    const t = setInterval(() => {
      start = Math.min(start + step, value);
      setDisplay(start);
      if (start >= value) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <span>{display}</span>;
};

// Mini bar for usage count
const UsageBar = ({ value, max, color }) => (
  <div className="db-ubar-track">
    <div className="db-ubar-fill" style={{
      width: max > 0 ? `${Math.round((value / max) * 100)}%` : '0%',
      background: color,
      boxShadow: `0 0 6px ${color}88`,
    }} />
  </div>
);

// Timestamp formatter
const fmtTime = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Pipeline stage dot
const StageDot = ({ done, label }) => (
  <div className="db-stage">
    <div className={`db-stage-dot ${done ? 'db-stage-dot--on' : 'db-stage-dot--off'}`} />
    <span className={`db-stage-lbl ${done ? 'db-stage-lbl--on' : ''}`}>{label}</span>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

// Reset confirmation modal
const ResetModal = ({ onConfirm, onCancel }) => (
  <div className="logout-overlay" onClick={onCancel}>
    <div className="logout-modal" onClick={e => e.stopPropagation()}>
      <div className="logout-modal__title">Reset All Data?</div>
      <p className="logout-modal__body">
        This will clear all mode outputs, usage history, and file records for your account.
        This cannot be undone.
      </p>
      <div className="logout-modal__btns">
        <button className="logout-btn-yes" onClick={onConfirm}>Reset Everything</button>
        <button className="logout-btn-no"  onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

export default function Dashboard({ onNav }) {
  const {
    user, project: sharedProject, setProject, logout,
    resetAll,
    // usage tracking
    usageRA, usageDev, usageTester,
    // current session outputs (for pipeline status + summaries)
    raRequirements, raUserStories, raRtm,
    raUploadedFile,
    devUnitTests, devUml, devTechPlan, devUploadedFile,
    testerManualTests, testerLogAnalysis,
  } = useAppContext();

  const [activeNav,   setActiveNav]   = useState("Dashboard");
  const [showLogout,  setShowLogout]  = useState(false);
  const [showReset,   setShowReset]   = useState(false);
  const [projects,    setProjects]    = useState([]);

  const displayUser = user?.name || "";
  const initials    = displayUser.trim().split(" ").filter(Boolean)
    .map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // ── Derived counts ────────────────────────────────────────────────────────
  const raFR    = raRequirements?.functionalRequirements    || [];
  const raNFR   = raRequirements?.nonFunctionalRequirements || [];
  const stories = Array.isArray(raUserStories) ? raUserStories : [];
  const rtmRows = Array.isArray(raRtm) ? raRtm : [];

  // Pipeline stages
  const stageExtract = raFR.length > 0 || raNFR.length > 0;
  const stageStories = stories.length > 0;
  const stageRtm     = rtmRows.length > 0;
  const stageDevDone = devUnitTests.length > 0 || devUml.length > 0 || devTechPlan.length > 0;
  const stageTesterDone = testerManualTests.length > 0;

  // Usage counts
  const maxUsage = Math.max(usageRA.length, usageDev.length, usageTester.length, 1);

  // Recent activity feed — merge all three usage arrays, sort newest first
  const activityFeed = [
    ...usageRA.map(e => ({ ...e, mode: 'RA', icon: '📋', color: '#4fc3f7' })),
    ...usageDev.map(e => ({ ...e, mode: 'Dev', icon: '⌨', color: '#a78bfa' })),
    ...usageTester.map(e => ({ ...e, mode: 'Tester', icon: '🧪', color: '#4ade80' })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 12);

  // Unique file names per mode (deduplicated)
  const raFiles  = [...new Set(usageRA.map(e => e.file).filter(Boolean))];
  const devFiles = [...new Set(usageDev.map(e => e.file).filter(Boolean))];
  const testerFiles = [...new Set(usageTester.map(e => e.file).filter(Boolean))];

  // ── fetch projects for selector ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.listProjects();
        const raw = res?.data?.projects || res?.data || [];
        const mapped = Array.isArray(raw)
          ? raw.map(p => ({ id: p.id, name: p.name || `Project ${p.id}` }))
          : [];
        setProjects(mapped);
        if (mapped.length > 0 && !sharedProject) {
          setProject({ id: mapped[0].id, projectName: mapped[0].name });
        }
      } catch (err) {
        console.error('Failed to fetch projects', err);
      }
    })();
  }, []);

  // ── nav ───────────────────────────────────────────────────────────────────
  const handleNav = label => {
    if (label === "Logout") { setShowLogout(true); return; }
    setActiveNav(label);
    if (onNav) onNav(label);
  };
  const handleLogoutConfirm = () => {
    setShowLogout(false); logout();
    if (onNav) onNav("__logout__");
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="db-root">
        <CircuitBg />
        <div className="db-orb db-orb--tr" />
        <div className="db-orb db-orb--bl" />
        <div className="db-orb db-orb--c"  />

        {/* ── Sidebar ── */}
        <aside className="db-sidebar">
          <div className="db-sidebar__logo">
            <div className="db-logo-badge"><span>ATG+</span></div>
            <span className="db-logo-name">AutoTestGen+</span>
          </div>
          <nav className="db-sidebar__nav">
            {navLinks.map(n => (
              <button key={n.label}
                className={`db-nav-item${activeNav === n.label ? " db-nav-item--active" : ""}`}
                onClick={() => handleNav(n.label)}>
                <span className="db-nav-item__icon">{n.icon}</span>
                <span className="db-nav-item__label">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="db-sidebar__user">
            <div className="db-user-avatar">
              {initials || <span style={{ fontSize: 15, opacity: .3 }}>?</span>}
            </div>
            <span className="db-user-name" style={{ opacity: displayUser ? 1 : .35 }}>
              {displayUser || "Your Name"}
            </span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="db-main">

          {/* Header */}
          <div className="db-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h1 className="db-header__title">
                Dashboard
                {displayUser && (
                  <span style={{ fontWeight: 400, opacity: .6, fontSize: 15 }}>
                    {' '}— welcome back, <span className="db-accent">{displayUser}</span>
                  </span>
                )}
              </h1>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-b)', marginTop: 3 }}>
                Your AutoTestGen+ session overview
              </div>
            </div>
            <button
              className="db-btn db-btn--ghost"
              style={{ fontSize: 11, color: 'rgba(248,113,113,.7)', borderColor: 'rgba(248,113,113,.25)', marginTop: 4 }}
              onClick={() => setShowReset(true)}
              title="Clear all outputs and usage history">
              🗑 Reset All Data
            </button>
          </div>

          {/* ── Row 1: Mode usage cards ── */}
          <div className="db-usage-row">

            {[
              {
                label: 'Requirement Analysis',
                icon: '📋', color: '#4fc3f7',
                count: usageRA.length,
                files: raFiles,
                sub: usageRA.length > 0
                  ? `Last: ${fmtTime(usageRA[usageRA.length - 1]?.timestamp)}`
                  : 'Not used yet this session',
                outputs: usageRA.length > 0 ? [
                  `${usageRA.reduce((s,e) => s + (e.outputCounts?.fr||0), 0)} Functional Reqs`,
                  `${usageRA.reduce((s,e) => s + (e.outputCounts?.nfr||0), 0)} Non-Functional Reqs`,
                ] : [],
              },
              {
                label: 'Developer Mode',
                icon: '⌨', color: '#a78bfa',
                count: usageDev.length,
                files: devFiles,
                sub: usageDev.length > 0
                  ? `Last: ${fmtTime(usageDev[usageDev.length - 1]?.timestamp)}`
                  : 'Not used yet this session',
                outputs: usageDev.length > 0 ? [
                  `${usageDev.reduce((s,e) => s + (e.outputCounts?.unitTests||0), 0)} Unit Tests`,
                  `${usageDev.reduce((s,e) => s + (e.outputCounts?.diagrams||0), 0)} Diagrams`,
                  `${usageDev.reduce((s,e) => s + (e.outputCounts?.tasks||0), 0)} Risk Tasks`,
                ] : [],
              },
              {
                label: 'Tester Mode',
                icon: '🧪', color: '#4ade80',
                count: usageTester.length,
                files: testerFiles,
                sub: usageTester.length > 0
                  ? `Last: ${fmtTime(usageTester[usageTester.length - 1]?.timestamp)}`
                  : 'Not used yet this session',
                outputs: usageTester.length > 0 ? [
                  `${usageTester.reduce((s,e) => s + (e.outputCounts?.manualTests||0), 0)} Manual Tests`,
                ] : [],
              },
            ].map(m => (
              <div key={m.label} className="db-usage-card">
                {/* Top row */}
                <div className="db-usage-card__top">
                  <span className="db-usage-card__icon" style={{ color: m.color }}>{m.icon}</span>
                  <div>
                    <div className="db-usage-card__label">{m.label}</div>
                    <div className="db-usage-card__sub">{m.sub}</div>
                  </div>
                  <div className="db-usage-card__count" style={{ color: m.color }}>
                    <Counter value={m.count} />
                    <span className="db-usage-card__count-lbl">uses</span>
                  </div>
                </div>

                {/* Bar */}
                <UsageBar value={m.count} max={maxUsage} color={m.color} />

                {/* Output totals */}
                {m.outputs.length > 0 && (
                  <div className="db-usage-card__outputs">
                    {m.outputs.map((o, i) => (
                      <span key={i} className="db-output-pill" style={{ borderColor: `${m.color}44`, color: m.color }}>
                        {o}
                      </span>
                    ))}
                  </div>
                )}

                {/* File history */}
                {m.files.length > 0 && (
                  <div className="db-file-list">
                    <div className="db-file-list__hdr">Files processed</div>
                    {m.files.map((f, i) => (
                      <div key={i} className="db-file-item">
                        <span className="db-file-item__icon">📄</span>
                        <span className="db-file-item__name">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Row 2: Pipeline status + Current session summary ── */}
          <div className="db-mid-row">

            {/* Pipeline status */}
            <div className="db-card" style={{ animationDelay: '.1s' }}>
              <div className="db-card__title">⚡ Pipeline Status</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-b)', marginBottom: 14 }}>
                Current session: RA → Developer → Tester
              </div>
              <div className="db-pipeline">

                <div className="db-pipeline-group">
                  <div className="db-pipeline-group__label" style={{ color: '#4fc3f7' }}>📋 RA Mode</div>
                  <StageDot done={!!raUploadedFile?.id} label="File uploaded" />
                  <StageDot done={stageExtract}         label="Requirements extracted" />
                  <StageDot done={stageStories}         label="User stories generated" />
                  <StageDot done={stageRtm}             label="RTM generated" />
                </div>

                <div className="db-pipeline-arrow">→</div>

                <div className="db-pipeline-group">
                  <div className="db-pipeline-group__label" style={{ color: '#a78bfa' }}>⌨ Dev Mode</div>
                  <StageDot done={devUnitTests.length > 0} label="Unit tests generated" />
                  <StageDot done={devUml.length > 0}       label="UML diagrams generated" />
                  <StageDot done={devTechPlan.length > 0}  label="Tech plan generated" />
                </div>

                <div className="db-pipeline-arrow">→</div>

                <div className="db-pipeline-group">
                  <div className="db-pipeline-group__label" style={{ color: '#4ade80' }}>🧪 Tester Mode</div>
                  <StageDot done={testerManualTests.length > 0}    label="Manual tests generated" />
                  <StageDot done={!!testerLogAnalysis}              label="Log analysis run" />
                </div>

              </div>
            </div>

            {/* Current session output summary */}
            <div className="db-card" style={{ animationDelay: '.15s' }}>
              <div className="db-card__title">📊 Session Output Summary</div>
              <div className="db-summary-grid">
                {[
                  { label: 'Functional Reqs',     val: raFR.length,              color: '#4fc3f7' },
                  { label: 'Non-Functional Reqs', val: raNFR.length,             color: '#38bdf8' },
                  { label: 'User Stories',         val: stories.length,           color: '#4fc3f7' },
                  { label: 'RTM Rows',             val: rtmRows.length,           color: '#38bdf8' },
                  { label: 'Unit Tests',           val: devUnitTests.length,      color: '#a78bfa' },
                  { label: 'UML Diagrams',         val: devUml.length,            color: '#c084fc' },
                  { label: 'Risk Tasks',           val: devTechPlan.length,       color: '#a78bfa' },
                  { label: 'Manual Test Cases',    val: testerManualTests.length, color: '#4ade80' },
                  { label: 'Log Issues Found',
                    val: testerLogAnalysis?.issues?.length ?? 0,                  color: '#fb923c' },
                  { label: 'Suite Health',
                    val: testerLogAnalysis ? `${testerLogAnalysis.health_score ?? '—'}/100` : '—',
                    color: testerLogAnalysis
                      ? (testerLogAnalysis.health_score >= 70 ? '#4ade80'
                       : testerLogAnalysis.health_score >= 40 ? '#fbbf24' : '#f87171')
                      : 'var(--muted)',
                    isStr: true },
                ].map(s => (
                  <div key={s.label} className="db-summary-cell">
                    <div className="db-summary-cell__val" style={{ color: s.color }}>
                      {s.isStr ? s.val : <Counter value={s.val} />}
                    </div>
                    <div className="db-summary-cell__lbl">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Row 3: Recent activity feed ── */}
          <div className="db-card" style={{ animationDelay: '.2s' }}>
            <div className="db-card__title">🕑 Recent Activity</div>
            {activityFeed.length === 0 ? (
              <div className="db-empty-msg">
                No activity yet. Use RA, Developer, or Tester mode to see your history here.
              </div>
            ) : (
              <div className="db-activity-list">
                {activityFeed.map((e, i) => (
                  <div key={i} className="db-activity-item">
                    <span className="db-activity-icon" style={{ color: e.color }}>{e.icon}</span>
                    <div className="db-activity-body">
                      <span className="db-activity-mode" style={{ color: e.color }}>{e.mode} Mode</span>
                      <span className="db-activity-file">— {e.file}</span>
                      {e.outputCounts && (
                        <span className="db-activity-counts">
                          {Object.entries(e.outputCounts)
                            .map(([k, v]) => `${v} ${k}`)
                            .join(' · ')}
                        </span>
                      )}
                    </div>
                    <span className="db-activity-time">{fmtTime(e.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Owner strip */}
          <div className="user-strip" style={{ paddingBottom: 4 }}>
            <div className="user-strip__dot" />
            <span className="user-strip__label">Logged in as:</span>
            {displayUser
              ? <span className="user-strip__name">{displayUser}</span>
              : <span className="user-strip__empty">Set name in Settings</span>}
          </div>

        </main>
      </div>

      {showReset  && <ResetModal  onConfirm={() => { resetAll(); setShowReset(false); }} onCancel={() => setShowReset(false)} />}
      {showLogout && <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogout(false)} />}
    </>
  );
}
