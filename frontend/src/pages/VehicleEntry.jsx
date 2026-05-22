import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./VehicleEntry.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const todayStr = () => new Date().toISOString().split("T")[0];

const EMPTY = {
  entryDate:  todayStr(),
  vehicleNo:  "",
  particleNo: "",
};

function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[+m - 1]} ${y}`;
}

function VehicleEntry() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [entries,   setEntries]   = useState([]);
  const [form,      setForm]      = useState(EMPTY);
  const [showForm,  setShowForm]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [fetching,  setFetching]  = useState(true);
  const [formError, setFormError] = useState("");
  const [success,   setSuccess]   = useState("");
  const [search,    setSearch]    = useState("");

  const fetchEntries = async () => {
    setFetching(true);
    try {
      const res = await axios.get(`${API}/api/entry/all`);
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { navigate("/signin"); return; }
    if (!form.vehicleNo.trim())  { setFormError("Vehicle number is required."); return; }
    if (!form.particleNo.trim()) { setFormError("Particle number is required."); return; }
    if (!form.entryDate)         { setFormError("Entry date is required."); return; }

    setLoading(true);
    setFormError("");
    try {
      const res = await axios.post(`${API}/api/entry/add`, {
        ...form,
        vehicleNo: form.vehicleNo.toUpperCase().trim(),
        particleNo: form.particleNo.trim(),
      });
      setSuccess(`Entry saved! Entry No: ${res.data.entry.entryNo}`);
      setForm({ ...EMPTY, entryDate: todayStr() });
      fetchEntries();
      setTimeout(() => setShowForm(false), 1800);
    } catch (err) {
      setFormError(err.response?.data?.message || "Error saving. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!token) { navigate("/signin"); return; }
    if (!window.confirm("Delete this vehicle entry?")) return;
    try {
      await axios.delete(`${API}/api/entry/${id}`);
      setEntries(prev => prev.filter(e => e._id !== id));
    } catch { alert("Error deleting entry."); }
  };

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    return (
      e.entryNo?.toLowerCase().includes(q) ||
      e.vehicleNo?.toLowerCase().includes(q) ||
      e.particleNo?.toLowerCase().includes(q)
    );
  });

  const today = todayStr();
  const todayCount = entries.filter(e => e.entryDate === today).length;

  return (
    <div className="page">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Vehicle Entry</h1>
          <p className="page-sub">Register incoming vehicles with entry number and particle details</p>
        </div>
        {token && (
          <button className="btn-primary" onClick={() => { setShowForm(v => !v); setFormError(""); setSuccess(""); }}>
            {showForm ? "✕ Close" : "+ New Entry"}
          </button>
        )}
        {!token && (
          <button className="btn-primary" onClick={() => navigate("/signin")}>
            🔐 Login to Add
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-num">{entries.length}</span>
          <span className="stat-label">Total Entries</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{todayCount}</span>
          <span className="stat-label">Today</span>
        </div>
      </div>

      {/* Form */}
      {showForm && token && (
        <div className="form-card">
          <div className="form-card-header">
            <h2>New Vehicle Entry</h2>
            <span className="form-note">Entry No will be auto-generated</span>
          </div>

          {formError && <div className="alert alert-error">{formError}</div>}
          {success   && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Entry Date *</label>
                <input type="date" name="entryDate"
                  value={form.entryDate} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Vehicle No *</label>
                <input type="text" name="vehicleNo"
                  placeholder="e.g. MH12AB1234"
                  value={form.vehicleNo} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Particle No *</label>
                <input type="text" name="particleNo"
                  placeholder="e.g. PT-00123"
                  value={form.particleNo} onChange={handleChange} />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel"
                onClick={() => { setShowForm(false); setFormError(""); setSuccess(""); }}>
                Cancel
              </button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? "Saving…" : "✓ Save Entry"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="table-card">
        <div className="table-top">
          <h2>Vehicle Records <span className="record-badge">{filtered.length}</span></h2>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input"
              placeholder="Search entry no, vehicle, particle…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {fetching ? (
          <div className="state-box"><div className="spinner"></div><p>Loading…</p></div>
        ) : !token ? (
          <div className="locked-box">
            <span>🔐</span>
            <h3>Login Required</h3>
            <p>Sign in to view records</p>
            <button className="btn-primary" onClick={() => navigate("/signin")}>Sign In</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="state-box"><span>📋</span><p>No entries found</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entry No</th>
                  <th>Date</th>
                  <th>Vehicle No</th>
                  <th>Particle No</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e._id}>
                    <td className="td-num">{i + 1}</td>
                    <td><span className="entry-no-badge">{e.entryNo}</span></td>
                    <td className="td-date">{fmtDate(e.entryDate)}</td>
                    <td><strong className="vehicle-no">{e.vehicleNo}</strong></td>
                    <td className="td-muted">{e.particleNo}</td>
                    <td>
                      <button className="del-btn" onClick={() => handleDelete(e._id)} title="Delete">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleEntry;