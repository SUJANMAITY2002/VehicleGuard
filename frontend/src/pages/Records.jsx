import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Records.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const todayStr = () => new Date().toISOString().split("T")[0];

function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[+m - 1]} ${y}`;
}

function Records() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [vehicleEntries, setVehicleEntries] = useState([]);
  const [itemEntries,    setItemEntries]    = useState([]);
  const [fetching,       setFetching]       = useState(true);
  const [activeTab,      setActiveTab]      = useState("vehicle"); // "vehicle" | "item"
  const [search,         setSearch]         = useState("");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");

  const fetchAll = async () => {
    setFetching(true);
    try {
      const [v, i] = await Promise.all([
        axios.get(`${API}/api/entry/all`),
        axios.get(`${API}/api/item/all`),
      ]);
      setVehicleEntries(v.data);
      setItemEntries(i.data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm("Delete this vehicle entry?")) return;
    try {
      await axios.delete(`${API}/api/entry/${id}`);
      setVehicleEntries(prev => prev.filter(e => e._id !== id));
    } catch { alert("Error deleting."); }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete this item entry?")) return;
    try {
      await axios.delete(`${API}/api/item/${id}`);
      setItemEntries(prev => prev.filter(e => e._id !== id));
    } catch { alert("Error deleting."); }
  };

  // Filter helpers
  const applyFilters = (list, searchFields) => {
    const q = search.toLowerCase();
    return list.filter(e => {
      const matchSearch = searchFields.some(f => (e[f] || "").toLowerCase().includes(q));
      const matchFrom   = !dateFrom || (e.entryDate && e.entryDate >= dateFrom);
      const matchTo     = !dateTo   || (e.entryDate && e.entryDate <= dateTo);
      return matchSearch && matchFrom && matchTo;
    });
  };

  const filteredVehicle = applyFilters(vehicleEntries, ["entryNo", "vehicleNo", "particleNo"]);
  const filteredItem    = applyFilters(itemEntries,    ["entryNo", "vehicleNo", "itemName", "particleNo"]);

  // Stats
  const today = todayStr();
  const totalNetWeight = itemEntries.reduce((s, e) => s + (e.netWeight || 0), 0);
  const todayItems     = itemEntries.filter(e => e.entryDate === today).length;
  const todayVehicles  = vehicleEntries.filter(e => e.entryDate === today).length;

  const categoryMap = {};
  itemEntries.forEach(e => {
    categoryMap[e.itemCategory] = (categoryMap[e.itemCategory] || 0) + 1;
  });
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

  const hasDateFilter = dateFrom || dateTo;
  const clearDate = () => { setDateFrom(""); setDateTo(""); };

  if (!token) {
    return (
      <div className="page">
        <div className="locked-box" style={{ marginTop: 48 }}>
          <span>🔐</span>
          <h3>Login Required</h3>
          <p>Sign in to view records</p>
          <button className="btn-primary" onClick={() => navigate("/signin")}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Records & Dashboard</h1>
          <p className="page-sub">Complete view of all vehicle and item entries</p>
        </div>
        <button className="btn-outline" onClick={fetchAll}>↻ Refresh</button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon-wrap">🚛</div>
          <div>
            <div className="stat-big">{vehicleEntries.length}</div>
            <div className="stat-lbl">Total Vehicle Entries</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon-wrap">📦</div>
          <div>
            <div className="stat-big">{itemEntries.length}</div>
            <div className="stat-lbl">Total Item Entries</div>
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon-wrap">⚖️</div>
          <div>
            <div className="stat-big">{totalNetWeight.toFixed(0)} kg</div>
            <div className="stat-lbl">Total Net Weight</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon-wrap">📅</div>
          <div>
            <div className="stat-big">{todayVehicles}</div>
            <div className="stat-lbl">Today's Vehicles</div>
          </div>
        </div>
      </div>

      {/* Second stats row */}
      <div className="mini-stats-row">
        <div className="mini-stat">
          <span className="mini-label">Today's Item Entries</span>
          <span className="mini-value">{todayItems}</span>
        </div>
        <div className="mini-stat">
          <span className="mini-label">Top Category</span>
          <span className="mini-value">{topCategory ? topCategory[0] : "—"}</span>
        </div>
        <div className="mini-stat">
          <span className="mini-label">Avg Net Weight</span>
          <span className="mini-value">
            {itemEntries.length ? (totalNetWeight / itemEntries.length).toFixed(1) + " kg" : "—"}
          </span>
        </div>
      </div>

      {/* Table Card */}
      <div className="table-card">

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === "vehicle" ? "active" : ""}`}
            onClick={() => { setActiveTab("vehicle"); setSearch(""); }}
          >
            🚛 Vehicle Entries
            <span className="tab-count">{vehicleEntries.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "item" ? "active" : ""}`}
            onClick={() => { setActiveTab("item"); setSearch(""); }}
          >
            📦 Item Entries
            <span className="tab-count">{itemEntries.length}</span>
          </button>
        </div>

        {/* Controls */}
        <div className="table-controls-bar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input"
              placeholder={activeTab === "vehicle" ? "Search entry no, vehicle, particle…" : "Search entry no, vehicle, item…"}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="date-range-wrap">
            <input type="date" className="date-input" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} />
            <span className="range-sep">→</span>
            <input type="date" className="date-input" value={dateTo}
              onChange={e => setDateTo(e.target.value)} />
            {hasDateFilter && (
              <button className="clear-date-btn" onClick={clearDate}>✕</button>
            )}
          </div>
        </div>

        {fetching ? (
          <div className="state-box"><div className="spinner"></div><p>Loading records…</p></div>
        ) : activeTab === "vehicle" ? (
          filteredVehicle.length === 0 ? (
            <div className="state-box"><span>📋</span><p>No vehicle entries found</p></div>
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
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicle.map((e, i) => (
                    <tr key={e._id}>
                      <td className="td-num">{i + 1}</td>
                      <td><span className="entry-no-badge">{e.entryNo}</span></td>
                      <td className="td-date">{fmtDate(e.entryDate)}</td>
                      <td><strong className="vehicle-no">{e.vehicleNo}</strong></td>
                      <td className="td-muted">{e.particleNo}</td>
                      <td className="td-muted" style={{ fontSize: 12 }}>
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <button className="del-btn" onClick={() => handleDeleteVehicle(e._id)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredItem.length === 0 ? (
            <div className="state-box"><span>📦</span><p>No item entries found</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Entry No</th>
                    <th>Vehicle No</th>
                    <th>Particle No</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Without (kg)</th>
                    <th>With (kg)</th>
                    <th>Net (kg)</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItem.map((e, i) => (
                    <tr key={e._id}>
                      <td className="td-num">{i + 1}</td>
                      <td><span className="entry-no-badge">{e.entryNo}</span></td>
                      <td><strong className="vehicle-no">{e.vehicleNo}</strong></td>
                      <td className="td-muted">{e.particleNo}</td>
                      <td><strong>{e.itemName}</strong></td>
                      <td><span className="category-pill">{e.itemCategory}</span></td>
                      <td className="td-weight">{e.withoutItemWeight?.toFixed(2)}</td>
                      <td className="td-weight">{e.withItemWeight?.toFixed(2)}</td>
                      <td>
                        <span className={`net-pill ${e.netWeight > 0 ? "net-pos" : "net-neg"}`}>
                          {e.netWeight?.toFixed(2)}
                        </span>
                      </td>
                      <td className="td-date">{fmtDate(e.entryDate)}</td>
                      <td>
                        <button className="del-btn" onClick={() => handleDeleteItem(e._id)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default Records;