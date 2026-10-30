import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./BundlingProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/bundling-production`;
const blank = { fromDate: "", toDate: "", bundleEntryNo: "", shift: "", site: "", status: "", product: "" };

const BundlingProduction = () => {
  const navigate = useNavigate();
  const [filters,  setFilters]  = useState(blank);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => { fetchData(blank); }, []);

  const fetchData = async (f) => {
    setLoading(true); setSearched(true);
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await axios.get(API, { params });
      setResults(res.data?.data || []);
    } catch { alert("Failed to fetch bundling records"); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bundling record?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      setResults((p) => p.filter((r) => r._id !== id));
    } catch { alert("Delete failed"); }
  };

  return (
    <div className="bun-page">
      <ModuleNavbar />

      <div className="bun-header">
        <div className="bun-header-left">
          <button className="bun-back-btn" onClick={() => navigate("/production")}>← Production</button>
          <div>
            <h2>Bundling Production</h2>
            <span className="bun-subtitle">Loose Bars → Saleable Bundles</span>
          </div>
        </div>
        <button className="bun-create-btn" onClick={() => navigate("/create-bundling-production")}>
          + Create Bundle Entry
        </button>
      </div>

      {/* FILTERS */}
      <div className="bun-card">
        <div className="bun-section-title">🔍 Search Filters</div>
        <div className="bun-filter-grid">
          {[
            { label: "From Date",      name: "fromDate",      type: "date" },
            { label: "To Date",        name: "toDate",        type: "date" },
            { label: "Bundle Entry No",name: "bundleEntryNo", type: "text" },
            { label: "Product",        name: "product",       type: "text" },
          ].map((f) => (
            <div className="bun-field" key={f.name}>
              <label>{f.label}</label>
              <input type={f.type} name={f.name} value={filters[f.name]} onChange={handleChange} />
            </div>
          ))}
          <div className="bun-field">
            <label>Shift</label>
            <select name="shift" value={filters.shift} onChange={handleChange}>
              <option value="">All</option>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
          <div className="bun-field">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleChange}>
              <option value="">All</option>
              <option>Open</option><option>Closed</option><option>Draft</option>
            </select>
          </div>
        </div>
        <div className="bun-filter-actions">
          <button className="bun-reset-btn" onClick={() => { setFilters(blank); fetchData(blank); }}>Reset</button>
          <button className="bun-search-btn" onClick={() => fetchData(filters)}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <div className="bun-card">
        <div className="bun-section-title">
          Records
          {results.length > 0 && <span className="bun-count">{results.length} record(s)</span>}
        </div>

        {loading && <div className="bun-placeholder">Loading…</div>}
        {!loading && searched && results.length === 0 && (
          <div className="bun-placeholder">No bundling records found</div>
        )}
        {!loading && results.length > 0 && (
          <div className="bun-table-wrap">
            <table className="bun-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bundle Entry No</th>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Bundles</th>
                  <th>Bundle Weight (MT)</th>
                  <th>Pieces</th>
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
                      <button className="bun-link-btn" onClick={() => navigate(`/bundling-detail/${row._id}`)}>
                        {row.bundleEntryNo || "-"}
                      </button>
                    </td>
                    <td>{row.bundleDate || "-"}</td>
                    <td>{row.shift || "-"}</td>
                    <td>{row.totalBundleCount || "-"}</td>
                    <td>{row.totalBundleWt || "-"}</td>
                    <td>{row.totalPieces || "-"}</td>
                    <td>{row.site || "-"}</td>
                    <td>
                      <span className={`bun-status-badge ${(row.status || "").toLowerCase()}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td>
                      <button className="bun-edit-btn" onClick={() => navigate(`/bundling-detail/${row._id}`)}>Edit</button>
                      <button className="bun-del-btn" onClick={() => handleDelete(row._id)}>Delete</button>
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

export default BundlingProduction;