import { useState } from "react";
import "./signup.css";
import apiClient from "./api/client";
import { useAppContext } from "./AppContext";

const CircuitBackground = () => (
  <svg className="circuit-bg" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
    <line x1="0"    y1="120" x2="300"  y2="120" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300"  y1="120" x2="300"  y2="200" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="300"  y1="200" x2="550"  y2="200" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="300" cy="120" r="4" fill="#4fc3f7"/>
    <circle cx="550" cy="200" r="4" fill="#4fc3f7"/>
    <line x1="900"  y1="80"  x2="1200" y2="80"  stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="900"  y1="80"  x2="900"  y2="300" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="900" cy="80" r="4" fill="#4fc3f7"/>
    <line x1="1050" y1="300" x2="1200" y2="300" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="1050" y1="200" x2="1050" y2="400" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="1050" cy="300" r="5" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <line x1="0"   y1="400" x2="150"  y2="400" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="150" y1="400" x2="150"  y2="550" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="150" cy="400" r="4" fill="#4fc3f7"/>
    <line x1="150" y1="550" x2="400"  y2="550" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="400" cy="550" r="4" fill="#4fc3f7"/>
    <line x1="0"   y1="650" x2="250"  y2="650" stroke="#38bdf8" strokeWidth="1"/>
    <line x1="250" y1="650" x2="250"  y2="750" stroke="#38bdf8" strokeWidth="1"/>
    <line x1="800" y1="600" x2="1200" y2="600" stroke="#4fc3f7" strokeWidth="1.2"/>
    <line x1="800" y1="500" x2="800"  y2="700" stroke="#4fc3f7" strokeWidth="1.2"/>
    <circle cx="800"  cy="600" r="5" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <circle cx="80"   cy="200" r="6" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <circle cx="450"  cy="650" r="6" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <circle cx="1100" cy="500" r="6" fill="none" stroke="#4fc3f7" strokeWidth="1.5"/>
    <circle cx="200"  cy="750" r="3" fill="#38bdf8"/>
    <circle cx="700"  cy="100" r="3" fill="#38bdf8"/>
    <circle cx="1150" cy="150" r="3" fill="#38bdf8"/>
    <line x1="600" y1="700" x2="750" y2="700" stroke="#38bdf8" strokeWidth="1"/>
    <line x1="750" y1="700" x2="750" y2="780" stroke="#38bdf8" strokeWidth="1"/>
    <circle cx="750" cy="700" r="3" fill="#38bdf8"/>
    <line x1="50" y1="300" x2="50"  y2="500" stroke="#38bdf8" strokeWidth="1"/>
    <line x1="50" y1="300" x2="180" y2="300" stroke="#38bdf8" strokeWidth="1"/>
    <circle cx="50" cy="300" r="3" fill="#38bdf8"/>
  </svg>
);

const GlowOrbs = () => (
  <>
    <div className="glow-orb glow-orb--top-right" />
    <div className="glow-orb glow-orb--bottom-left" />
    <div className="glow-orb glow-orb--center" />
  </>
);

const InputField = ({ type = "text", placeholder, value, onChange }) => (
  <div className="input-wrapper">
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="input-field"
    />
  </div>
);

export default function AutoTestGenSignup({ onSignup, onLogin }) {
  const [form, setForm]     = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const { login } = useAppContext();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const password = form.password;

    if (!form.name.trim())                errs.name     = "Full name is required.";
    if (!emailRegex.test(form.email.trim())) errs.email  = "Please enter a valid email address.";
    if (password.length < 8)              errs.password = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(password))     errs.password = "Password must include at least one uppercase letter.";
    else if (!/[a-z]/.test(password))     errs.password = "Password must include at least one lowercase letter.";
    else if (!/[0-9]/.test(password))     errs.password = "Password must include at least one number.";
    if (form.password !== form.confirm)   errs.confirm  = "Passwords do not match.";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    try {
      const res = await apiClient.signup(
        form.email.trim().toLowerCase(),
        form.password,
        form.name.trim()
      );
      const payload    = res?.data || {};
      const userData   = payload.user || payload;
      const token      = payload.token || payload.accessToken || null;
      const normalized = {
        id:    userData?.id    || userData?.userId || Date.now().toString(),
        name:  userData?.name  || form.name.trim(),
        email: userData?.email || form.email.trim().toLowerCase(),
      };
      login(normalized, token);
      setSubmitted(true);
      setTimeout(() => { if (onSignup) onSignup(); }, 900);
    } catch (err) {
      const detail = err.response?.data?.detail;
      let message   = err.response?.data?.message || "Signup failed. Please try again.";
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        message = first.msg || first.message || JSON.stringify(first);
      } else if (typeof detail === "string") {
        message = detail;
      }
      const errs = {};
      if      (message.toLowerCase().includes("email"))    errs.email    = message;
      else if (message.toLowerCase().includes("password")) errs.password = message;
      else if (message.toLowerCase().includes("name"))     errs.name     = message;
      else                                                 errs.general  = message;
      setErrors(errs);
    }
  };

  return (
    <div className="page-wrapper">
      <CircuitBackground />
      <GlowOrbs />

      <div className="logo">
        <div className="logo__badge">
          <span className="logo__badge-text">ATG+</span>
        </div>
        <span className="logo__name">AutoTestGen+</span>
      </div>

      <div className="card">
        {submitted ? (
          <div className="success-state">
            <div className="success-state__icon">✅</div>
            <h2 className="success-state__title">Account Created!</h2>
            <p className="success-state__message">
              Welcome to AutoTestGen+, {form.name.split(" ")[0]}!
            </p>
            <button className="btn-back" onClick={() => setSubmitted(false)}>Back</button>
          </div>
        ) : (
          <>
            <h1 className="card__title">Join AutoTestGen+</h1>

            <InputField placeholder="Full Name"       value={form.name}     onChange={update("name")} />
            {errors.name     && <p className="error-msg">{errors.name}</p>}

            <InputField type="email"    placeholder="Email Address"    value={form.email}    onChange={update("email")} />
            {errors.email    && <p className="error-msg">{errors.email}</p>}

            <InputField type="password" placeholder="Password"         value={form.password} onChange={update("password")} />
            {errors.password && <p className="error-msg">{errors.password}</p>}

            <InputField type="password" placeholder="Confirm Password" value={form.confirm}  onChange={update("confirm")} />
            {errors.confirm  && <p className="error-msg">{errors.confirm}</p>}

            <button className="btn-create" onClick={handleSubmit}>
              Create Account
            </button>

            {errors.general && <p className="error-msg" style={{ marginTop: 8 }}>{errors.general}</p>}

            <p className="login-row">
              Already have an account?{" "}
              <button className="login-link" onClick={() => onLogin && onLogin()}>Log in</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
