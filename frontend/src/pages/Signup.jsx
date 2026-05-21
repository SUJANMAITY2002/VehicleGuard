import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Signup() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields."); return;
    }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/Signup`, {
        name: form.name, email: form.email, password: form.password,
      });
      setSuccess(res.data.message + " Redirecting…");
      setTimeout(() => navigate("/signin"), 1400);
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
          <h2>Join<br /><span>VehicleGuard</span></h2>
          <p>Create your account and start managing vehicle access for your premises today.</p>
          <div className="auth-features">
            <div className="auth-feature"><span className="auth-feature-dot"></span>Free to get started</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span>Unlimited entries</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span>MongoDB cloud storage</div>
            <div className="auth-feature"><span className="auth-feature-dot"></span>Secure JWT auth</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel-right">
        <div className="auth-form-wrap">
          <h3>Create account</h3>
          <p className="auth-sub">Start managing vehicle access today</p>

          {error   && <div className="auth-alert error">{error}</div>}
          {success && <div className="auth-alert success">{success}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Full Name</label>
              <input type="text" name="name" placeholder="John Doe"
                value={form.name} onChange={handleChange} autoComplete="name" />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} autoComplete="email" />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" name="password" placeholder="Min. 6 characters"
                value={form.password} onChange={handleChange} autoComplete="new-password" />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" placeholder="Repeat password"
                value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?
            <Link to="/signin">Sign in</Link>
          </p>
        </div>
      </div>

    </div>
  );
}

export default Signup;