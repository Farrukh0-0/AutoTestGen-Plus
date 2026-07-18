import { useState, useRef, useEffect, useCallback } from "react";
import "./requriementanalysis.css";
import apiClient from "./api/client";
import { useAppContext } from "./AppContext";

const CircuitBg = () => (
  <svg className="ra-circuit" viewBox="0 0 1400 900" xmlns="http://www.w3.org/2000/svg">
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



export default function RequirementAnalysisPreview({ onNav }) {
  const {
    user, project: sharedProject, logout,
    // persistent RA outputs from context
    raRequirements,    setRaRequirements,
    raUserStories,     setRaUserStories,
    raRtm,             setRaRtm,
    raFlowResult,      setRaFlowResult,
    raUploadedFile,    setRaUploadedFile,
    raStoryText,       setRaStoryText,
    clearAllOutputs,
    usageRA, setUsageRA,
  } = useAppContext();
  const sharedUser = user?.name || "";

  const [activeNav,    setActiveNav]    = useState("Requirement Analysis Mode");
  const [showLogout,   setShowLogout]   = useState(false);
  const [pendingFile,  setPendingFile]  = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [projects,     setProjects]     = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Aliases so all existing JSX below keeps working unchanged
  const storyText       = raStoryText;
  const setStoryText    = setRaStoryText;
  const uploadedFile    = raUploadedFile;
  const setUploadedFile = setRaUploadedFile;
  const result          = raFlowResult;
  const setResult       = setRaFlowResult;
  const functionalReqs  = raRequirements?.functionalRequirements    ?? [];
  const nonFunctionalReqs = raRequirements?.nonFunctionalRequirements ?? [];
  const userStories     = Array.isArray(raUserStories) ? raUserStories : [];
  const rtm             = raRtm;
  const setRtm          = setRaRtm;

  // Wrapped setters that sync to context
  const setFunctionalReqs = (fr) =>
    setRaRequirements(prev => ({ ...(prev || {}), functionalRequirements: fr }));
  const setNonFunctionalReqs = (nfr) =>
    setRaRequirements(prev => ({ ...(prev || {}), nonFunctionalRequirements: nfr }));
  const setUserStories = (s) => setRaUserStories(s);

  const fileRef = useRef();

  const initials = sharedUser.trim().split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiClient.listProjects();
      const raw = res?.data?.projects || [];
      const mapped = Array.isArray(raw)
        ? raw.map(p => ({ id: p.id || p.projectId || p._id, projectName: p.name || p.projectName || p.title || `Project ${p.id}`, description: p.description || "" }))
        : [];

      setProjects(mapped);
      if (mapped.length > 0 && !selectedProjectId) {
        const match = mapped.find(m => sharedProject && `${m.id}` === `${sharedProject.id}`);
        setSelectedProjectId(match ? match.id : mapped[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  }, [sharedProject, selectedProjectId]);

  const handleUpload = useCallback(file => {
    // New file → wipe all previous pipeline outputs across all modes
    clearAllOutputs();

    const extension = file.name.toLowerCase().split('.').pop();
    const isText = ['txt', 'md', 'text'].includes(extension) || file.type.startsWith('text/');
    setUploadedFile({ name: file.name, uploading: true, status: 'uploading' });

    if (isText) {
      const reader = new FileReader();
      reader.onload = e => setStoryText(e.target.result.trim());
      reader.onerror = () => setStoryText('');
      reader.readAsText(file);
    } else {
      setStoryText('');
    }

    (async () => {
      if (!selectedProjectId) {
        setPendingFile(file);
        setUploadedFile({ name: file.name, status: 'pending', error: false });
        return;
      }
      try {
        const resp = await apiClient.uploadDocument(selectedProjectId, file);
        const doc = resp?.data || resp;
        setUploadedFile({ id: doc.id || doc.documentId || doc.document_id, name: file.name, uploadedAt: doc.created_at || doc.uploadedAt, status: 'ready' });
        setPendingFile(null);
      } catch (err) {
        console.error('Upload failed', err);
        setUploadedFile({ name: file.name, status: 'failed', error: true });
      }
    })();
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (pendingFile && selectedProjectId) {
      const file = pendingFile;
      setPendingFile(null);
      handleUpload(file);
    }
  }, [pendingFile, selectedProjectId, handleUpload]);

  const buildFlowState = (stage) => {
    const defaultSteps = [
      { type: 'start', label: 'Requirements Uploaded' },
      { type: 'process', label: 'Extract Requirements' },
      { type: 'process', label: 'Generate Stories' },
      { type: 'process', label: 'Generate RTM' },
      { type: 'end', label: 'Complete' }
    ];

    if (stage === 'extract') {
      return {
        steps: [defaultSteps[0], defaultSteps[1], { type: 'end', label: 'Ready to Generate Stories' }],
        ambiguities: ['No ambiguities detected — requirements were extracted successfully.']
      };
    }

    if (stage === 'stories') {
      return {
        steps: [defaultSteps[0], defaultSteps[1], defaultSteps[2], { type: 'end', label: 'Ready to Generate RTM' }],
        ambiguities: ['No ambiguities detected — user stories generated successfully.']
      };
    }

    if (stage === 'rtm') {
      return {
        steps: defaultSteps,
        ambiguities: ['No ambiguities detected — traceability matrix generated successfully.']
      };
    }

    return null;
  };

  const handleExtractRequirements = async () => {
    if (!selectedProjectId || !uploadedFile?.id) {
      alert('Select a project and upload a document first.');
      return;
    }
    try {
      setLoading(true);
      const resp = await apiClient.extractRequirements(selectedProjectId, uploadedFile.id);
      const fr = resp?.data?.functional_requirements || resp?.data?.functionalRequirements || [];
      const nfr = resp?.data?.non_functional_requirements || resp?.data?.nonFunctionalRequirements || [];
      setFunctionalReqs(fr);
      setNonFunctionalReqs(nfr);
      setResult(buildFlowState('extract'));
      // Record usage
      setUsageRA(prev => [...prev, {
        file: uploadedFile?.name || 'Unknown file',
        timestamp: new Date().toISOString(),
        outputCounts: { fr: fr.length, nfr: nfr.length },
      }]);
    } catch (err) {
      console.error('Extract failed', err);
      const message = err?.response?.data?.detail || err?.message || String(err);
      alert(`Requirement extraction failed: ${message}`);
    } finally { setLoading(false); }
  };

  const handleGenerateStories = async () => {
    if (!selectedProjectId || functionalReqs.length === 0) {
      alert('No functional requirements to generate stories from.');
      return;
    }
    try {
      setLoading(true);
      const resp = await apiClient.generateStories(selectedProjectId, functionalReqs);
      const stories = resp?.data?.user_stories || resp?.data?.userStories || [];
      setUserStories(stories);
      setResult(buildFlowState('stories'));
    } catch (err) {
      console.error('Generate stories failed', err);
      const message = err?.response?.data?.detail || err?.message || String(err);
      alert(`Story generation failed: ${message}`);
    } finally { setLoading(false); }
  };

  const handleGenerateRTM = async () => {
    if (!selectedProjectId) return alert('Select a project first');
    if (functionalReqs.length === 0) return alert('No requirements available to generate RTM.');
    if (userStories.length === 0) return alert('Generate user stories before creating the RTM.');
    try {
      setLoading(true);
      const resp = await apiClient.generateRTM(selectedProjectId, functionalReqs, nonFunctionalReqs, userStories);
      const matrix = resp?.data?.traceability_matrix || resp?.data?.traceabilityMatrix || [];
      setRtm(matrix);
      setResult(buildFlowState('rtm'));
    } catch (err) {
      console.error('Generate RTM failed', err);
      alert('RTM generation failed');
    } finally { setLoading(false); }
  };

  const renderRequirement = (req) => {
    if (typeof req === 'string') return req;
    if (!req) return '';
    const id = req.id || req.requirement_id || req.req_id || req.type || '';
    const description = req.description || req.req_description || req.requirement || req.label || JSON.stringify(req);
    return `${id}${id ? ': ' : ''}${description}`;
  };

  const renderStory = (story) => {
    if (typeof story === 'string') return story;
    if (!story) return '';
    const title = story.story || story.story_text || story.description || JSON.stringify(story);
    const storyId = story.id || story.story_id || story.related_req_id || '';
    const storyIdText = storyId ? `${storyId} ` : '';
    const criteria = Array.isArray(story.acceptance_criteria) ? story.acceptance_criteria.join(' ; ') : story.acceptance_criteria || '';
    return `${storyIdText}${title}${criteria ? ` — AC: ${criteria}` : ''}`;
  };

  const renderRTMRequirement = (row) => {
    if (!row) return '';
    if (typeof row === 'string') return row;
    if (Array.isArray(row)) return renderRTMRequirement(row[0]);
    return row.req_description || row.requirement || row.req || row.req_id || '';
  };

  const renderRTMStories = (row) => {
    if (!row) return '';
    if (typeof row === 'string') return row;
    if (Array.isArray(row)) return renderRTMStories(row[1] || row[0]);
    const story = row.user_story_id || row.user_story_desc || row.story_id || row.user_story || '';
    const status = row.status ? ` (${row.status})` : '';
    return story ? `${story}${status}` : status.trim();
  };

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

  return (
    <>
      <div className="ra-root">
        <CircuitBg />
        <div className="ra-orb ra-orb--tr" />
        <div className="ra-orb ra-orb--bl" />
        <div className="ra-orb ra-orb--c"  />

     
        <aside className="ra-sidebar">
          <div className="ra-sidebar__logo">
            <div className="ra-logo-badge"><span>ATG+</span></div>
            <span className="ra-logo-name">AutoTestGen+</span>
          </div>
          <nav className="ra-sidebar__nav">
            {navLinks.map(n => (
              <button key={n.label}
                className={`ra-nav-item${activeNav === n.label ? " ra-nav-item--active" : ""}`}
                onClick={() => handleNav(n.label)}>
                <span className="ra-nav-item__icon">{n.icon}</span>
                <span className="ra-nav-item__label">{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="ra-sidebar__user">
            <div className="ra-user-avatar">
              {initials || <span style={{ fontSize: 15, opacity: .3 }}>?</span>}
            </div>
            <span className="ra-user-name" style={{ opacity: sharedUser ? 1 : .35 }}>
              {sharedUser || "Your Name"}
            </span>
          </div>
        </aside>

        
        <main className="ra-main">
          <div className="ra-header">
            <h1 className="ra-header__title" style={{ margin: 0 }}>
              Requirement Analysis Mode
            </h1>
          </div>

          <div className="ra-grid2">
            
            <div className="ra-card" style={{ animationDelay: "0.05s", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="ra-card__title">Requirement Gathering</div>

              <div className="ra-input-row">
                <input className="ra-input" style={{ flex: 1 }}
                  placeholder="Upload a file or type your requirements here…"
                  value={uploadedFile ? uploadedFile.name : storyText}
                  readOnly={!!uploadedFile}
                  onChange={e => !uploadedFile && setStoryText(e.target.value)} />
                <button className="ra-btn ra-btn--accent ra-btn--sm" onClick={() => fileRef.current.click()}>
                  ↑ Upload
                </button>
                {uploadedFile && (
                  <button className="ra-btn ra-btn--ghost ra-btn--sm"
                    style={{ color: 'rgba(248,113,113,.7)', borderColor: 'rgba(248,113,113,.25)' }}
                    onClick={() => { setUploadedFile(null); setStoryText(''); }}
                    title="Remove file">✕</button>
                )}
                <input ref={fileRef} type="file" accept=".txt,.md,.text,.pdf,.docx"
                  style={{ display: "none" }} onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ra-btn ra-btn--ghost" onClick={handleExtractRequirements} disabled={loading || !uploadedFile?.id || !selectedProjectId}>Extract Requirements</button>
                <button className="ra-btn ra-btn--ghost" onClick={handleGenerateStories} disabled={loading || functionalReqs.length === 0}>Generate Stories</button>
                <button className="ra-btn ra-btn--ghost" onClick={handleGenerateRTM} disabled={loading || userStories.length === 0}>Generate RTM</button>
              </div>

              
              <div className="user-strip">
                <div className="user-strip__dot" />
                <span className="user-strip__label">Owner:</span>
                {sharedUser
                  ? <span className="user-strip__name">{sharedUser}</span>
                  : <span className="user-strip__empty">Set name in Settings</span>}
              </div>
            </div>

            
            <div className="ra-card" style={{ animationDelay: "0.15s" }}>
              <div className="ra-card__title">Identify Key Elements</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div className="ra-key-section__lbl">Functional Requirements</div>
                  {functionalReqs.length === 0
                    ? <div style={{ color: 'var(--muted)', fontSize: 12 }}>No functional requirements extracted yet.</div>
                    : <ul style={{ paddingLeft: 16 }}>{functionalReqs.map((f, i) => <li key={i} style={{ marginBottom: 6 }}>{renderRequirement(f)}</li>)}</ul>}
                </div>

                <div>
                  <div className="ra-key-section__lbl">Non-Functional Requirements</div>
                  {nonFunctionalReqs.length === 0
                    ? <div style={{ color: 'var(--muted)', fontSize: 12 }}>No non-functional requirements extracted yet.</div>
                    : <ul style={{ paddingLeft: 16 }}>{nonFunctionalReqs.map((f, i) => <li key={i} style={{ marginBottom: 6 }}>{renderRequirement(f)}</li>)}</ul>}
                </div>
              </div>
            </div>

          </div>

            <div className="ra-card" style={{ animationDelay: "0.25s" }}>
              <div className="ra-card__title">User Stories</div>
              {userStories.length === 0
                ? <div style={{ color: 'var(--muted)', padding: 12 }}>No user stories generated yet.</div>
                : <ul style={{ paddingLeft: 16 }}>{userStories.map((s, i) => <li key={i} style={{ marginBottom: 12 }}>{renderStory(s)}</li>)}</ul>}
            </div>

            <div className="ra-card" style={{ animationDelay: "0.3s" }}>
              <div className="ra-card__title">Traceability Matrix (RTM)</div>
              {(!rtm || rtm.length === 0)
                ? <div style={{ color: 'var(--muted)', padding: 12 }}>RTM will appear here after generation.</div>
                : (
                  <div style={{ maxHeight: 240, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr><th style={{ textAlign: 'left', padding: 6 }}>Requirement</th><th style={{ textAlign: 'left', padding: 6 }}>Mapped Stories</th></tr>
                      </thead>
                        <tbody>
                        {rtm.map((r, i) => (
                          <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                            <td style={{ padding: 6, verticalAlign: 'top' }}>{renderRTMRequirement(r)}</td>
                            <td style={{ padding: 6 }}>{renderRTMStories(r)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
        </main>
      </div>

      {showLogout && <LogoutModal onConfirm={handleLogoutConfirm} onCancel={() => setShowLogout(false)} />}
    </>
  );
}