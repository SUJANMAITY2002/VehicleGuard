import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./VehicleOutwardSearch.css";
import { API_URL } from "../../../../config";

const API_BASE = `${API_URL}/api/vehicle-outward`;
const STAGES = ["Gate In", "Empty Weighed", "Loaded", "Weighed", "Exited"];

function fmtDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const stageClass = (s) => `ss-stage-${(s || "gate-in").toLowerCase().replace(/\s+/g, "-")}`;

const VehicleOutwardSearch = () => {
  const navigate = useNavigate();
  const today    = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    fromDate: monthAgo, toDate: today, gateOutNo: "", dispatchNo: "", vehicleNo: "", customer: "", stage: "",
  });

  const [records,  setRecords]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setRecords(data);
      setSearched(true);
    } catch {
      setError("Could not connect to server. Check that the backend is running.");
      setRecords([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  const clearField = (field) => setFilters((p) => ({ ...p, [field]: "" }));
  const clearAll = () => {
    setFilters({ fromDate: monthAgo, toDate: today, gateOutNo: "", dispatchNo: "", vehicleNo: "", customer: "", stage: "" });
    setRecords([]);
    setSearched(false);
  };

  const handleDelete = async (id, gateOutNo) => {
    if (!window.confirm(`Delete Gate Out record ${gateOutNo}? (Only records still at "Gate In" can be deleted)`)) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      fetchRecords();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="ss-page">

      <div className="ss-topbar">
        <div className="ss-topbar-left">
          <button className="ss-back-btn" onClick={() => navigate("/sales")}>← Vehicle Outward</button>
        </div>
        <div className="ss-topbar-right">
          <button className="ss-create-btn" onClick={() => navigate("/vehicle-outward/create")}>+ Gate In</button>
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
              <label className="ss-label">Gate Out No.</label>
              <div className="ss-field-row">
                <input type="text" name="gateOutNo" className="ss-input" placeholder="Search gate out no." value={filters.gateOutNo} onChange={handleChange} />
                {filters.gateOutNo && <button className="ss-x" onClick={() => clearField("gateOutNo")}>✕</button>}
              </div>
            </div>
            <div className="ss-input-wrap">
              <label className="ss-label">Dispatch No.</label>
              <div className="ss-field-row">
                <input type="text" name="dispatchNo" className="ss-input" placeholder="Search dispatch no." value={filters.dispatchNo} onChange={handleChange} />
                {filters.dispatchNo && <button className="ss-x" onClick={() => clearField("dispatchNo")}>✕</button>}
              </div>
            </div>
          </div>

          <div className="ss-filter-row ss-grid-row2">
            <div className="ss-input-wrap">
              <label className="ss-label">Vehicle No.</label>
              <div className="ss-field-row">
                <input type="text" name="vehicleNo" className="ss-input" placeholder="Search vehicle no." value={filters.vehicleNo} onChange={handleChange} />
                {filters.vehicleNo && <button className="ss-x" onClick={() => clearField("vehicleNo")}>✕</button>}
              </div>
            </div>
            <div className="ss-input-wrap">
              <label className="ss-label">Party Name</label>
              <div className="ss-field-row">
                <input type="text" name="customer" className="ss-input" placeholder="Search party name" value={filters.customer} onChange={handleChange} />
                {filters.customer && <button className="ss-x" onClick={() => clearField("customer")}>✕</button>}
              </div>
            </div>
            <div className="ss-input-wrap">
              <label className="ss-label">Stage</label>
              <div className="ss-field-row">
                <select name="stage" className="ss-input" value={filters.stage} onChange={handleChange}>
                  <option value="">All Stages</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {filters.stage && <button className="ss-x" onClick={() => clearField("stage")}>✕</button>}
              </div>
            </div>
            <div className="ss-filter-actions">
              <button className="ss-btn-clear" onClick={clearAll}>Clear All</button>
              <button className="ss-btn-search" onClick={fetchRecords} disabled={loading}>
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
          ) : records.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">🛃</div>
              <p className="ss-empty-title">No records found</p>
              <p className="ss-empty-sub">
                Try adjusting filters or{" "}
                <span className="ss-link" onClick={() => navigate("/vehicle-outward/create")}>start a new Gate In</span>
              </p>
            </div>
          ) : (
            <>
              <div className="ss-count">{records.length} record{records.length !== 1 ? "s" : ""} found</div>
              <div className="ss-table-wrap">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Gate Out No.</th>
                      <th>Transaction Category</th>
                      <th>Dispatch No.</th>
                      <th>Party Name</th>
                      <th>Vehicle No.</th>
                      <th>Driver</th>
                      <th>Gate In Date</th>
                      <th>Gate In Time</th>
                      <th>Stage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r._id}>
                        <td>{i + 1}</td>
                        <td>
                          <button className="ss-contract-link" onClick={() => navigate(`/vehicle-outward/edit/${r._id}`)}>
                            {r.gateOutNo}
                          </button>
                        </td>
                        <td>{r.transactionCategory || "-"}</td>
                        <td>{r.dispatchNo || "-"}</td>
                        <td>{r.customer || "-"}</td>
                        <td>{r.vehicleNo || "-"}</td>
                        <td>{r.driverName || "-"}</td>
                        <td>{fmtDate(r.gateInDate)}</td>
                        <td>{r.gateInTime || "-"}</td>
                        <td><span className={`ss-status-badge ${stageClass(r.stage)}`}>{r.stage}</span></td>
                        <td className="ss-actions-cell">
                          <button className="ss-action-btn ss-edit" onClick={() => navigate(`/vehicle-outward/edit/${r._id}`)}>
                            {r.stage === "Exited" ? "View" : "Continue"}
                          </button>
                          {r.stage === "Gate In" && (
                            <button className="ss-action-btn ss-delete" onClick={() => handleDelete(r._id, r.gateOutNo)}>
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

export default VehicleOutwardSearch;