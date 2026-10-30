import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./VehicleOutwardWeighmentSearch.css";
import { API_URL } from "../../../../config";

/*
  VEHICLE OUTWARD WEIGHMENT — SEARCH
  ─────────────────────────────────────
  Landing page for the "Weighment" card on the Sales module.
  Lists the same Gate Out records as Vehicle Outward Search (same
  /api/vehicle-outward endpoint — one gate-to-gate record carries both
  the Gate In and Weighment stages), but every row action drops the
  user straight into the Weighment flow (/vehicle-outward-weighment/:id)
  instead of the Gate In edit page.
*/

const API_BASE = `${API_URL}/api/vehicle-outward`;
const STAGES = ["Gate In", "Empty Weighed", "Loaded", "Weighed", "Exited"];

function fmtDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const stageClass = (s) => `vows-stage-${(s || "gate-in").toLowerCase().replace(/\s+/g, "-")}`;

const VehicleOutwardWeighmentSearch = () => {
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

  const goToWeighment = (id) => navigate(`/vehicle-outward-weighment/${id}`);

  const actionLabel = (stage) => (stage === "Exited" ? "View" : stage === "Gate In" ? "Start Weighment" : "Continue");

  return (
    <div className="vows-page">

      <div className="vows-topbar">
        <div className="vows-topbar-left">
          <button className="vows-back-btn" onClick={() => navigate("/sales")}>← Weighment</button>
        </div>
      </div>

      <div className="vows-body">

        <div className="vows-filter-card">
          <div className="vows-filter-row vows-grid-4">
            <div className="vows-input-wrap">
              <label className="vows-label">From Date</label>
              <div className="vows-field-row">
                <input type="date" name="fromDate" className="vows-input" value={filters.fromDate} onChange={handleChange} />
                {filters.fromDate && <button className="vows-x" onClick={() => clearField("fromDate")}>✕</button>}
              </div>
            </div>
            <div className="vows-input-wrap">
              <label className="vows-label">To Date</label>
              <div className="vows-field-row">
                <input type="date" name="toDate" className="vows-input" value={filters.toDate} onChange={handleChange} />
                {filters.toDate && <button className="vows-x" onClick={() => clearField("toDate")}>✕</button>}
              </div>
            </div>
            <div className="vows-input-wrap">
              <label className="vows-label">Gate Out No.</label>
              <div className="vows-field-row">
                <input type="text" name="gateOutNo" className="vows-input" placeholder="Search gate out no." value={filters.gateOutNo} onChange={handleChange} />
                {filters.gateOutNo && <button className="vows-x" onClick={() => clearField("gateOutNo")}>✕</button>}
              </div>
            </div>
            <div className="vows-input-wrap">
              <label className="vows-label">Dispatch No.</label>
              <div className="vows-field-row">
                <input type="text" name="dispatchNo" className="vows-input" placeholder="Search dispatch no." value={filters.dispatchNo} onChange={handleChange} />
                {filters.dispatchNo && <button className="vows-x" onClick={() => clearField("dispatchNo")}>✕</button>}
              </div>
            </div>
          </div>

          <div className="vows-filter-row vows-grid-row2">
            <div className="vows-input-wrap">
              <label className="vows-label">Vehicle No.</label>
              <div className="vows-field-row">
                <input type="text" name="vehicleNo" className="vows-input" placeholder="Search vehicle no." value={filters.vehicleNo} onChange={handleChange} />
                {filters.vehicleNo && <button className="vows-x" onClick={() => clearField("vehicleNo")}>✕</button>}
              </div>
            </div>
            <div className="vows-input-wrap">
              <label className="vows-label">Party Name</label>
              <div className="vows-field-row">
                <input type="text" name="customer" className="vows-input" placeholder="Search party name" value={filters.customer} onChange={handleChange} />
                {filters.customer && <button className="vows-x" onClick={() => clearField("customer")}>✕</button>}
              </div>
            </div>
            <div className="vows-input-wrap">
              <label className="vows-label">Stage</label>
              <div className="vows-field-row">
                <select name="stage" className="vows-input" value={filters.stage} onChange={handleChange}>
                  <option value="">All Stages</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {filters.stage && <button className="vows-x" onClick={() => clearField("stage")}>✕</button>}
              </div>
            </div>
            <div className="vows-filter-actions">
              <button className="vows-btn-clear" onClick={clearAll}>Clear All</button>
              <button className="vows-btn-search" onClick={fetchRecords} disabled={loading}>
                {loading ? "Searching…" : "🔍 Search"}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="vows-error">{error}</div>}

        <div className="vows-table-card">
          {!searched ? (
            <div className="vows-empty">
              <div className="vows-empty-icon">🔍</div>
              <p className="vows-empty-title">Apply filters to display results</p>
              <p className="vows-empty-sub">Use the filters above and click Search</p>
            </div>
          ) : records.length === 0 ? (
            <div className="vows-empty">
              <div className="vows-empty-icon">⚖️</div>
              <p className="vows-empty-title">No records found</p>
              <p className="vows-empty-sub">Try adjusting the filters above</p>
            </div>
          ) : (
            <>
              <div className="vows-count">{records.length} record{records.length !== 1 ? "s" : ""} found</div>
              <div className="vows-table-wrap">
                <table className="vows-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Gate Out No.</th>
                      <th>Dispatch No.</th>
                      <th>Party Name</th>
                      <th>Vehicle No.</th>
                      <th>Driver</th>
                      <th>Gate In Date</th>
                      <th>Net Weight (MT)</th>
                      <th>Stage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r._id}>
                        <td>{i + 1}</td>
                        <td>
                          <button className="vows-link" onClick={() => goToWeighment(r._id)}>
                            {r.gateOutNo}
                          </button>
                        </td>
                        <td>{r.dispatchNo || "-"}</td>
                        <td>{r.customer || "-"}</td>
                        <td>{r.vehicleNo || "-"}</td>
                        <td>{r.driverName || "-"}</td>
                        <td>{fmtDate(r.gateInDate)}</td>
                        <td>{r.netWeight != null ? r.netWeight : "-"}</td>
                        <td><span className={`vows-status-badge ${stageClass(r.stage)}`}>{r.stage}</span></td>
                        <td className="vows-actions-cell">
                          <button className="vows-action-btn vows-edit" onClick={() => goToWeighment(r._id)}>
                            {actionLabel(r.stage)}
                          </button>
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

export default VehicleOutwardWeighmentSearch;