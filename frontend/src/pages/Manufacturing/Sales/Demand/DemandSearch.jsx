import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./DemandSearch.css";
import { API_URL } from "../../../../config";

const API_BASE = `${API_URL}/api/demand`;
const STATUSES = ["Pending", "Production Requested", "Ready", "Dispatched"];

function fmtDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const DemandSearch = () => {
  const navigate = useNavigate();
  const today    = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    fromDate: monthAgo, toDate: today, demandNo: "", saudaNo: "", partyName: "", priority: "", status: "",
  });

  const [demands,  setDemands]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const fetchDemands = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });

      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setDemands(data);
      setSearched(true);
    } catch {
      setError("Could not connect to server. Check that the backend is running.");
      setDemands([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  const clearField = (field) => setFilters((p) => ({ ...p, [field]: "" }));
  const clearAll = () => {
    setFilters({ fromDate: monthAgo, toDate: today, demandNo: "", saudaNo: "", partyName: "", priority: "", status: "" });
    setDemands([]);
    setSearched(false);
  };

  const handleDelete = async (id, demandNo) => {
    if (!window.confirm(`Delete Demand ${demandNo}? (Only Pending demands can be deleted)`)) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      fetchDemands();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="ss-page">

      <div className="ss-topbar">
        <div className="ss-topbar-left">
          <button className="ss-back-btn" onClick={() => navigate("/sales")}>← Demand Entry</button>
        </div>
        <div className="ss-topbar-right">
          <button className="ss-create-btn" onClick={() => navigate("/demand/create")}>+ Create Demand</button>
        </div>
      </div>

      <div className="ss-body">

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
              <label className="ss-label">Demand No.</label>
              <div className="ss-field-row">
                <input type="text" name="demandNo" className="ss-input" placeholder="Search demand no." value={filters.demandNo} onChange={handleChange} />
                {filters.demandNo && <button className="ss-x" onClick={() => clearField("demandNo")}>✕</button>}
              </div>
            </div>
            <div className="ss-input-wrap">
              <label className="ss-label">Sauda No.</label>
              <div className="ss-field-row">
                <input type="text" name="saudaNo" className="ss-input" placeholder="Search sauda no." value={filters.saudaNo} onChange={handleChange} />
                {filters.saudaNo && <button className="ss-x" onClick={() => clearField("saudaNo")}>✕</button>}
              </div>
            </div>
          </div>

          <div className="ss-filter-row ss-grid-4">
            <div className="ss-input-wrap">
              <label className="ss-label">Party Name</label>
              <div className="ss-field-row">
                <input type="text" name="partyName" className="ss-input" placeholder="Search party name" value={filters.partyName} onChange={handleChange} />
                {filters.partyName && <button className="ss-x" onClick={() => clearField("partyName")}>✕</button>}
              </div>
            </div>
            <div className="ss-input-wrap">
              <label className="ss-label">Priority</label>
              <div className="ss-field-row">
                <select name="priority" className="ss-input" value={filters.priority} onChange={handleChange}>
                  <option value="">All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                {filters.priority && <button className="ss-x" onClick={() => clearField("priority")}>✕</button>}
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
              <button className="ss-btn-search" onClick={fetchDemands} disabled={loading}>
                {loading ? "Searching…" : "🔍 Search"}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="ss-error">{error}</div>}

        <div className="ss-table-card">
          {!searched ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">🔍</div>
              <p className="ss-empty-title">Apply filters to display results</p>
              <p className="ss-empty-sub">Use the filters above and click Search</p>
            </div>
          ) : demands.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">📋</div>
              <p className="ss-empty-title">No records found</p>
              <p className="ss-empty-sub">
                Try adjusting filters or{" "}
                <span className="ss-link" onClick={() => navigate("/demand/create")}>create a new Demand</span>
              </p>
            </div>
          ) : (
            <>
              <div className="ss-count">{demands.length} record{demands.length !== 1 ? "s" : ""} found</div>
              <div className="ss-table-wrap">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Demand No.</th>
                      <th>Sauda No.</th>
                      <th>Party Name</th>
                      <th>Demand Date</th>
                      <th>Dispatch Date</th>
                      <th>Priority</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demands.map((d, i) => (
                      <tr key={d._id}>
                        <td>{i + 1}</td>
                        <td>
                          <button className="ss-contract-link" onClick={() => navigate(`/demand/edit/${d._id}`)}>
                            {d.demandNo}
                          </button>
                        </td>
                        <td>{d.saudaNo || "-"}</td>
                        <td>{d.partyName || "-"}</td>
                        <td>{fmtDate(d.demandDate)}</td>
                        <td>{fmtDate(d.dispatchDate)}</td>
                        <td><span className={`ss-priority-${(d.priority || "medium").toLowerCase()}`}>{d.priority}</span></td>
                        <td>{d.items?.length || 0}</td>
                        <td>
                          <span className={`ss-status-badge ss-status-${(d.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                            {d.status || "Pending"}
                          </span>
                        </td>
                        <td className="ss-actions-cell">
                          <button className="ss-action-btn ss-edit" onClick={() => navigate(`/demand/edit/${d._id}`)}>
                            {d.status === "Pending" ? "Edit" : "View"}
                          </button>
                          {d.status === "Pending" && (
                            <button className="ss-action-btn ss-delete" onClick={() => handleDelete(d._id, d.demandNo)}>
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

export default DemandSearch;