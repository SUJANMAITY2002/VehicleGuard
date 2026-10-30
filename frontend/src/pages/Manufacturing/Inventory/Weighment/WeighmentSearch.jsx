import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./WeighmentSearch.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API     = `${API_URL}/api/weighment`;
const GIN_API = `${API_URL}/api/goods-inward-note`;

/* Status options updated per requirements: Draft, Partial, Submit, Weighted */
const STATUS_OPTIONS = ["Open", "Draft", "Saved", "Convert", "Closed"];

const blankFilters = {
  fromDate: "", toDate: "", weighmentNo: "", vehicleNo: "",
  inwardOutwardNoteNo: "", status: "", partyName: "", transactionType: "",
  transactionModule: "", transactionCategory: "",
};

const defaultFilters = { ...blankFilters, status: "" };

const WeighmentSearch = () => {
  const navigate = useNavigate();

  const [filters,        setFilters]        = useState(defaultFilters);
  const [results,        setResults]        = useState([]);
  const [searched,       setSearched]       = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [editId,         setEditId]         = useState(null);
  const [editRow,        setEditRow]        = useState({});
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  /* Transaction categories + modules fetched from the Transaction master
     (businessEntity === "Weighment"). categoryToModule maps a category's
     description back to its Module, so results can be filtered/labelled
     by Module even though Weighment records only store transactionCategory. */
  const [txCategories,    setTxCategories]    = useState([]);
  const [txModules,       setTxModules]       = useState([]);
  const [categoryToModule, setCategoryToModule] = useState({});

  useEffect(() => {
    fetchData(defaultFilters);
    fetchTxCategories();
  }, []);

  const fetchTxCategories = async () => {
    try {
      const res  = await axios.get(`${API_URL}/api/transactions`);
      const list = Array.isArray(res.data) ? res.data : [];
      const weighmentTx = list.filter(
        (tx) => tx.businessEntity === "Weighment" && (tx.status || "").toLowerCase() === "open"
      );

      const cats = weighmentTx.map((tx) => tx.categoryDescription).filter(Boolean).sort();
      setTxCategories(cats);

      const modules = [...new Set(weighmentTx.map((tx) => tx.module).filter(Boolean))].sort();
      setTxModules(modules);

      const map = {};
      weighmentTx.forEach((tx) => {
        if (tx.categoryDescription) map[tx.categoryDescription] = tx.module;
      });
      setCategoryToModule(map);
    } catch (err) {
      console.error("Failed to fetch transaction categories", err);
    }
  };

  /* ── Default active statuses shown on load / reset ── */
  const ACTIVE_STATUSES = ["Open", "Draft", "Convert", "Saved"];

  const fetchData = async (f) => {
    setLoading(true); setSearched(true);
    try {
      /* Build URLSearchParams so we can append multiple statusIn values.
         transactionModule has no column on Weighment records — it's derived
         from the linked Transaction Category, so it's applied client-side
         below rather than sent to the backend. */
      const params = new URLSearchParams();

      /* Add all non-empty non-status, non-module filters */
      Object.entries(f).forEach(([k, v]) => {
        if (k !== "status" && k !== "transactionModule" && v !== "") params.append(k, v);
      });

      if (f.status === "All") {
        /* "All" — send no status filter at all → backend returns everything */
      } else if (f.status) {
        /* Specific single status selected */
        params.append("status", f.status);
      } else {
        /* Default: show Open + Draft + Convert (active records) */
        ACTIVE_STATUSES.forEach((s) => params.append("statusIn", s));
      }

      const res = await axios.get(`${API}?${params.toString()}`);
      let data = res.data.data || [];

      if (f.transactionModule) {
        data = data.filter(
          (row) => categoryToModule[row.transactionCategory] === f.transactionModule
        );
      }

      setResults(data);
    } catch (err) {
      console.error(err); alert("Failed to fetch records");
    } finally { setLoading(false); }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  const handleApply = () => fetchData(filters);
  const handleReset = () => { setFilters(defaultFilters); fetchData(defaultFilters); };

  /* ── inline edit ── */
  const startEdit  = (row) => { setEditId(row._id); setEditRow({ ...row }); };
  const cancelEdit = ()    => { setEditId(null);    setEditRow({}); };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...editRow, [name]: value };
    if (name === "firstWeight" || name === "secondWeight") {
      const f = parseFloat(name === "firstWeight"  ? value : editRow.firstWeight  || 0) || 0;
      const s = parseFloat(name === "secondWeight" ? value : editRow.secondWeight || 0) || 0;
      updated.netWeight = String(Math.abs(f - s));
    }
    setEditRow(updated);
  };

  const saveEdit = async () => {
    if (!editRow.vehicleNo?.trim()) { alert("Vehicle Number is required"); return; }
    try {
      const res = await axios.put(`${API}/${editId}`, editRow);
      if (res.data.success) {
        setResults((prev) => prev.map((r) => (r._id === editId ? res.data.data : r)));
        setEditId(null); setEditRow({});
      } else { alert("Update failed: " + res.data.message); }
    } catch (err) { console.error(err); alert("Update failed"); }
  };

  /* No delete handler — Delete button removed per requirements */

  const openDetail = (row) =>
    navigate(`/weighment-detail/${row._id}`, { state: { allowEdit: true } });

  /* ─── Column set — Weighment No first, full row clickable ───
     Weighment No (first, highlighted), GIN/IN-OUT note, Vehicle No, Trans Type,
     Trans Category, Party Name, Net Weight, Status */
  const COLS = [
    { label: "#" },
    { label: "Weighment No",         field: "weighmentNo",         readOnly: true },
    { label: "Inward/Outward Note No", field: "inwardOutwardNoteNo", readOnly: true },
    { label: "Vehicle No",           field: "vehicleNo" },
    { label: "Trans Type",           field: "transactionType",     type: "select", opts: ["", "Inward", "Outward"] },
    { label: "Trans Category",       field: "transactionCategory", type: "select", opts: ["", "Purchase", "Sales"] },
    { label: "Party Name",           field: "partyName" },
    { label: "Net Weight (MT)",      field: "netWeight",           readOnly: true },
    { label: "Status",               field: "status",              type: "select", opts: ["", ...STATUS_OPTIONS] },
  ];

  const renderCell = (col, row) => {
    const isEditing = editId === row._id;
    const { field, type, opts, readOnly } = col;

    if (!isEditing) {
      return row[field] != null && row[field] !== "" ? row[field] : "-";
    }

    if (readOnly)
      return <input value={editRow[field] ?? ""} readOnly className="ws-inline ws-readonly" />;

    if (type === "select")
      return (
        <select name={field} value={editRow[field] ?? ""} onChange={handleEditChange} className="ws-inline">
          {opts.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}
        </select>
      );

    return (
      <input type={type || "text"} name={field} value={editRow[field] ?? ""}
        onChange={handleEditChange}
        className={`ws-inline${type === "date" ? " ws-date" : ""}`} />
    );
  };

  return (
    <div className="weighment-page">
      <ModuleNavbar />

      {/* HEADER — styled like InwardOutwardNote page */}
      <div className="gin-search-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="create-btn" style={{ background: "#2563eb" }} onClick={() => navigate("/")}>← Back</button>
          <h2 style={{ fontSize: 18, color: "#1e293b", fontWeight: 700, margin: 0 }}>Weighment</h2>
        </div>
        <div className="header-actions" style={{ display: "flex", gap: 12 }}>
          <div className="create-dropdown-wrap">
            <button className="create-btn" onClick={() => setShowCreateMenu((p) => !p)}>+ Create ▾</button>
            {showCreateMenu && (
              <div className="create-menu">
          <button
            className="create-menu-item"
            onClick={() => {
              setShowCreateMenu(false);
              navigate("/weighment/create/general");
            }}
          >
            Create
          </button>

          <button
            className="create-menu-item"
            onClick={() => {
              setShowCreateMenu(false);
              navigate("/weighment/create/inward");
            }}
          >
            Create From Inward
          </button>

          <button
            className="create-menu-item"
            onClick={() => {
              setShowCreateMenu(false);
              navigate("/weighment/create/outward");
            }}
          >
            Create From Outward
          </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH PANEL — ordered: From Date, To Date, Weighment No, Vehicle No, IN/OUT No, Status, Party Name, Trans Type, Trans Category */}
      <div className="search-panel">
        <div className="search-grid">

          <div className="field"><label>From Date</label>
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} /></div>

          <div className="field"><label>To Date</label>
            <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} /></div>

          <div className="field"><label>Weighment No</label>
            <input type="text" name="weighmentNo" value={filters.weighmentNo} onChange={handleFilterChange} /></div>

          <div className="field"><label>Vehicle No</label>
            <input type="text" name="vehicleNo" value={filters.vehicleNo} onChange={handleFilterChange} /></div>

          <div className="field"><label>Inward / Outward Note No</label>
            <input type="text" name="inwardOutwardNoteNo" value={filters.inwardOutwardNoteNo} onChange={handleFilterChange} placeholder="GIN/26-27/…" /></div>

          <div className="field"><label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">Active (Open, Draft, Convert, Saved)</option>
              <option value="All">All — Show Everything</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select></div>

          <div className="field"><label>Party Name</label>
            <input type="text" name="partyName" value={filters.partyName} onChange={handleFilterChange} /></div>

          <div className="field"><label>Transaction Type</label>
            <select name="transactionType" value={filters.transactionType} onChange={handleFilterChange}>
              <option value="">All</option><option>Inward</option><option>Outward</option>
            </select></div>

          <div className="field"><label>Transaction Module</label>
            <select name="transactionModule" value={filters.transactionModule} onChange={handleFilterChange}>
              <option value="">All</option>
              {txModules.map((m) => <option key={m}>{m}</option>)}
            </select></div>

          <div className="field"><label>Transaction Category</label>
            <select name="transactionCategory" value={filters.transactionCategory} onChange={handleFilterChange}>
              <option value="">All</option>
              {txCategories.map((c) => <option key={c}>{c}</option>)}
            </select></div>

        </div>

        <div className="bottom-actions">
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="reset-btn" onClick={handleReset}>Reset</button>
            <button className="apply-btn" onClick={handleApply}>{loading ? "Searching..." : "Apply"}</button>
          </div>
        </div>
      </div>

      {/* RESULT TABLE */}
      <div className="result-area">
        {loading && <div className="placeholder">Loading...</div>}
        {!loading && searched && results.length === 0 && <div className="placeholder">No records found</div>}

        {!loading && searched && results.length > 0 && (
          <div className="result-table-wrap">
            <div style={{
              padding: "8px 14px 6px",
              fontSize: 12, color: "#64748b",
              borderBottom: "1px solid #f1f5f9",
            }}>
              Showing <strong>{results.length}</strong> record{results.length !== 1 ? "s" : ""}
              {!filters.status && (
                <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                  {" "}— active only (Open, Draft, Convert, Saved). Select "All — Show Everything" to see all records.
                </span>
              )}
            </div>
            <table className="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Weighment No</th>
                  <th>Inward/Outward Note No</th>
                  <th>Vehicle No</th>
                  <th>Trans Type</th>
                  <th>Module</th>
                  <th>Trans Category</th>
                  <th>Party Name</th>
                  <th>Net Weight (MT)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, idx) => {
                  return (
                    <tr
                      key={row._id || idx}
                      onClick={() => openDetail(row)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{idx + 1}</td>
                      {/* Weighment No — highlighted */}
                      <td>
                        <span style={{
                          display: "inline-block",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          fontWeight: 700,
                          fontSize: 13,
                          padding: "3px 10px",
                          borderRadius: 6,
                          border: "1px solid #bfdbfe",
                          letterSpacing: "0.3px",
                          whiteSpace: "nowrap",
                        }}>
                          {row.weighmentNo || "—"}
                        </span>
                      </td>
                      <td>{row.inwardOutwardNoteNo || "—"}</td>
                      <td>{row.vehicleNo || "—"}</td>
                      <td>{row.transactionType || "—"}</td>
                      <td>{categoryToModule[row.transactionCategory] || "—"}</td>
                      <td>{row.transactionCategory || "—"}</td>
                      <td>{row.partyName || "—"}</td>
                      <td>{row.netWeight || "—"}</td>
                      <td>
                        {(() => {
                          const s = row.status || "";
                          const badgeStyle = {
                            display: "inline-block",
                            fontSize: 11, fontWeight: 700,
                            padding: "2px 9px", borderRadius: 20,
                            whiteSpace: "nowrap",
                            ...(s === "Open"    ? { background: "#dbeafe", color: "#1d4ed8" } :
                                s === "Draft"   ? { background: "#e0f2fe", color: "#0369a1" } :
                                s === "Saved"   ? { background: "#d1fae5", color: "#065f46" } :
                                s === "Convert" ? { background: "#ede9fe", color: "#6d28d9" } :
                                s === "Closed"  ? { background: "#f1f5f9", color: "#475569" } :
                                                  { background: "#f1f5f9", color: "#64748b" }),
                          };
                          return <span style={badgeStyle}>{s || "—"}</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeighmentSearch;