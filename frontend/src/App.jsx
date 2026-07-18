import { useState, useEffect } from "react";
import "./App.css";
import apiClient from "./api/client";
import { useAppContext } from "./AppContext";

import LoginPage             from "./loginpage";
import SignupPage            from "./signup";
import Dashboard             from "./dashboard";
import DeveloperMode         from "./developermode";
import TesterMode            from "./testermode";
import RequirementAnalysis   from "./requriementanalysis";
import Setting               from "./setting";

export default function App() {
  const [page, setPage] = useState("Login");
  const { user, logout } = useAppContext();

  useEffect(() => {
    apiClient.getHealth().catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setPage("Dashboard");
    }
  }, [user]);

  const handleNav = (label) => {
    if (label === "Logout" || label === "__logout__") {
      logout();
      setPage("Login");
      return;
    }
    const valid = [
      "Dashboard", "Developer Mode", "Tester Mode",
      "Requirement Analysis Mode", "Settings"
    ];
    if (valid.includes(label)) setPage(label);
  };

  if (page === "Login") {
    return (
      <LoginPage
        onLogin={() => setPage("Dashboard")}
        onSignup={() => setPage("Signup")}
      />
    );
  }

  if (page === "Signup") {
    return (
      <SignupPage
        onSignup={() => setPage("Dashboard")}
        onLogin={() => setPage("Login")}
      />
    );
  }

  const PAGES = {
    "Dashboard":                 Dashboard,
    "Developer Mode":            DeveloperMode,
    "Tester Mode":               TesterMode,
    "Requirement Analysis Mode": RequirementAnalysis,
    "Settings":                  Setting,
  };

  const PageComponent = PAGES[page] || Dashboard;

  return (
    <div className="app-fade-in">
      <PageComponent onNav={handleNav} />
    </div>
  );
}