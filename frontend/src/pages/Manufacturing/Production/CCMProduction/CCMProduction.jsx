import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CCMProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/ccm-production`;

/* Search filters: From Date, To Date, CCM No, Heat No */
const blank = { fromDate: "", toDate: "", ccmNo: "", heatNo: "" };

const CCMProduction = () => {
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
    } catch (err) {
      console.error(err);
      alert("Failed to fetch CCM records");
    } finally { setLoading(false); }
  };

  const handleChange = (e) =>
    setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this CCM record?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      setResults((p) => p.filter((r) => r._id !== id));
    } catch { alert("Delete failed"); }
  };

  return (
    <div className="ccm-page">
      <ModuleNavbar />

      <div className="ccm-header">
        <div className="ccm-header-left">
          <button className="ccm-back-btn" onClick={() => navigate("/production")}>← Production</button>
          <div>
            <h2>CCM Production</h2>
            <span className="ccm-subtitle">Continuous Casting Machine — Liquid Steel → Billets</span>
          </div>
        </div>
        <button className="ccm-create-btn" onClick={() => navigate("/create-ccm-production")}>
          + Create CCM Entry
        </button>
      </div>

      {/* FILTERS — From Date, To Date, CCM No, Heat No */}
      <div className="ccm-card">
        <div className="ccm-section-title">🔍 Search Filters</div>
        <div className="ccm-filter-grid">
          {[
            { label: "From Date", name: "fromDate", type: "date" },
            { label: "To Date",   name: "toDate",   type: "date" },
            { label: "CCM No",    name: "ccmNo",    type: "text" },
            { label: "Heat No",   name: "heatNo",   type: "text" },
          ].map((f) => (
            <div className="ccm-field" key={f.name}>
              <label>{f.label}</label>
              <input type={f.type} name={f.name} value={filters[f.name]} onChange={handleChange} />
            </div>
          ))}
        </div>
        <div className="ccm-filter-actions">
          <button className="ccm-reset-btn" onClick={() => { setFilters(blank); fetchData(blank); }}>Reset</button>
          <button className="ccm-search-btn" onClick={() => fetchData(filters)}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {/* RESULTS */}
      <div className="ccm-card ccm-results-card">
        <div className="ccm-section-title">
          Records
          {results.length > 0 && <span className="ccm-count">{results.length} record(s)</span>}
        </div>

        {loading && <div className="ccm-placeholder">Loading…</div>}
        {!loading && searched && results.length === 0 && (
          <div className="ccm-placeholder">No CCM records found</div>
        )}
        {!loading && results.length > 0 && (
          <div className="ccm-table-wrap">
            <table className="ccm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>CCM No</th>
                  <th>Date</th>
                  <th>Shift</th>
                  <th>Heat No</th>
                  <th>Furnace No</th>
                  <th>Input (MT)</th>
                  <th>Billet Output (MT)</th>
                  <th>Bypass (MT)</th>
                  <th>Scrap (MT)</th>
                  <th>Yield %</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => (
                  <tr key={row._id || idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <button className="ccm-link-btn" onClick={() => navigate(`/ccm-detail/${row._id}`)}>
                        {row.ccmNo || "-"}
                      </button>
                    </td>
                    <td>{row.ccmDate || "-"}</td>
                    <td>{row.shift || "-"}</td>
                    <td>{row.heatNo || "-"}</td>
                    <td>{row.furnaceNo || "-"}</td>
                    <td>{row.inputQty || "-"}</td>
                    <td>{row.totalBilletQty || "-"}</td>
                    <td>
                      {row.totalBypassQty
                        ? <span className="ccm-bypass-tag">{row.totalBypassQty} MT</span>
                        : "-"}
                    </td>
                    <td>{row.scrapQty || "-"}</td>
                    <td>
                      {row.yieldPct != null
                        ? <span className="ccm-yield-badge">{row.yieldPct}%</span>
                        : "-"}
                    </td>
                    <td>
                      <span className={`ccm-status-badge ${(row.status || "").toLowerCase()}`}>
                        {row.status || "-"}
                      </span>
                    </td>
                    <td className="ccm-action-cell">
                      <button className="ccm-edit-btn" onClick={() => navigate(`/ccm-detail/${row._id}`)}>Edit</button>
                      <button className="ccm-del-btn" onClick={() => handleDelete(row._id)}>Delete</button>
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

export default CCMProduction;