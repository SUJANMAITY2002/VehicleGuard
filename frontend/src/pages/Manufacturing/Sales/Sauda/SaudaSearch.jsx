import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./SaudaSearch.css";
import { API_URL } from "../../../../config";

const API_BASE = `${API_URL}/api/sauda`;

const STATUSES = ["Draft", "Confirmed", "Cancelled", "Completed"];

function fmtDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function itemsTotal(items) {
  if (!items || !items.length) return 0;
  return items.reduce((sum, r) => sum + (Number(r.rate) || 0) * (Number(r.qty) || 0), 0);
}

const SaudaSearch = () => {
  const navigate = useNavigate();

  const today    = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    fromDate: monthAgo,
    toDate:   today,
    saudaNo:  "",
    partyCode: "",
    partyName: "",
    status:   "",
  });

  const [saudas,   setSaudas]   = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const fetchSaudas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.fromDate)    params.append("fromDate",    filters.fromDate);
      if (filters.toDate)      params.append("toDate",      filters.toDate);
      if (filters.saudaNo)     params.append("saudaNo",     filters.saudaNo);
      if (filters.partyCode)   params.append("partyCode",   filters.partyCode);
      if (filters.partyName)   params.append("partyName",   filters.partyName);
      if (filters.status)      params.append("status",      filters.status);

      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setSaudas(data);
      setSearched(true);
    } catch {
      setError("Could not connect to server. Check that the backend is running.");
      setSaudas([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  const clearField = (field) => setFilters((p) => ({ ...p, [field]: "" }));

  const clearAll = () => {
    setFilters({ fromDate: monthAgo, toDate: today, saudaNo: "", partyCode: "", partyName: "", status: "" });
    setSaudas([]);
    setSearched(false);
  };

  const handleDelete = async (id, saudaNo) => {
    if (!window.confirm(`Delete Sauda ${saudaNo}? (Only Draft saudas can be deleted)`)) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      fetchSaudas();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="ss-page">

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="ss-topbar">
        <div className="ss-topbar-left">
          <button className="ss-back-btn" onClick={() => navigate("/sales")}>
            ← Sauda
          </button>
        </div>
        <div className="ss-topbar-right">
          <button className="ss-create-btn" onClick={() => navigate("/sauda/create")}>
            + Create Sauda
          </button>
        </div>
      </div>

      <div className="ss-body">

        {/* ── FILTER CARD ──────────────────────────────────────────────── */}
        <div className="ss-filter-card">

          <div className="ss-filter-row ss-grid-4">

            <div className="ss-input-wrap">
              <label className="ss-label">From Date</label>
              <div className="ss-field-row">
                <input type="date" name="fromDate" className="ss-input" value={filters.fromDate} onChange={handleChange} />
                {filters.fromDate && <button className="ss-x" onClick={() => clearField("fromDate")}>✕</button>}
              </div>
            </div>

            <div className="ss-input-wrap">
              <label className="ss-label">To Date</label>
              <div className="ss-field-row">
                <input type="date" name="toDate" className="ss-input" value={filters.toDate} onChange={handleChange} />
                {filters.toDate && <button className="ss-x" onClick={() => clearField("toDate")}>✕</button>}
              </div>
            </div>

            <div className="ss-input-wrap">
              <label className="ss-label">Sauda No.</label>
              <div className="ss-field-row">
                <input
                  type="text" name="saudaNo" className="ss-input"
                  placeholder="Search Sauda no."
                  value={filters.saudaNo} onChange={handleChange}
                />
                {filters.saudaNo && <button className="ss-x" onClick={() => clearField("saudaNo")}>✕</button>}
              </div>
            </div>

            <div className="ss-input-wrap">
              <label className="ss-label">Party Code</label>
              <div className="ss-field-row">
                <input
                  type="text" name="partyCode" className="ss-input"
                  placeholder="Search party code"
                  value={filters.partyCode} onChange={handleChange}
                />
                {filters.partyCode && <button className="ss-x" onClick={() => clearField("partyCode")}>✕</button>}
              </div>
            </div>

          </div>

          <div className="ss-filter-row ss-grid-row2">

            <div className="ss-input-wrap">
              <label className="ss-label">Party Name</label>
              <div className="ss-field-row">
                <input
                  type="text" name="partyName" className="ss-input"
                  placeholder="Search party name"
                  value={filters.partyName} onChange={handleChange}
                />
                {filters.partyName && <button className="ss-x" onClick={() => clearField("partyName")}>✕</button>}
              </div>
            </div>

            <div className="ss-input-wrap">
              <label className="ss-label">Status</label>
              <div className="ss-field-row">
                <select name="status" className="ss-input" value={filters.status} onChange={handleChange}>
                  <option value="">All Statuses</option>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {filters.status && <button className="ss-x" onClick={() => clearField("status")}>✕</button>}
              </div>
            </div>

            <div className="ss-filter-actions">
              <button className="ss-btn-clear" onClick={clearAll}>Clear All</button>
              <button className="ss-btn-search" onClick={fetchSaudas} disabled={loading}>
                {loading ? "Searching…" : "🔍 Search"}
              </button>
            </div>

          </div>
        </div>

        {error && <div className="ss-error">{error}</div>}

        {/* ── RESULTS TABLE ────────────────────────────────────────────── */}
        <div className="ss-table-card">
          {!searched ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">🔍</div>
              <p className="ss-empty-title">Apply filters to display results</p>
              <p className="ss-empty-sub">Use the filters above and click Search</p>
            </div>
          ) : saudas.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">📋</div>
              <p className="ss-empty-title">No records found</p>
              <p className="ss-empty-sub">
                Try adjusting filters or{" "}
                <span className="ss-link" onClick={() => navigate("/sauda/create")}>create a new Sauda</span>
              </p>
            </div>
          ) : (
            <>
              <div className="ss-count">{saudas.length} record{saudas.length !== 1 ? "s" : ""} found</div>

              <div className="ss-table-wrap">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Sauda No.</th>
                      <th>Date</th>
                      <th>Party Code</th>
                      <th>Party Name</th>
                      <th>Valid Till</th>
                      <th>Payment Terms</th>
                      <th>Items</th>
                      <th>Amount (₹)</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saudas.map((s, i) => (
                      <tr key={s._id}>
                        <td>{i + 1}</td>
                        <td>
                          <button
                            className="ss-contract-link"
                            onClick={() => navigate(`/sauda/edit/${s._id}`)}
                            title="Click to view / edit"
                          >
                            {s.saudaNo}
                          </button>
                        </td>
                        <td>{fmtDate(s.saudaDate)}</td>
                        <td>{s.partyCode || "-"}</td>
                        <td>{s.partyName || "-"}</td>
                        <td>{fmtDate(s.validTill)}</td>
                        <td>{s.paymentTerms || "-"}</td>
                        <td>{s.items?.length || 0}</td>
                        <td>₹{itemsTotal(s.items).toLocaleString("en-IN")}</td>
                        <td>
                          <span className={`ss-status-badge ss-status-${(s.status || "draft").toLowerCase()}`}>
                            {s.status || "Draft"}
                          </span>
                        </td>
                        <td className="ss-actions-cell">
                          <button className="ss-action-btn ss-edit" onClick={() => navigate(`/sauda/edit/${s._id}`)}>
                            {s.status === "Draft" ? "Edit" : "View"}
                          </button>
                          {s.status === "Draft" && (
                            <button className="ss-action-btn ss-delete" onClick={() => handleDelete(s._id, s.saudaNo)}>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default SaudaSearch;