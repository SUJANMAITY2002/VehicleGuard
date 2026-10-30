import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./PurchaseRequisition.css";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Converted to PO", "Closed"];
const PRIORITY_OPTIONS = ["All", "High", "Normal", "Low"];
const DEPT_OPTIONS = [
  "All", "Production", "Maintenance", "Stores", "Admin",
  "Accounts", "HR", "IT", "Quality", "Dispatch",
];

/* ── TypeAhead ── */
const TypeAhead = ({ value, onChange, suggestions, onSelect, placeholder }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = suggestions.filter((s) =>
    s?.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder || "Type to search…"}
        autoComplete="off"
        className="pr-search-input"
      />
      {show && value && filtered.length > 0 && (
        <ul className="pr-suggestion-list">
          {filtered.map((s) => (
            <li key={s} onMouseDown={() => { onSelect(s); setShow(false); }}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ── Dashboard Cards ── */
const DashCards = ({ counts }) => {
  const cards = [
    { label: "Pending",       value: counts.pending,   color: "#f59e0b", bg: "#fffbeb" },
    { label: "Approved",      value: counts.approved,  color: "#16a34a", bg: "#f0fdf4" },
    { label: "Converted",     value: counts.converted, color: "#2563eb", bg: "#eff6ff" },
    { label: "Closed",        value: counts.closed,    color: "#64748b", bg: "#f8fafc" },
    { label: "Urgent (High)", value: counts.urgent,    color: "#dc2626", bg: "#fef2f2" },
  ];

  return (
    <div className="pr-dash-row">
      {cards.map((c) => (
        <div
          key={c.label}
          className="pr-dash-card"
          style={{ borderLeft: `4px solid ${c.color}`, background: c.bg }}
        >
          <div className="pr-dash-num" style={{ color: c.color }}>{c.value ?? 0}</div>
          <div className="pr-dash-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
};

const PurchaseRequisition = () => {
  const navigate = useNavigate();

  const [orders,   setOrders]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [counts,   setCounts]   = useState({});

  const [srchPrNo,     setSrchPrNo]     = useState("");
  const [srchDept,     setSrchDept]     = useState("All");
  const [srchBy,       setSrchBy]       = useState("");
  const [srchStatus,   setSrchStatus]   = useState("All");
  const [srchPriority, setSrchPriority] = useState("All");
  const [srchSite,     setSrchSite]     = useState("");
  const [srchDateFrom, setSrchDateFrom] = useState("");
  const [srchDateTo,   setSrchDateTo]   = useState("");

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/purchase-requisitions`);
      setOrders(res.data);
      setFiltered(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchCounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/purchase-requisitions/dashboard`);
      if (res.data.success) setCounts(res.data.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchOrders(); fetchCounts(); }, []);

  const requestedByList = [...new Set(orders.map((o) => o.requestedBy).filter(Boolean))].sort();
  const siteList        = [...new Set(orders.map((o) => o.site).filter(Boolean))].sort();

  const handleSearch = () => {
    let f = [...orders];
    if (srchPrNo)                              f = f.filter((o) => o.prNo?.toLowerCase().includes(srchPrNo.toLowerCase()));
    if (srchDept && srchDept !== "All")        f = f.filter((o) => o.department === srchDept);
    if (srchBy)                                f = f.filter((o) => o.requestedBy?.toLowerCase().includes(srchBy.toLowerCase()));
    if (srchStatus && srchStatus !== "All")    f = f.filter((o) => o.status === srchStatus);
    if (srchPriority && srchPriority !== "All") f = f.filter((o) => o.priority === srchPriority);
    if (srchSite)                              f = f.filter((o) => o.site?.toLowerCase().includes(srchSite.toLowerCase()));
    if (srchDateFrom)                          f = f.filter((o) => o.prDate >= srchDateFrom);
    if (srchDateTo)                            f = f.filter((o) => o.prDate <= srchDateTo);
    setFiltered(f);
  };

  const handleReset = () => {
    setSrchPrNo(""); setSrchDept("All"); setSrchBy("");
    setSrchStatus("All"); setSrchPriority("All");
    setSrchSite(""); setSrchDateFrom(""); setSrchDateTo("");
    setFiltered(orders);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Purchase Requisition?")) return;
    try {
      await axios.delete(`${API_URL}/api/purchase-requisition/${id}`);
      fetchOrders();
      fetchCounts();
    } catch (err) { console.log(err); }
  };

  const priorityColor = (p) => {
    if (p === "High")   return { bg: "#fee2e2", fg: "#dc2626" };
    if (p === "Normal") return { bg: "#dbeafe", fg: "#2563eb" };
    if (p === "Low")    return { bg: "#dcfce7", fg: "#16a34a" };
    return { bg: "#f1f5f9", fg: "#64748b" };
  };

  const statusColor = (s) => {
    if (s === "Pending")         return { bg: "#fef3c7", fg: "#d97706" };
    if (s === "Approved")        return { bg: "#dcfce7", fg: "#16a34a" };
    if (s === "Converted to PO") return { bg: "#dbeafe", fg: "#2563eb" };
    if (s === "Closed")          return { bg: "#f1f5f9", fg: "#64748b" };
    if (s === "Cancelled")       return { bg: "#fee2e2", fg: "#dc2626" };
    return { bg: "#f1f5f9", fg: "#64748b" };
  };

  return (
    <div className="pr-page">
      <ModuleNavbar />

      {/* TOP BAR */}
      <div className="pr-topbar">
        <div className="pr-topbar-left">
          <button className="pr-back-btn" onClick={() => navigate("/procurement")}>←</button>
          <h1 className="pr-title">Purchase Requisition</h1>
        </div>
        <button className="pr-create-btn" onClick={() => navigate("/create-purchase-requisition")}>
          + Create PR
        </button>
      </div>

      {/* DASHBOARD */}
      <DashCards counts={counts} />

      {/* SEARCH CARD */}
      <div className="pr-search-card">
        <div className="pr-search-title">Search</div>

        <div className="pr-search-grid">
          <div className="pr-field">
            <label>PR No</label>
            <input
              type="text"
              className="pr-search-input"
              value={srchPrNo}
              onChange={(e) => setSrchPrNo(e.target.value)}
              placeholder="Search PR No…"
            />
          </div>

          <div className="pr-field">
            <label>Department</label>
            <select
              className="pr-search-input"
              value={srchDept}
              onChange={(e) => setSrchDept(e.target.value)}
            >
              {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="pr-field">
            <label>Requested By</label>
            <TypeAhead
              value={srchBy}
              onChange={setSrchBy}
              suggestions={requestedByList}
              onSelect={setSrchBy}
              placeholder="Type name…"
            />
          </div>

          <div className="pr-field">
            <label>Status</label>
            <select
              className="pr-search-input"
              value={srchStatus}
              onChange={(e) => setSrchStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="pr-field">
            <label>Priority</label>
            <select
              className="pr-search-input"
              value={srchPriority}
              onChange={(e) => setSrchPriority(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="pr-field">
            <label>Site</label>
            <TypeAhead
              value={srchSite}
              onChange={setSrchSite}
              suggestions={siteList}
              onSelect={setSrchSite}
              placeholder="Type site…"
            />
          </div>

          <div className="pr-field">
            <label>Date From</label>
            <input
              type="date"
              className="pr-search-input"
              value={srchDateFrom}
              onChange={(e) => setSrchDateFrom(e.target.value)}
            />
          </div>

          <div className="pr-field">
            <label>Date To</label>
            <input
              type="date"
              className="pr-search-input"
              value={srchDateTo}
              onChange={(e) => setSrchDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="pr-search-btns">
          <button className="pr-btn-search" onClick={handleSearch}>Search</button>
          <button className="pr-btn-reset"  onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="pr-table-card">
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>PR No</th>
                <th>Date</th>
                <th>Department</th>
                <th>Site</th>
                <th>Requested By</th>
                <th>Priority</th>
                <th>Required Date</th>
                <th>Items</th>
                <th>Status</th>
                <th>Converted PO</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((pr, i) => {
                  const sc = statusColor(pr.status);
                  const pc = priorityColor(pr.priority);
                  return (
                    <tr key={pr._id}>
                      <td>{i + 1}</td>
                      <td>
                        <button
                          className="pr-no-link"
                          onClick={() => navigate(`/purchase-requisition-detail/${pr._id}`)}
                          title="Click to view full details"
                        >
                          {pr.prNo}
                        </button>
                      </td>
                      <td>{pr.prDate ? pr.prDate.slice(0, 10) : ""}</td>
                      <td>{pr.department}</td>
                      <td>{pr.site}</td>
                      <td>{pr.requestedBy}</td>
                      <td>
                        <span
                          className="pr-priority-badge"
                          style={{ background: pc.bg, color: pc.fg }}
                        >
                          {pr.priority}
                        </span>
                      </td>
                      <td>{pr.requiredDate ? pr.requiredDate.slice(0, 10) : ""}</td>
                      <td>{pr.items?.map((it) => it.itemName).join(", ")}</td>
                      <td>
                        <span
                          className="pr-status-badge"
                          style={{ background: sc.bg, color: sc.fg }}
                        >
                          {pr.status}
                        </span>
                      </td>
                      <td>
                        {pr.convertedPONo ? (
                          <span className="pr-po-link">{pr.convertedPONo}</span>
                        ) : "-"}
                      </td>
                      <td>{pr.remarks}</td>
                      <td>
                        <button
                          className="pr-act-btn pr-view"
                          onClick={() => navigate(`/purchase-requisition-detail/${pr._id}`)}
                        >
                          View
                        </button>
                        {pr.status === "Approved" && !pr.convertedToPO && (
                          <button
                            className="pr-act-btn pr-convert"
                            onClick={() => navigate(`/purchase-requisition-detail/${pr._id}?tab=convert`)}
                          >
                            Gen PO
                          </button>
                        )}
                        <button
                          className="pr-act-btn pr-del"
                          onClick={() => handleDelete(pr._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="13" className="pr-no-data">No Purchase Requisitions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseRequisition;