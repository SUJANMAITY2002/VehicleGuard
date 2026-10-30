import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./PurchaseOrder.css";

const STATUS_OPTIONS = ["All", "Ordered", "Intransit", "Convert", "Partial", "Closed", "Cancelled"];

/* Reusable typeahead */
const TypeAhead = ({ value, onChange, suggestions, onSelect, placeholder }) => {
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
        type="text" value={value} autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder || "Type to search…"}
        className="po-search-input"
      />
      {show && filtered.length > 0 && (
        <ul className="po-suggestion-list">
          {filtered.map((s, i) => (
            <li
              key={`${s}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); setShow(false); }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const PurchaseOrder = () => {
  const navigate = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [parties,  setParties]  = useState([]);
  const [transactionCategories, setTransactionCategories] = useState([]);

  const [srchPoNo,     setSrchPoNo]     = useState("");
  const [srchParty,    setSrchParty]    = useState("");
  const [srchTxnCat,   setSrchTxnCat]   = useState("");
  const [srchStatus,   setSrchStatus]   = useState("All");
  const [srchDateFrom, setSrchDateFrom] = useState("");
  const [srchDateTo,   setSrchDateTo]   = useState("");

  const ACTIVE_STATUSES = ["Ordered", "Intransit", "Convert", "Partial"];

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/purchase-orders`);
      setOrders(res.data);

      // Default view: show all in-progress POs
      const activePOs = res.data.filter((po) => ACTIVE_STATUSES.includes(po.status));
      setFiltered(activePOs);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchMasters = async () => {
    try {
      const partyRes = await axios.get(`${API_URL}/api/parties`);
      setParties(partyRes.data.filter((p) => p.status === "Active"));
    } catch (err) { console.log(err); }
    try {
      const txnRes = await axios.get(`${API_URL}/api/transactions`);
      setTransactionCategories(
        (txnRes.data || []).filter((t) => {
          if (t.status !== "Open") return false;
          const mod = (t.module || "").toLowerCase();
          const ent = (t.businessEntity || "").toLowerCase();
          return (
            mod.includes("purchase order") ||
            mod.includes("procurement") ||
            ent.includes("purchase order") ||
            ent === "po" ||
            ent === "req.po"
          );
        })
      );
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchOrders(); fetchMasters(); }, []);

  const partyNames = [...new Set(parties.map((p) => p.partyName).filter(Boolean))].sort();
  const txnCategoryLabels = [...new Set(transactionCategories.map((t) => t.categoryDescription).filter(Boolean))].sort();

  const handleSearch = () => {
    // When "All" selected apply the active-statuses default unless a specific status is chosen
    let f =
      srchStatus === "All"
        ? orders.filter((po) => ACTIVE_STATUSES.includes(po.status))
        : [...orders];

    if (srchPoNo)   f = f.filter((o) => o.poNo?.toLowerCase().includes(srchPoNo.toLowerCase()));
    if (srchParty)  f = f.filter((o) => o.partyName?.toLowerCase().includes(srchParty.toLowerCase()));
    if (srchTxnCat) f = f.filter((o) => o.transactionCategory?.toLowerCase().includes(srchTxnCat.toLowerCase()));
    if (srchStatus && srchStatus !== "All") f = f.filter((o) => o.status === srchStatus);
    if (srchDateFrom) f = f.filter((o) => o.poDate >= srchDateFrom);
    if (srchDateTo)   f = f.filter((o) => o.poDate <= srchDateTo);
    setFiltered(f);
  };

  const handleReset = () => {
    setSrchPoNo("");
    setSrchParty("");
    setSrchTxnCat("");
    setSrchStatus("All");
    setSrchDateFrom("");
    setSrchDateTo("");

    const activePOs = orders.filter((po) => ACTIVE_STATUSES.includes(po.status));
    setFiltered(activePOs);
  };

  const statusColor = (s) => {
    if (s === "Ordered")   return "#2563eb";
    if (s === "Intransit") return "#d97706";
    if (s === "Convert")   return "#7c3aed";
    if (s === "Partial")   return "#b45309";
    if (s === "Closed")    return "#16a34a";
    if (s === "Cancelled") return "#dc2626";
    return "#64748b";
  };

  return (
    <div className="po-page">
      <ModuleNavbar />

      {/* TOP BAR */}
      <div className="po-topbar">
        <div className="po-topbar-left">
          <button className="po-back-btn" onClick={() => navigate("/procurement")}>←</button>
          <h1 className="po-title">Purchase Order</h1>
        </div>
        <button className="po-create-btn" onClick={() => navigate("/create-purchase-order")}>
          + Create PO
        </button>
      </div>

      {/* SEARCH CARD */}
      <div className="po-search-card">
        <div className="po-search-title">Search</div>
        <div className="po-search-grid">

          <div className="po-field">
            <label>PO No</label>
            <input type="text" className="po-search-input" value={srchPoNo}
              onChange={(e) => setSrchPoNo(e.target.value)} placeholder="Search PO No…" />
          </div>

          <div className="po-field">
            <label>Party Name</label>
            <TypeAhead value={srchParty} onChange={setSrchParty}
              suggestions={partyNames} onSelect={setSrchParty} placeholder="Type party name…" />
          </div>

          <div className="po-field">
            <label>Transaction Category</label>
            <TypeAhead value={srchTxnCat} onChange={setSrchTxnCat}
              suggestions={txnCategoryLabels} onSelect={setSrchTxnCat} placeholder="Type transaction category…" />
          </div>

          <div className="po-field">
            <label>Status</label>
            <select className="po-search-input" value={srchStatus}
              onChange={(e) => setSrchStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="po-field">
            <label>Date From</label>
            <input type="date" className="po-search-input" value={srchDateFrom}
              onChange={(e) => setSrchDateFrom(e.target.value)} />
          </div>

          <div className="po-field">
            <label>Date To</label>
            <input type="date" className="po-search-input" value={srchDateTo}
              onChange={(e) => setSrchDateTo(e.target.value)} />
          </div>

        </div>
        <div className="po-search-btns">
          <button className="po-btn-search" onClick={handleSearch}>Search</button>
          <button className="po-btn-reset"  onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="po-table-card">
        <div className="po-table-wrap">
          <table className="po-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>PO No</th>
                <th>Date</th>
                <th>Party</th>
                <th>Transaction Category</th>
                <th>Type</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>ETA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((po, i) => (
                  <tr
                    key={po._id}
                    onClick={() => navigate(`/purchase-order-detail/${po._id}`)}
                    style={{ cursor: "pointer" }}
                    title="Click to view details"
                  >
                    <td>{i + 1}</td>
                    <td>
                      {/* PO No highlighted as a link-style text */}
                      <span
                        className="po-no-link"
                        style={{ pointerEvents: "none" }}
                      >
                        {po.poNo}
                      </span>
                    </td>
                    <td>{po.poDate ? po.poDate.slice(0, 10) : ""}</td>
                    <td>{po.partyName}</td>
                    <td>{po.transactionCategory || "-"}</td>
                    <td>{po.poType}</td>
                    <td>{po.items?.map((it) => it.itemName).filter(Boolean).join(", ") || "-"}</td>
                    <td>{po.items?.reduce((s, it) => s + Number(it.qty || 0), 0) || 0}</td>
                    <td>₹ {Number(po.netAmount || 0).toLocaleString("en-IN")}</td>
                    <td>{po.eta ? po.eta.slice(0, 10) : "-"}</td>
                    <td>
                      <span
                        className="po-status-badge"
                        style={{
                          background: statusColor(po.status) + "22",
                          color: statusColor(po.status),
                        }}
                      >
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="po-no-data">No Purchase Orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrder;