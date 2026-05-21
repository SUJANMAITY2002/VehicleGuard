import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ICONS = {
  Car: "🚗", Truck: "🚛", Bus: "🚌", Bike: "🏍️", Auto: "🛺", Van: "🚐", Other: "🚘",
};

const STATUS_STYLE = {
  Inside: { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
  Exited: { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" },
};

const todayStr = () => new Date().toISOString().split("T")[0]; 

const EMPTY_FORM = {
  vehicleNo:   "",
  vehicleType: "Car",
  entryGate:   "Gate A",
  driverName:  "",
  purpose:     "Visitor",
  entryDate:   todayStr(),                          
  entryTime:   new Date().toTimeString().slice(0, 5),
  exitTime:    "",
  status:      "Inside",
  remarks:     "",
};


function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[+m - 1]} ${y}`;
}

function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [entries,      setEntries]      = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [fetching,     setFetching]     = useState(true);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [formError,    setFormError]    = useState("");

  // ── Filters ─────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterType,   setFilterType]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDate,   setFilterDate]   = useState("");  
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  /* ── Fetch entries ───────────────────────── */
  const fetchEntries = async () => {
    setFetching(true);
    try {
      const res = await axios.get(`${API}/api/vehicle/all`);
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  /* ── Auth guard ──────────────────────────── */
  const handleAddClick = () => {
    if (!token) { navigate("/signin"); return; }
    setShowForm(v => !v);
    setFormError("");
  };

  /* ── Form change ─────────────────────────── */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError("");
  };

  /* ── Submit ──────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { navigate("/signin"); return; }
    if (!form.vehicleNo.trim())  { setFormError("Vehicle number is required."); return; }
    if (!form.driverName.trim()) { setFormError("Driver name is required."); return; }
    if (!form.entryDate)         { setFormError("Entry date is required."); return; }

    setLoading(true);
    try {
      await axios.post(`${API}/api/vehicle/add`, {
        ...form,
        vehicleNo:  form.vehicleNo.toUpperCase().trim(),
        driverName: form.driverName.trim(),
      });
      setShowForm(false);
      setForm({ ...EMPTY_FORM, entryDate: todayStr(), entryTime: new Date().toTimeString().slice(0, 5) });
      fetchEntries();
    } catch (err) {
      setFormError(err.response?.data?.message || "Error saving. Try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete ──────────────────────────────── */
  const handleDelete = async (id) => {
    if (!token) { navigate("/signin"); return; }
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/api/vehicle/delete/${id}`);
      setEntries(prev => prev.filter(e => e._id !== id));
    } catch { alert("Error deleting entry."); }
  };

  /* ── Clear date filters ──────────────────── */
  const clearDateFilter = () => {
    setFilterDate("");
    setDateFrom("");
    setDateTo("");
  };

  /* ── Client-side filter ──────────────────── */
  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch =
      e.vehicleNo.toLowerCase().includes(q) ||
      e.driverName.toLowerCase().includes(q);
    const matchType   = filterType   === "All" || e.vehicleType === filterType;
    const matchStatus = filterStatus === "All" || e.status      === filterStatus;

    // Single date exact match
    const matchDate = !filterDate || e.entryDate === filterDate;

    // Date range
    const matchFrom = !dateFrom || (e.entryDate && e.entryDate >= dateFrom);
    const matchTo   = !dateTo   || (e.entryDate && e.entryDate <= dateTo);

    return matchSearch && matchType && matchStatus && matchDate && matchFrom && matchTo;
  });

  /* ── Stats (always from full entries) ───── */
  const today = todayStr();
  const stats = {
    total:  entries.length,
    inside: entries.filter(e => e.status === "Inside").length,
    exited: entries.filter(e => e.status === "Exited").length,
    today:  entries.filter(e => e.entryDate === today).length,
  };

  const hasDateFilter = filterDate || dateFrom || dateTo;

  /* ── Render ──────────────────────────────── */
  return (
    <div className="home">

      {/* ── Hero ───────────────────────────── */}
      <div className="home-hero">
        <div className="hero-bg-grid"></div>
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-left">
            <span className="hero-badge">🛡️ Security Dashboard</span>
            <h1>Vehicle Entry<br /><span>Control System</span></h1>
            <p>Track, manage and monitor all vehicle entries in real-time across all gates.</p>
          </div>
          <div className="hero-right">
            {token ? (
              <button className="hero-add-btn" onClick={handleAddClick}>
                {showForm ? "✕ Close Form" : "+ New Entry"}
              </button>
            ) : (
              <button className="hero-login-btn" onClick={() => navigate("/signin")}>
                🔐 Login to Add Entry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ──────────────────────────── */}
      <div className="stats-grid">
        {[
          { label: "Total Records",     num: stats.total,  color: "blue",  emoji: "🚘" },
          { label: "Currently Inside",  num: stats.inside, color: "green", emoji: "🟢" },
          { label: "Exited",            num: stats.exited, color: "red",   emoji: "🔴" },
          { label: "Today's Entries",   num: stats.today,  color: "amber", emoji: "📅" },
        ].map(s => (
          <div className="stat-card" data-color={s.color} key={s.label}>
            <div className="stat-top">
              <span className="stat-label">{s.label}</span>
              <span className="stat-emoji">{s.emoji}</span>
            </div>
            <div className="stat-num">{s.num}</div>
            <div className="stat-bar"
              style={{ "--pct": stats.total ? `${(s.num / stats.total) * 100}%` : "0%" }}>
            </div>
          </div>
        ))}
      </div>

      {/* ── Entry Form ─────────────────────── */}
      {showForm && token && (
        <div className="form-card">
          <div className="form-card-header">
            <h2>🚗 New Vehicle Entry</h2>
            <button className="form-close" onClick={() => setShowForm(false)}>✕</button>
          </div>

          {formError && <div className="form-error">{formError}</div>}

          <form onSubmit={handleSubmit} className="entry-form">

            {/* Row 1 */}
            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Number *</label>
                <input name="vehicleNo" placeholder="e.g. WB 12 AB 3456"
                  value={form.vehicleNo} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Driver Name *</label>
                <input name="driverName" placeholder="Full name"
                  value={form.driverName} onChange={handleChange} required />
              </div>
            </div>

            {/* Row 2 */}
            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Type</label>
                <select name="vehicleType" value={form.vehicleType} onChange={handleChange}>
                  {["Car","Truck","Bus","Bike","Auto","Van","Other"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Entry Gate</label>
                <select name="entryGate" value={form.entryGate} onChange={handleChange}>
                  {["Gate A","Gate B","Gate C","Gate D"].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="form-row">
              <div className="form-group">
                <label>Purpose</label>
                <select name="purpose" value={form.purpose} onChange={handleChange}>
                  {["Delivery","Visitor","Staff","Loading","Other"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option>Inside</option>
                  <option>Exited</option>
                </select>
              </div>
            </div>

            {/* Row 4 — Entry Date + Entry Time + Exit Time */}
            <div className="form-row form-row-3">
              <div className="form-group">
                <label>Entry Date *</label>
                <input type="date" name="entryDate"
                  value={form.entryDate} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Entry Time *</label>
                <input type="time" name="entryTime"
                  value={form.entryTime} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Exit Time</label>
                <input type="time" name="exitTime"
                  value={form.exitTime} onChange={handleChange} />
              </div>
            </div>

            {/* Remarks */}
            <div className="form-group form-full">
              <label>Remarks</label>
              <input name="remarks" placeholder="Any additional notes..."
                value={form.remarks} onChange={handleChange} />
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel"
                onClick={() => { setShowForm(false); setFormError(""); }}>Cancel</button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? "Saving…" : "✓ Save Entry"}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ── Table Card ─────────────────────── */}
      <div className="table-card">

        {/* Controls */}
        <div className="table-top">
          <h2>Vehicle Records
            <span className="record-count">{filtered.length}</span>
          </h2>

          <div className="controls-wrap">

            {/* Row 1: search + type + status */}
            <div className="table-controls">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input className="search-input" placeholder="Search vehicle or driver..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="ctrl-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All Types</option>
                {["Car","Truck","Bus","Bike","Auto","Van","Other"].map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="ctrl-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option>Inside</option>
                <option>Exited</option>
              </select>
            </div>

            {/* Row 2: date filters */}
            <div className="date-filter-row">
              <div className="date-filter-group">
                <span className="date-filter-label">📅 Exact Date</span>
                <input type="date" className="date-input"
                  value={filterDate}
                  onChange={e => { setFilterDate(e.target.value); setDateFrom(""); setDateTo(""); }} />
              </div>

              <div className="date-divider">or</div>

              <div className="date-filter-group">
                <span className="date-filter-label">📆 Date Range</span>
                <div className="date-range-inputs">
                  <input type="date" className="date-input"
                    placeholder="From"
                    value={dateFrom}
                    onChange={e => { setDateFrom(e.target.value); setFilterDate(""); }} />
                  <span className="range-arrow">→</span>
                  <input type="date" className="date-input"
                    placeholder="To"
                    value={dateTo}
                    onChange={e => { setDateTo(e.target.value); setFilterDate(""); }} />
                </div>
              </div>

              {hasDateFilter && (
                <button className="clear-date-btn" onClick={clearDateFilter}>
                  ✕ Clear Date
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Active date filter badge */}
        {hasDateFilter && (
          <div className="active-filter-badge">
            {filterDate
              ? `Showing entries for ${fmtDate(filterDate)}`
              : `Showing entries from ${fmtDate(dateFrom) || "start"} → ${fmtDate(dateTo) || "today"}`}
          </div>
        )}

        {/* Table body */}
        {fetching ? (
          <div className="state-box">
            <div className="state-spinner"></div>
            <p>Loading records…</p>
          </div>
        ) : !token ? (
          <div className="locked-overlay">
            <div className="locked-blur"></div>
            <div className="locked-content">
              <span className="locked-icon">🔐</span>
              <h3>Login Required</h3>
              <p>Sign in to view and manage vehicle entries</p>
              <button className="locked-btn" onClick={() => navigate("/signin")}>
                Sign In Now
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="state-box">
            <div className="state-emoji">🚧</div>
            <p>{search || hasDateFilter ? "No results match your filters" : "No vehicle entries yet — add the first one!"}</p>
            {hasDateFilter && (
              <button className="clear-date-btn" style={{ marginTop: 12 }} onClick={clearDateFilter}>
                Clear date filter
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="vehicle-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Type</th>
                  <th>Gate</th>
                  <th>Purpose</th>
                  <th>Date</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr key={e._id}>
                    <td className="td-num">{i + 1}</td>
                    <td>
                      <div className="td-vehicle">
                        <span className="v-icon">{ICONS[e.vehicleType] || "🚘"}</span>
                        <strong>{e.vehicleNo}</strong>
                      </div>
                    </td>
                    <td className="td-driver">{e.driverName}</td>
                    <td>{e.vehicleType}</td>
                    <td><span className="gate-pill">{e.entryGate}</span></td>
                    <td><span className="purpose-pill">{e.purpose}</span></td>
                    <td className="td-date">{fmtDate(e.entryDate)}</td>
                    <td className="td-time">{e.entryTime}</td>
                    <td className="td-time">{e.exitTime || "—"}</td>
                    <td>
                      <span className="status-pill" style={STATUS_STYLE[e.status]}>
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <button className="del-btn" onClick={() => handleDelete(e._id)} title="Delete">
                        🗑
                      </button>
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

export default Home;