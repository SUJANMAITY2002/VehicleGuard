import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./InwardOutwardNote.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const GIN_API   = `${API_URL}/api/goods-inward-note`;
const PO_API    = `${API_URL}/api/purchase-orders`;
const PARTY_API = `${API_URL}/api/parties`;
const SITE_API  = `${API_URL}/api/sites`;
const TXN_API   = `${API_URL}/api/transactions`;

const STATUS_OPTIONS  = ["Open", "Convert", "Vout", "Closed"];
const ACTIVE_STATUSES = ["Open", "Convert", "Vout", "Weighted", "OutPending"];

const blankFilters = {
  fromDate: "", toDate: "", inOutType: "", status: "",
  ginNumber: "", poCpoNo: "", transactionCategory: "",
  partyCode: "", partyName: "", vehicleNo: "", site: "",
};

/* ── TypeAhead ── */
const TypeAhead = ({ value, onChange, suggestions, onSelect, placeholder, name }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = value
    ? suggestions.filter((s) => s?.toLowerCase().includes(value.toLowerCase()))
    : suggestions;
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <input
        type="text" name={name} value={value} autoComplete="off"
        onChange={(e) => { onChange(e); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder || "Type to search…"}
      />
      {show && filtered.length > 0 && (
        <ul style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)", margin: 0, padding: 0,
          listStyle: "none", maxHeight: 220, overflowY: "auto",
        }}>
          {filtered.map((s) => (
            <li key={s}
              onMouseDown={() => { onSelect(s); setShow(false); }}
              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#1e293b" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ── Intransit PO Modal ── */
const IntransitPOModal = ({ pos, onSelect, onClose }) => (
  <div className="gin-modal-overlay" onClick={onClose}>
    <div className="gin-modal" onClick={(e) => e.stopPropagation()}>
      <div className="gin-modal-header">
        <h3>Intransit Purchase Orders</h3>
        <button className="gin-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="gin-modal-body">
        {pos.length === 0 ? (
          <div className="gin-modal-empty">No Intransit POs found.</div>
        ) : (
          <table className="gin-modal-table">
            <thead>
              <tr>
                <th>PO No</th><th>PO Date</th><th>Party Name</th>
                <th>Site</th><th>Items</th><th>Net Amt</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po._id} className="gin-modal-po-row" onClick={() => onSelect(po)} title="Click to select this PO">
                  <td><span className="gin-modal-po-link">{po.poNo}</span></td>
                  <td>{po.poDate ? po.poDate.slice(0, 10) : "-"}</td>
                  <td>{po.partyName || "-"}</td>
                  <td>{po.site || "-"}</td>
                  <td>{po.items?.map((it) => it.itemName).join(", ") || "-"}</td>
                  <td>₹ {Number(po.netAmount || 0).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

const statusClass = (s) => {
  const map = {
    open:       "badge-open",
    convert:    "badge-convert",
    vout:       "badge-vout",
    weighted:   "badge-weighted",
    outpending: "badge-outpending",
    closed:     "badge-closed",
  };
  return map[(s || "").toLowerCase()] || "";
};

/* ── Vehicle Out Modal ── */
const VehicleOutModal = ({ row, onClose, onSave }) => {
  const [closedDate, setClosedDate] = useState(new Date().toISOString().slice(0, 10));
  const [closedTime, setClosedTime] = useState(new Date().toTimeString().slice(0, 5));

  const handleSave = () => {
    if (!closedDate || !closedTime) { alert("Both Closed Date and Closed Time are required"); return; }
    onSave(row, closedDate, closedTime);
  };

  return (
    <div className="gin-modal-overlay" onClick={onClose}>
      <div className="gin-vout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gin-modal-header">
          <h3>🚛 Mark Vehicle as Out</h3>
          <button className="gin-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="gin-vout-body">
          <div className="gin-vout-info">
            <span className="gin-vout-label">Vehicle No</span>
            <span className="gin-vout-value">{row.vehicleNo || "-"}</span>
            <span className="gin-vout-label">IN/OUT No</span>
            <span className="gin-vout-value">{row.ginNo || "-"}</span>
          </div>
          <div className="gin-vout-fields">
            <div className="gin-vout-field">
              <label>* Closed Date</label>
              <input type="date" value={closedDate} onChange={(e) => setClosedDate(e.target.value)} />
            </div>
            <div className="gin-vout-field">
              <label>* Closed Time</label>
              <input type="time" value={closedTime} onChange={(e) => setClosedTime(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="gin-vout-actions">
          <button className="gin-vout-cancel" onClick={onClose}>Cancel</button>
          <button className="gin-vout-save" onClick={handleSave}>Mark as Out (Closed)</button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
const InwardOutwardNote = () => {
  const navigate = useNavigate();

  const [filters,       setFilters]      = useState(blankFilters);
  const [results,       setResults]      = useState([]);
  const [loading,       setLoading]      = useState(false);
  const [showPOModal,   setShowPOModal]  = useState(false);
  const [intransitPOs,  setIntransitPOs] = useState([]);
  const [loadingPOs,    setLoadingPOs]   = useState(false);
  const [vOutRow,       setVOutRow]      = useState(null); // row being marked as Out

  const [parties, setParties] = useState([]);
  const [sites,   setSites]   = useState([]);
  const [transactionCategories, setTransactionCategories] = useState([]);

  useEffect(() => {
    fetchMasters();
    fetchData(blankFilters);
  }, []);

  const fetchMasters = async () => {
    try {
      const [partyRes, siteRes, txnRes] = await Promise.all([fetch(PARTY_API), fetch(SITE_API), fetch(TXN_API)]);
      const partyData = await partyRes.json();
      const siteData  = await siteRes.json();
      const txnData   = await txnRes.json();
      setParties(Array.isArray(partyData) ? partyData.filter((p) => p.status === "Active") : []);
      setSites(Array.isArray(siteData)    ? siteData.filter((s)  => s.status === "Active") : []);
      setTransactionCategories(
        (Array.isArray(txnData) ? txnData : []).filter(
          (t) => t.module === "Inventory" && t.businessEntity === "Inward/Outward" && t.status === "Open"
        )
      );
    } catch (err) { console.error("Master fetch error:", err); }
  };

  const txnCategoryLabels = [...new Set(transactionCategories.map((t) => t.categoryDescription).filter(Boolean))].sort();

  const partyNames = [...new Set([
    ...parties.map((p) => p.partyName),
    ...results.map((r) => r.partyName),
  ].filter(Boolean))].sort();

  const fetchData = async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) params.append(k, v); });
      if (!f.status) ACTIVE_STATUSES.forEach((s) => params.append("statusIn", s));
      const res  = await fetch(`${GIN_API}?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setResults([]); }
    finally { setLoading(false); }
  };

  const fetchIntransitPOs = async () => {
    setLoadingPOs(true);
    try {
      const [poRes, ginRes] = await Promise.all([fetch(PO_API), fetch(GIN_API)]);
      const poData  = await poRes.json();
      const ginData = await ginRes.json();
      const usedNos = new Set((Array.isArray(ginData) ? ginData : []).map((g) => g.poCpoNo).filter(Boolean));
      setIntransitPOs(Array.isArray(poData) ? poData.filter((p) => p.status === "Intransit" && !usedNos.has(p.poNo)) : []);
    } catch (err) { console.error(err); setIntransitPOs([]); }
    finally { setLoadingPOs(false); }
  };

  const handleOpenPOModal = async () => { setShowPOModal(true); await fetchIntransitPOs(); };
  const handlePOSelect    = (po) => { setShowPOModal(false); navigate("/create-goods-inward-note", { state: { fromPO: po } }); };
  const handleChange      = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleApply       = () => fetchData(filters);
  const handleReset       = () => { setFilters(blankFilters); fetchData(blankFilters); };

  /* ── Vehicle Out — save from modal ── */
  const handleVehicleOutSave = async (row, closedDate, closedTime) => {
    const exitTime = `${closedTime}:00`;
    const closedAt = new Date(`${closedDate}T${closedTime}:00`).toISOString();
    try {
      const res = await fetch(`${GIN_API}/${row._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, status: "Closed", closedDate, closedTime, exitTime, closedAt }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); return; }
      setVOutRow(null);
      setResults((p) => p.filter((r) => r._id !== row._id));
    } catch { alert("Vehicle Out failed"); }
  };

  /* ── Table columns ── */
  const COLS = [
    "#", "IN/OUT No", "Entry Date", "Entry Time", "PO No",
    "Type", "Transaction Category", "Party Code", "Party Name", "Vehicle No",
    "Challan No", "Challan Date", "Site", "Status",
    "Closed Date", "Closed Time", "Actions",
  ];

  const renderRow = (row, index) => (
    <tr
      key={row._id || index}
      className="gin-clickable-row"
      onClick={(e) => {
        const tag = e.target.tagName.toLowerCase();
        if (["button", "input", "select", "a"].includes(tag)) return;
        navigate(`/gin-detail/${row._id}`);
      }}
      title="Click row to view details"
    >
      <td className="gin-td-center gin-td-sno">{index + 1}</td>

      <td className="gin-td-nowrap">
        <button
          className="gin-no-link gin-no-highlight"
          onClick={(e) => { e.stopPropagation(); navigate(`/gin-detail/${row._id}`); }}
          title="View full details"
        >
          {row.ginNo || "-"}
        </button>
      </td>

      <td className="gin-td-nowrap">{row.ginDate    || "-"}</td>
      <td className="gin-td-nowrap">{row.entryTime  || "-"}</td>
      <td className="gin-td-nowrap">{row.poCpoNo    || "-"}</td>

      <td>
        <span className={`gin-entry-badge ${(row.inOutType || "").toLowerCase()}`}>
          {row.inOutType || "-"}
        </span>
      </td>

      <td>{row.transactionCategory || "-"}</td>

      <td>{row.partyCode        || "-"}</td>
      <td className="gin-td-party">{row.partyName  || "-"}</td>
      <td className="gin-td-nowrap gin-td-vehicle">{row.vehicleNo || "-"}</td>
      <td>{row.challanInvoiceNo || "-"}</td>
      <td className="gin-td-nowrap">{row.challanDate || "-"}</td>
      <td>{row.site             || "-"}</td>

      <td>
        <span className={`gin-status-badge ${statusClass(row.status)}`}>
          {row.status || "-"}
        </span>
      </td>

      <td className="gin-td-nowrap">{row.closedDate || "-"}</td>
      <td className="gin-td-nowrap">{row.closedTime || row.exitTime || "-"}</td>

      <td className="gin-action-cell" onClick={(e) => e.stopPropagation()}>
        {ACTIVE_STATUSES.includes(row.status) && (
          <button
            className="vehicle-out-btn"
            onClick={() => setVOutRow(row)}
            title="Mark vehicle as Out (Closed)"
          >
            🚛 Out
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <div className="gin-search-page">
      <ModuleNavbar />

      {/* ── HEADER ── */}
      <div className="gin-search-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="app-back-btn" onClick={() => navigate("/inventory")}>← Back</button>
          <h2>Inward Outward Note</h2>
        </div>
        <div className="gin-header-btns">
          <button className="insert-po-btn" onClick={handleOpenPOModal} title="Insert data from an Intransit PO">
            📋 Insert from PO
          </button>
          <button className="create-btn" onClick={() => navigate("/create-goods-inward-note")}>
            + Create
          </button>
        </div>
      </div>

      <div className="gin-body">

        {/* ── FILTER PANEL ── */}
        <div className="filter-panel">
          <div className="filter-section-title">Search Filters</div>
          <div className="filter-grid">

            <div className="filter-group">
              <label>From Date</label>
              <input type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} />
            </div>

            <div className="filter-group">
              <label>To Date</label>
              <input type="date" name="toDate" value={filters.toDate} onChange={handleChange} />
            </div>

            <div className="filter-group">
              <label>IN/OUT No</label>
              <input type="text" name="ginNumber" value={filters.ginNumber} onChange={handleChange} placeholder="Search IN/OUT No…" />
            </div>

            <div className="filter-group">
              <label>SO / PO No</label>
              <input type="text" name="poCpoNo" value={filters.poCpoNo} onChange={handleChange} placeholder="Search PO/SO No…" />
            </div>

            <div className="filter-group">
              <label>Transaction Category</label>
              <TypeAhead
                name="transactionCategory"
                value={filters.transactionCategory}
                onChange={handleChange}
                suggestions={txnCategoryLabels}
                onSelect={(val) => setFilters((p) => ({ ...p, transactionCategory: val }))}
                placeholder="Search transaction category…"
              />
            </div>

            <div className="filter-group">
              <label>Type (IN/OUT)</label>
              <select name="inOutType" value={filters.inOutType} onChange={handleChange}>
                <option value="">All</option>
                <option>Inward</option>
                <option>Outward</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Party Code</label>
              <input type="text" name="partyCode" value={filters.partyCode} onChange={handleChange} placeholder="Search party code…" />
            </div>

            <div className="filter-group">
              <label>Party Name</label>
              <TypeAhead
                name="partyName"
                value={filters.partyName}
                onChange={handleChange}
                suggestions={partyNames}
                onSelect={(val) => setFilters((p) => ({ ...p, partyName: val }))}
                placeholder="Search party name…"
              />
            </div>

            <div className="filter-group">
              <label>Vehicle No</label>
              <input type="text" name="vehicleNo" value={filters.vehicleNo} onChange={handleChange} placeholder="Search vehicle no…" />
            </div>

            <div className="filter-group">
              <label>Site</label>
              <select name="site" value={filters.site} onChange={handleChange}>
                <option value="">All Sites</option>
                {sites.map((s) => (
                  <option key={s._id || s.siteCode} value={s.siteCode}>
                    {s.siteCode} — {s.siteName}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleChange}>
                <option value="">Active Only (default)</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>

          <div className="filter-actions">
            <button className="reset-btn" onClick={handleReset}>Reset</button>
            <button className="apply-btn" onClick={handleApply}>{loading ? "Searching…" : "Apply"}</button>
          </div>
        </div>

        {/* ── RESULT TABLE ── */}
        <div className="result-area">
          {loading && <div className="result-placeholder">Loading…</div>}

          {!loading && results.length === 0 && (
            <div className="result-placeholder">
              No active vehicle records found. Use filters to search for Closed records.
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="result-table-wrap">
              <div className="gin-result-count">
                Showing <strong>{results.length}</strong> record{results.length !== 1 ? "s" : ""}
                {!filters.status && (
                  <span className="result-count-note"> — active vehicles only. Select "Closed" in Status to view closed records.</span>
                )}
              </div>
              <div className="gin-table-scroll">
                <table className="gin-table">
                  <thead>
                    <tr>{COLS.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => renderRow(row, i))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Intransit PO Modal ── */}
      {showPOModal && (
        <IntransitPOModal
          pos={loadingPOs ? [] : intransitPOs}
          onSelect={handlePOSelect}
          onClose={() => setShowPOModal(false)}
        />
      )}

      {/* ── Vehicle Out Modal ── */}
      {vOutRow && (
        <VehicleOutModal
          row={vOutRow}
          onClose={() => setVOutRow(null)}
          onSave={handleVehicleOutSave}
        />
      )}

      <style>{`
        /* ── Status badges ── */
        .gin-status-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .badge-open       { background: #dbeafe; color: #1d4ed8; }
        .badge-convert    { background: #ede9fe; color: #6d28d9; }
        .badge-vout       { background: #f0fdf4; color: #15803d; }
        .badge-weighted   { background: #ede9fe; color: #6d28d9; }
        .badge-outpending { background: #fef9c3; color: #a16207; }
        .badge-closed     { background: #f1f5f9; color: #64748b; }

        /* ── Entry type badges ── */
        .gin-entry-badge {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }
        .gin-entry-badge.inward  { background: #dbeafe; color: #1e40af; }
        .gin-entry-badge.outward { background: #fef3c7; color: #92400e; }

        /* ── Vehicle Out button ── */
        .vehicle-out-btn {
          padding: 4px 12px;
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fdba74;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.12s;
        }
        .vehicle-out-btn:hover { background: #ffedd5; }

        /* ── Clickable row ── */
        .gin-clickable-row { cursor: pointer; transition: background 0.1s; }
        .gin-clickable-row:hover td { background: #f0f6ff !important; }

        /* ── IN/OUT No pill ── */
        .gin-no-highlight {
          background: #dbeafe !important;
          color: #1d4ed8 !important;
          border: none !important;
          padding: 3px 10px !important;
          border-radius: 20px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          text-decoration: none !important;
          letter-spacing: 0.3px;
          white-space: nowrap;
          display: inline-block;
          transition: background 0.15s;
        }
        .gin-no-highlight:hover { background: #bfdbfe !important; color: #1e40af !important; }

        /* ── Result count ── */
        .gin-result-count {
          font-size: 12px;
          color: #64748b;
          padding: 10px 14px 8px;
        }
        .result-count-note { font-style: italic; color: #94a3b8; }

        /* ── Insert PO button ── */
        .insert-po-btn {
          padding: 7px 16px;
          background: #f0fdf4;
          color: #16a34a;
          border: 1.5px solid #86efac;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .insert-po-btn:hover { background: #dcfce7; border-color: #4ade80; }

        /* ── Header buttons group ── */
        .gin-header-btns { display: flex; gap: 10px; align-items: center; }

        /* ── Modals ── */
        .gin-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          z-index: 1000; display: flex; align-items: center; justify-content: center;
        }
        .gin-modal {
          background: #fff; border-radius: 12px; width: 90vw; max-width: 1100px;
          max-height: 80vh; display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
        }
        .gin-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 24px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;
        }
        .gin-modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #1e293b; }
        .gin-modal-close {
          background: none; border: none; font-size: 18px; cursor: pointer;
          color: #64748b; padding: 2px 6px; border-radius: 4px;
        }
        .gin-modal-close:hover { background: #f1f5f9; color: #ef4444; }
        .gin-modal-body { overflow-y: auto; flex: 1; padding: 16px 24px; }
        .gin-modal-empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }
        .gin-modal-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .gin-modal-table th {
          background: #f1f5f9; padding: 10px 12px; text-align: left;
          font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;
        }
        .gin-modal-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
        .gin-modal-po-row { cursor: pointer; transition: background 0.12s; }
        .gin-modal-po-row:hover td { background: #eff6ff !important; }
        .gin-modal-po-link {
          background: none; border: none; color: #2563eb; font-weight: 700;
          font-size: 13px; cursor: pointer; text-decoration: underline; padding: 0;
        }

        /* ── Vehicle Out Modal ── */
        .gin-vout-modal {
          background: #fff; border-radius: 12px; width: 420px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden;
        }
        .gin-vout-body { padding: 20px 24px; }
        .gin-vout-info {
          display: grid; grid-template-columns: auto 1fr;
          gap: 6px 14px; background: #f8fafc; border-radius: 8px;
          padding: 12px 16px; margin-bottom: 18px; font-size: 13px;
        }
        .gin-vout-label { font-weight: 700; color: #6b7a99; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; align-self: center; }
        .gin-vout-value { font-weight: 700; color: #1a2540; font-size: 13px; }
        .gin-vout-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .gin-vout-field { display: flex; flex-direction: column; gap: 4px; }
        .gin-vout-field label { font-size: 11px; font-weight: 700; color: #dc2626; text-transform: uppercase; letter-spacing: 0.4px; }
        .gin-vout-field input {
          height: 34px; border: 1.5px solid #fca5a5; border-radius: 6px;
          padding: 0 8px; font-size: 13px; background: #fff1f2; color: #1a2540; outline: none;
        }
        .gin-vout-field input:focus { border-color: #dc2626; }
        .gin-vout-actions {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 14px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc;
        }
        .gin-vout-cancel {
          padding: 8px 18px; background: #f1f5f9; color: #475569;
          border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;
          font-weight: 600; cursor: pointer;
        }
        .gin-vout-cancel:hover { background: #e2e8f0; }
        .gin-vout-save {
          padding: 8px 20px; background: #c2410c; color: #fff;
          border: none; border-radius: 6px; font-size: 13px;
          font-weight: 700; cursor: pointer;
        }
        .gin-vout-save:hover { background: #9a3412; }
      `}</style>
    </div>
  );
};

export default InwardOutwardNote;