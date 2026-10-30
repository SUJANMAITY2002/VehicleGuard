import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./ProductionRequestList.css";
import { API_URL } from "../../../../config";

/*
  PRODUCTION REQUEST — Step 3
  ─────────────────────────────
  No "Create" button: these are generated automatically by the backend
  when a Demand's Dispatch Date becomes tomorrow (see
  utils/productionRequestGenerator.js). One row per Demand ITEM, so a
  single Demand with 3 items produces 3 Production Requests.

  Every field captured on the Demand (party, transaction type, priority,
  dates, and the full item row) is carried through and shown here.

  Column filters work like Excel / Google Sheets: click the ▾ funnel in
  any header to get a searchable checklist of that column's own values —
  independent of the date-range / text filter card above.
*/

const API_BASE   = `${API_URL}/api/production-request`;
const DEMAND_API = `${API_URL}/api/demand/run-production-request-check`;
const STATUSES   = ["Pending", "In Production", "Completed"];
const CLEARED    = "__CLEARED__"; // marker meaning "user cleared all checkboxes for this column"

function fmtDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* Column definitions — key = field on the record, label = header text */
const COLUMNS = [
  { key: "productionRequestNo", label: "Production Request No." },
  { key: "demandNo",            label: "Demand No." },
  { key: "saudaNo",             label: "Sauda No." },
  { key: "partyName",           label: "Party Name" },
  { key: "transactionType",     label: "Txn Type" },
  { key: "demandDate",          label: "Demand Date",   isDate: true },
  { key: "dispatchDate",        label: "Dispatch Date", isDate: true },
  { key: "priority",            label: "Priority" },
  { key: "itemType",            label: "Item Type" },
  { key: "itemCode",            label: "Item Code" },
  { key: "itemName",            label: "Item Name" },
  { key: "size",                label: "Size" },
  { key: "length",              label: "Length" },
  { key: "qty",                 label: "Qty" },
  { key: "status",              label: "Status" },
];

const displayVal = (r, col) => {
  const raw = r[col.key];
  if (col.isDate) return fmtDate(raw);
  if (raw === undefined || raw === null || raw === "") return "-";
  return String(raw);
};

/* ── Excel-style column filter dropdown ── */
const ColumnFilterDropdown = ({ options, selected, onToggle, onSelectAll, onClear, onClose }) => {
  const [search, setSearch] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  const filteredOptions = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const clearedAll = selected.size === 1 && selected.has(CLEARED);
  const isChecked = (val) => (selected.size === 0 ? true : !clearedAll && selected.has(val));

  return (
    <div className="ss-colfilter-panel" ref={boxRef} onClick={(e) => e.stopPropagation()}>
      <input
        className="ss-colfilter-search"
        placeholder="Search values…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="ss-colfilter-actions-row">
        <button className="ss-colfilter-link" onClick={onSelectAll}>Select all</button>
        <button className="ss-colfilter-link" onClick={onClear}>Clear</button>
      </div>
      <div className="ss-colfilter-list">
        {filteredOptions.length === 0 && <div className="ss-colfilter-empty">No values</div>}
        {filteredOptions.map((val) => (
          <label key={val} className="ss-colfilter-item">
            <input type="checkbox" checked={isChecked(val)} onChange={() => onToggle(val)} />
            <span>{val}</span>
          </label>
        ))}
      </div>
      <button className="ss-colfilter-done" onClick={onClose}>OK</button>
    </div>
  );
};

const ProductionRequestList = () => {
  const navigate = useNavigate();
  const today    = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    fromDate: monthAgo,
    toDate: today,
    productionRequestNo: "",
    demandNo: "",
    saudaNo: "",
    status: "",
  });

  const [requests, setRequests] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [checking, setChecking] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  /* ── Column filters (Excel-style) — { colKey: Set(selectedDisplayValues) } ──
     An empty Set for a column means "no filter applied / show all". */
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterCol, setOpenFilterCol] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setRequests(data);
      setSearched(true);
    } catch {
      setError("Could not connect to server. Check that the backend is running.");
      setRequests([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load once on mount so the page isn't empty by default (it's a monitor view)
  useEffect(() => { fetchRequests(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  const clearField = (field) => setFilters((p) => ({ ...p, [field]: "" }));
  const clearAll = () => {
    setFilters({ fromDate: monthAgo, toDate: today, productionRequestNo: "", demandNo: "", saudaNo: "", status: "" });
    setColumnFilters({});
  };

  const runCheckNow = async () => {
    setChecking(true);
    try {
      const res = await fetch(DEMAND_API, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Check failed");
      alert(`Check complete — ${data.createdCount} new request(s) created.`);
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setChecking(false);
    }
  };

  const advanceStatus = async (req) => {
    const nextStatus = req.status === "Pending" ? "In Production"
                      : req.status === "In Production" ? "Completed"
                      : null;
    if (!nextStatus) return;

    setUpdatingId(req._id);
    try {
      const res = await fetch(`${API_BASE}/${req._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Column filter helpers ── */
  const getUniqueValues = (col) => {
    const vals = new Set(requests.map((r) => displayVal(r, col)));
    return Array.from(vals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const toggleFilterValue = (colKey, allValuesForCol, value) => {
    setColumnFilters((prev) => {
      const existing = prev[colKey];
      // Start from "all checked" (i.e. every value) if no filter set yet or user had cleared everything
      const base = (!existing || existing.size === 0 || (existing.size === 1 && existing.has(CLEARED)))
        ? new Set(allValuesForCol)
        : new Set(existing);

      if (base.has(value)) base.delete(value); else base.add(value);

      if (base.size === 0) return { ...prev, [colKey]: new Set([CLEARED]) };
      if (base.size === allValuesForCol.length) return { ...prev, [colKey]: new Set() }; // = no filter
      return { ...prev, [colKey]: base };
    });
  };

  const selectAllForCol = (colKey) => setColumnFilters((prev) => ({ ...prev, [colKey]: new Set() }));
  const clearForCol = (colKey) => setColumnFilters((prev) => ({ ...prev, [colKey]: new Set([CLEARED]) }));

  const isColActive = (colKey) => {
    const s = columnFilters[colKey];
    return !!(s && s.size > 0);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) =>
      COLUMNS.every((col) => {
        const set = columnFilters[col.key];
        if (!set || set.size === 0) return true;
        if (set.size === 1 && set.has(CLEARED)) return false;
        return set.has(displayVal(r, col));
      })
    );
  }, [requests, columnFilters]);

  const anyColumnFilterActive = Object.keys(columnFilters).some(isColActive);

  return (
    <div className="ss-page">

      <div className="ss-topbar">
        <div className="ss-topbar-left">
          <button className="ss-back-btn" onClick={() => navigate("/sales")}>← Production Request</button>
        </div>
        <div className="ss-topbar-right">
          <button className="ss-create-btn" onClick={runCheckNow} disabled={checking}>
            {checking ? "Checking…" : "↻ Run Check Now"}
          </button>
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
              <label className="ss-label">Production Request No.</label>
              <div className="ss-field-row">
                <input type="text" name="productionRequestNo" className="ss-input" placeholder="Search PR no." value={filters.productionRequestNo} onChange={handleChange} />
                {filters.productionRequestNo && <button className="ss-x" onClick={() => clearField("productionRequestNo")}>✕</button>}
              </div>
            </div>
            <div className="ss-input-wrap">
              <label className="ss-label">Demand No.</label>
              <div className="ss-field-row">
                <input type="text" name="demandNo" className="ss-input" placeholder="Search demand no." value={filters.demandNo} onChange={handleChange} />
                {filters.demandNo && <button className="ss-x" onClick={() => clearField("demandNo")}>✕</button>}
              </div>
            </div>
          </div>

          <div className="ss-filter-row ss-grid-row2">
            <div className="ss-input-wrap">
              <label className="ss-label">Sauda No.</label>
              <div className="ss-field-row">
                <input type="text" name="saudaNo" className="ss-input" placeholder="Search sauda no." value={filters.saudaNo} onChange={handleChange} />
                {filters.saudaNo && <button className="ss-x" onClick={() => clearField("saudaNo")}>✕</button>}
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
              <button className="ss-btn-search" onClick={fetchRequests} disabled={loading}>
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
              <p className="ss-empty-title">Loading…</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">🏭</div>
              <p className="ss-empty-title">No production requests yet</p>
              <p className="ss-empty-sub">They'll appear here automatically once a Demand's dispatch date is tomorrow.</p>
            </div>
          ) : (
            <>
              <div className="ss-count">
                {filteredRequests.length} of {requests.length} record{requests.length !== 1 ? "s" : ""} shown
                {anyColumnFilterActive && (
                  <button className="ss-colfilter-resetall" onClick={() => setColumnFilters({})}>
                    Reset column filters
                  </button>
                )}
              </div>
              <div className="ss-table-wrap">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {COLUMNS.map((col) => (
                        <th key={col.key}>
                          <div className="ss-th-with-filter">
                            <span>{col.label}</span>
                            <button
                              className={`ss-funnel-btn ${isColActive(col.key) ? "ss-funnel-active" : ""}`}
                              onClick={() => setOpenFilterCol(openFilterCol === col.key ? null : col.key)}
                              title="Filter"
                              type="button"
                            >
                              ▾
                            </button>
                            {openFilterCol === col.key && (
                              <ColumnFilterDropdown
                                options={getUniqueValues(col)}
                                selected={columnFilters[col.key] || new Set()}
                                onToggle={(val) => toggleFilterValue(col.key, getUniqueValues(col), val)}
                                onSelectAll={() => selectAllForCol(col.key)}
                                onClear={() => clearForCol(col.key)}
                                onClose={() => setOpenFilterCol(null)}
                              />
                            )}
                          </div>
                        </th>
                      ))}
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((r, i) => (
                      <tr key={r._id}>
                        <td>{i + 1}</td>
                        <td>{r.productionRequestNo}</td>
                        <td>{r.demandNo || "-"}</td>
                        <td>{r.saudaNo || "-"}</td>
                        <td>{r.partyName || "-"}</td>
                        <td>{r.transactionType || "-"}</td>
                        <td>{fmtDate(r.demandDate)}</td>
                        <td>{fmtDate(r.dispatchDate)}</td>
                        <td><span className={`ss-priority-${(r.priority || "medium").toLowerCase()}`}>{r.priority || "-"}</span></td>
                        <td>{r.itemType || "-"}</td>
                        <td>{r.itemCode || "-"}</td>
                        <td>{r.itemName || "-"}</td>
                        <td>{r.size || "-"}</td>
                        <td>{r.length || 0}</td>
                        <td>{r.qty} {r.unit}</td>
                        <td>
                          <span className={`ss-status-badge ss-status-${(r.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="ss-actions-cell">
                          {r.status !== "Completed" ? (
                            <button
                              className="ss-action-btn ss-edit"
                              onClick={() => advanceStatus(r)}
                              disabled={updatingId === r._id}
                            >
                              {updatingId === r._id
                                ? "Updating…"
                                : r.status === "Pending" ? "Start Production" : "Mark Completed"}
                            </button>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
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

export default ProductionRequestList;