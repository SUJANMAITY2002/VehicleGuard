import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Signin() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/Signin`, form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user",  JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* Left branding panel */}
      <div className="auth-panel-left">
        <div className="auth-brand">
          <span className="auth-brand-icon">🛡️</span>
          <h2>Secure Vehicle<br /><span>Entry Control</span></h2>
          <p>Monitor every vehicle entering and exiting your premises in real-time.</p>
          <div className="auth-features">
            <div className="auth-feature"><span className="auth-feature-dot"></span>Real-time vehicle tracking</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span>Gate-wise entry management</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span>Instant search & filter</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span>Secure cloud database</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel-right">
        <div className="auth-form-wrap">
          <h3>Welcome back</h3>
          <p className="auth-sub">Sign in to access your dashboard</p>

          {error && <div className="auth-alert error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" name="password" placeholder="Your password"
                value={form.password} onChange={handleChange} autoComplete="current-password" />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?
            <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>

    </div>
  );
}

export default Signin;