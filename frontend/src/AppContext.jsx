import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "./api/client";

const AppContext = createContext(null);

// ── localStorage keys ─────────────────────────────────────────────────────────
const KEY_USER    = "atg_user";
const KEY_TOKEN   = "atg_token";
// Per-user keys — scoped so userA's data never bleeds into userB's
const usageKey    = uid => `atg_usage_${uid || "anon"}`;
const outputsKey  = uid => `atg_outputs_${uid || "anon"}`;

// ── localStorage helpers ──────────────────────────────────────────────────────
const lsGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};

const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn("localStorage write failed", e); }
};

const lsDel = key => { try { localStorage.removeItem(key); } catch {} };

// ── Default shapes ────────────────────────────────────────────────────────────
const DEFAULT_USAGE = { ra: [], dev: [], tester: [] };

const DEFAULT_OUTPUTS = {
  // RA
  raRequirements: null,
  raUserStories:  [],
  raRtm:          null,
  raFlowResult:   null,
  raUploadedFile: null,
  raStoryText:    "",
  // Dev
  devUnitTests:    [],
  devUml:          [],
  devTechPlan:     [],
  devCodeContent:  "",
  devUploadedFile: null,
  // Tester
  testerManualTests: [],
  testerLogAnalysis: null,
  testerLogContent:  "",
  // Bug tracking — shared between Tester (reports) and Developer (resolves)
  // Each bug: { id, title, type, priority, relatedTestId, description,
  //             status, reportedAt, resolvedAt, resolutionNote }
  testerBugs: [],
};

// ── Stored user reader ────────────────────────────────────────────────────────
const readStoredUser = () => lsGet(KEY_USER, null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AppContextProvider({ children }) {

  // Auth
  const [user,       setUser]       = useState(() => readStoredUser());
  const [token,      setToken]      = useState(() => localStorage.getItem(KEY_TOKEN) || null);
  const [project,    setProject]    = useState(null);
  const [apiHealthy, setApiHealthy] = useState(null);

  const userId = user?.id || user?.email || null;

  // ── Usage — load from localStorage keyed by user ─────────────────────────
  const [usageRA,      setUsageRA]      = useState(() => lsGet(usageKey(userId), DEFAULT_USAGE).ra      || []);
  const [usageDev,     setUsageDev]     = useState(() => lsGet(usageKey(userId), DEFAULT_USAGE).dev     || []);
  const [usageTester,  setUsageTester]  = useState(() => lsGet(usageKey(userId), DEFAULT_USAGE).tester  || []);

  // ── Outputs — load from localStorage keyed by user ───────────────────────
  const savedOutputs = lsGet(outputsKey(userId), DEFAULT_OUTPUTS);

  const [raRequirements,    setRaRequirements]    = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).raRequirements);
  const [raUserStories,     setRaUserStories]     = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).raUserStories     || []);
  const [raRtm,             setRaRtm]             = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).raRtm);
  const [raFlowResult,      setRaFlowResult]      = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).raFlowResult);
  const [raUploadedFile,    setRaUploadedFile]    = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).raUploadedFile);
  const [raStoryText,       setRaStoryText]       = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).raStoryText       || "");
  const [devUnitTests,      setDevUnitTests]      = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).devUnitTests      || []);
  const [devUml,            setDevUml]            = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).devUml            || []);
  const [devTechPlan,       setDevTechPlan]       = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).devTechPlan       || []);
  const [devCodeContent,    setDevCodeContent]    = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).devCodeContent    || "");
  const [devUploadedFile,   setDevUploadedFile]   = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).devUploadedFile);
  const [testerManualTests, setTesterManualTests] = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).testerManualTests || []);
  const [testerLogAnalysis, setTesterLogAnalysis] = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).testerLogAnalysis);
  const [testerLogContent,  setTesterLogContent]  = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).testerLogContent  || "");
  const [testerBugs,        setTesterBugs]        = useState(() => lsGet(outputsKey(userId), DEFAULT_OUTPUTS).testerBugs        || []);

  // ── Health check ──────────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.getHealth()
      .then(() => setApiHealthy(true))
      .catch(() => setApiHealthy(false));
  }, []);

  // ── Persist auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) localStorage.setItem(KEY_TOKEN, token);
    else       lsDel(KEY_TOKEN);
  }, [token]);

  useEffect(() => {
    if (user) lsSet(KEY_USER, user);
    else      lsDel(KEY_USER);
  }, [user]);

  // ── Persist usage to localStorage whenever it changes ────────────────────
  useEffect(() => {
    if (!userId) return;
    lsSet(usageKey(userId), { ra: usageRA, dev: usageDev, tester: usageTester });
  }, [usageRA, usageDev, usageTester, userId]);

  // ── Persist outputs to localStorage whenever they change ─────────────────
  useEffect(() => {
    if (!userId) return;
    lsSet(outputsKey(userId), {
      raRequirements, raUserStories, raRtm, raFlowResult, raUploadedFile, raStoryText,
      devUnitTests, devUml, devTechPlan, devCodeContent, devUploadedFile,
      testerManualTests, testerLogAnalysis, testerLogContent, testerBugs,
    });
  }, [
    userId,
    raRequirements, raUserStories, raRtm, raFlowResult, raUploadedFile, raStoryText,
    devUnitTests, devUml, devTechPlan, devCodeContent, devUploadedFile,
    testerManualTests, testerLogAnalysis, testerLogContent, testerBugs,
  ]);

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const login = (userData, authToken) => {
    const uid = userData?.id || userData?.email || null;
    // Reload persisted data for this user on login
    const savedUsage   = lsGet(usageKey(uid),   DEFAULT_USAGE);
    const savedOutputs = lsGet(outputsKey(uid), DEFAULT_OUTPUTS);

    setUser(userData || null);
    setToken(authToken || null);

    // Restore usage
    setUsageRA(savedUsage.ra       || []);
    setUsageDev(savedUsage.dev     || []);
    setUsageTester(savedUsage.tester || []);

    // Restore outputs
    setRaRequirements(savedOutputs.raRequirements    ?? null);
    setRaUserStories(savedOutputs.raUserStories      || []);
    setRaRtm(savedOutputs.raRtm                      ?? null);
    setRaFlowResult(savedOutputs.raFlowResult        ?? null);
    setRaUploadedFile(savedOutputs.raUploadedFile    ?? null);
    setRaStoryText(savedOutputs.raStoryText          || "");
    setDevUnitTests(savedOutputs.devUnitTests        || []);
    setDevUml(savedOutputs.devUml                    || []);
    setDevTechPlan(savedOutputs.devTechPlan          || []);
    setDevCodeContent(savedOutputs.devCodeContent    || "");
    setDevUploadedFile(savedOutputs.devUploadedFile  ?? null);
    setTesterManualTests(savedOutputs.testerManualTests || []);
    setTesterLogAnalysis(savedOutputs.testerLogAnalysis ?? null);
    setTesterLogContent(savedOutputs.testerLogContent   || "");
    setTesterBugs(savedOutputs.testerBugs               || []);
  };

  // Logout: clear React state + auth keys, but KEEP usage and outputs in
  // localStorage so they're restored when the user logs back in.
  const logout = () => {
    setUser(null);
    setToken(null);
    setProject(null);
    setApiHealthy(null);
    // Reset in-memory state to defaults (localStorage remains intact)
    _clearOutputsState();
  };

  // ── Clear helpers ─────────────────────────────────────────────────────────

  // Clears only React state (used on logout and on new file upload).
  // Does NOT touch localStorage — data is restored when the user logs back in.
  const _clearOutputsState = () => {
    setRaRequirements(null); setRaUserStories([]); setRaRtm(null);
    setRaFlowResult(null); setRaUploadedFile(null); setRaStoryText("");
    setDevUnitTests([]); setDevUml([]); setDevTechPlan([]);
    setDevCodeContent(""); setDevUploadedFile(null);
    setTesterManualTests([]); setTesterLogAnalysis(null); setTesterLogContent("");
    setTesterBugs([]);
  };

  // Called when a new file is uploaded — wipes outputs (but NOT usage history).
  const clearAllOutputs = () => {
    _clearOutputsState();
    if (userId) lsDel(outputsKey(userId));
  };

  // Called by the dashboard Reset button — wipes EVERYTHING for this user.
  const resetAll = () => {
    _clearOutputsState();
    setUsageRA([]); setUsageDev([]); setUsageTester([]);
    if (userId) {
      lsDel(outputsKey(userId));
      lsDel(usageKey(userId));
    }
  };

  // ── Context value ─────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    // auth
    user, token, project, apiHealthy,
    login, logout, setProject, setUser,

    // usage tracking
    usageRA,  setUsageRA,
    usageDev, setUsageDev,
    usageTester, setUsageTester,

    // RA outputs
    raRequirements,    setRaRequirements,
    raUserStories,     setRaUserStories,
    raRtm,             setRaRtm,
    raFlowResult,      setRaFlowResult,
    raUploadedFile,    setRaUploadedFile,
    raStoryText,       setRaStoryText,

    // Dev outputs
    devUnitTests,    setDevUnitTests,
    devUml,          setDevUml,
    devTechPlan,     setDevTechPlan,
    devCodeContent,  setDevCodeContent,
    devUploadedFile, setDevUploadedFile,

    // Tester outputs
    testerManualTests, setTesterManualTests,
    testerLogAnalysis, setTesterLogAnalysis,
    testerLogContent,  setTesterLogContent,
    testerBugs,        setTesterBugs,

    // helpers
    clearAllOutputs,
    resetAll,
    clearSessionState: _clearOutputsState,
  }), [
    user, token, project, apiHealthy,
    usageRA, usageDev, usageTester,
    raRequirements, raUserStories, raRtm, raFlowResult, raUploadedFile, raStoryText,
    devUnitTests, devUml, devTechPlan, devCodeContent, devUploadedFile,
    testerManualTests, testerLogAnalysis, testerLogContent, testerBugs,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppContextProvider");
  return context;
}
