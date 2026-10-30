import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RollingProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/rolling-production`;

const blank = { fromDate: "", toDate: "", rollingNo: "", shift: "", site: "", status: "", product: "" };

const RollingProduction = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(blank);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => { fetchData(blank); }, []);

  const fetchData = async (f) => {
    setLoading(true); setSearched(true);
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await axios.get(API, { params });
      setResults(res.data?.data || []);
    } catch { alert("Failed to fetch Rolling records"); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Rolling record?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      setResults((p) => p.filter((r) => r._id !== id));
    } catch { alert("Delete failed"); }
  };

  return (
    <div className="roll-page">
      <ModuleNavbar />

      <div className="roll-header">
        <div className="roll-header-left">
          <button className="roll-back-btn" onClick={() => navigate("/production")}>← Production</button>
          <div>
            <h2>Rolling Production</h2>
            <span className="roll-subtitle">Billets → Finished TMT Bars</span>
          </div>
        </div>
        <button className="roll-create-btn" onClick={() => navigate("/create-rolling-production")}>
          + Create Rolling Entry
        </button>
      </div>

      {/* FILTERS */}
      <div className="roll-card">
        <div className="roll-section-title">🔍 Search Filters</div>
        <div className="roll-filter-grid">
          {[
            { label: "From Date",   name: "fromDate",  type: "date" },
            { label: "To Date",     name: "toDate",    type: "date" },
            { label: "Rolling No",  name: "rollingNo", type: "text" },
            { label: "Product",     name: "product",   type: "text" },
          ].map((f) => (
            <div className="roll-field" key={f.name}>
              <label>{f.label}</label>
              <input type={f.type} name={f.name} value={filters[f.name]} onChange={handleChange} />
            </div>
          ))}
          <div className="roll-field">
            <label>Shift</label>
            <select name="shift" value={filters.shift} onChange={handleChange}>
              <option value="">All</option>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
          <div className="roll-field">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleChange}>
              <option value="">All</option>
              <option>Open</option><option>Closed</option><option>Draft</option>
            </select>
          </div>
        </div>
        <div className="roll-filter-actions">
          <button className="roll-reset-btn" onClick={() => { setFilters(blank); fetchData(blank); }}>Reset</button>
          <button className="roll-search-btn" onClick={() => fetchData(filters)}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <div className="roll-card">
        <div className="roll-section-title">
          Records
          {results.length > 0 && <span className="roll-count">{results.length} record(s)</span>}
        </div>

        {loading && <div className="roll-placeholder">Loading…</div>}
        {!loading && searched && results.length === 0 && (
          <div className="roll-placeholder">No rolling records found</div>
        )}
        {!loading && results.length > 0 && (
          <div className="roll-table-wrap">
            <table className="roll-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Rolling No</th>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Mill No</th>
                  <th>Input (MT)</th>
                  <th>Output (MT)</th>
                  <th>Mill Scale (MT)</th>
                  <th>Yield %</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={row._id || idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <button className="roll-link-btn" onClick={() => navigate(`/rolling-detail/${row._id}`)}>
                        {row.rollingNo || "-"}
                      </button>
                    </td>
                    <td>{row.rollingDate || "-"}</td>
                    <td>{row.shift || "-"}</td>
                    <td>{row.millNo || "-"}</td>
                    <td>{row.inputQty || "-"}</td>
                    <td>{row.outputQty || "-"}</td>
                    <td>{row.millScaleQty || "-"}</td>
                    <td>
                      {row.yieldPct != null
                        ? <span className="roll-yield-badge">{row.yieldPct}%</span>
                        : "-"}
                    </td>
                    <td>{row.site || "-"}</td>
                    <td>
                      <span className={`roll-status-badge ${(row.status || "").toLowerCase()}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td>
                      <button className="roll-edit-btn" onClick={() => navigate(`/rolling-detail/${row._id}`)}>Edit</button>
                      <button className="roll-del-btn" onClick={() => handleDelete(row._id)}>Delete</button>
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
};

export default RollingProduction;