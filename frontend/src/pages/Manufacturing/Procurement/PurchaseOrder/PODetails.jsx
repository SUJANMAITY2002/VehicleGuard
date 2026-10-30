import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./PODetails.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const PO_API         = `${API_URL}/api/purchase-order`;
const STATUS_OPTIONS = ["Ordered", "Intransit", "Convert", "Partial", "Closed", "Cancelled"];
const PAYMENT_MODES  = ["Cash", "Cheque", "NEFT/RTGS", "UPI", "Credit", "LC"];
const TABS           = ["Items", "Service", "Charges / Discount", "Tax Details"];

const statusColor = (s) => {
  if (s === "Ordered")   return { bg: "#dbeafe", fg: "#1d4ed8" };
  if (s === "Intransit") return { bg: "#fef3c7", fg: "#d97706" };
  if (s === "Convert")   return { bg: "#ede9fe", fg: "#6d28d9" };
  if (s === "Partial")   return { bg: "#fef9c3", fg: "#854d0e" };
  if (s === "Closed")    return { bg: "#dcfce7", fg: "#16a34a" };
  if (s === "Cancelled") return { bg: "#fee2e2", fg: "#dc2626" };
  return { bg: "#f1f5f9", fg: "#64748b" };
};

const blankServiceRow = () => ({ serviceCode: "", serviceName: "", qty: "", rate: "", amount: "" });
const blankChargeRow  = () => ({ code: "", description: "", amount: "" });
const blankTaxRow     = () => ({ taxType: "", taxCode: "", taxName: "", totalTax: "", amount: "" });

/* ══════════════════════════════════════════════════════
   PORTAL ITEM TYPEAHEAD
   Dropdown renders on <body> — never clipped by table overflow.
   Identical pattern to CreateItemConversion / CreatePurchaseOrder.
══════════════════════════════════════════════════════ */
const PortalItemTypeAhead = ({ value, onChange, items, onSelectItem, placeholder, className }) => {
  const [show,   setShow]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = items.filter((item) => {
    if (!value) return true;
    const q = value.toLowerCase();
    return item.itemName?.toLowerCase().includes(q) || item.itemCode?.toLowerCase().includes(q);
  }).slice(0, 12);

  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect       = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH      = Math.min(filtered.length * 34 + 8, 220);
    const goUp       = spaceBelow < dropH + 8;
    setCoords({
      left:  rect.left,
      width: rect.width,
      top:   goUp ? rect.top - dropH - 2 : rect.bottom + 2,
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!show) return;
    calcCoords();
    window.addEventListener("scroll", calcCoords, true);
    window.addEventListener("resize", calcCoords);
    return () => {
      window.removeEventListener("scroll", calcCoords, true);
      window.removeEventListener("resize", calcCoords);
    };
  }, [show, calcCoords]);

  useEffect(() => {
    const h = (e) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        listRef.current  && !listRef.current.contains(e.target)
      ) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dropdown = show && filtered.length > 0
    ? ReactDOM.createPortal(
        <ul
          ref={listRef}
          style={{
            position: "fixed", top: coords.top, left: coords.left, width: Math.max(coords.width, 220),
            zIndex: 99999, background: "#fff", border: "1.5px solid #93c5fd",
            borderRadius: 6, listStyle: "none", margin: 0, padding: "4px 0",
            maxHeight: 220, overflowY: "auto",
            boxShadow: "0 8px 24px rgba(37,99,235,0.15)", scrollbarWidth: "thin",
          }}
        >
          {filtered.map((item, i) => (
            <li
              key={item._id || i}
              onMouseDown={(e) => { e.preventDefault(); onSelectItem(item); setShow(false); }}
              style={{
                padding: "7px 12px", fontSize: 12, cursor: "pointer",
                borderBottom: "1px solid #f1f5f9", color: "#1e293b",
                display: "flex", justifyContent: "space-between", gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#1e293b"; }}
            >
              <span>{item.itemName}</span>
              <span style={{ opacity: 0.5, fontSize: "0.82em", whiteSpace: "nowrap" }}>
                {item.itemCode}{item.uom ? ` · ${item.uom}` : ""}
              </span>
            </li>
          ))}
        </ul>,
        document.body
      )
    : null;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={className || "pod-item-input"}
        style={{ width: "100%", boxSizing: "border-box" }}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }}
        placeholder={placeholder || "Search item…"}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
};

const PODetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  /* masters */
  const [sites,         setSites]         = useState([]);
  const [serviceMaster, setServiceMaster] = useState([]);
  const [chargesMaster, setChargesMaster] = useState([]);
  const [taxMaster,     setTaxMaster]     = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [allItems,      setAllItems]      = useState([]);

  /* PO state */
  const [po,      setPo]      = useState(null);
  const [edit,    setEdit]    = useState({});
  const [editing, setEditing] = useState(true);   // always in edit mode
  const [isDirty,  setIsDirty] = useState(false);  // unsaved changes flag
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  /* active tab */
  const [activeTab, setActiveTab] = useState("Items");

  /* ── load ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [poRes, siteRes, svcRes, chgRes, taxRes, catRes, itemRes] = await Promise.all([
          axios.get(`${PO_API}/${id}`),
          axios.get(`${API_URL}/api/sites`),
          axios.get(`${API_URL}/api/service-master`),
          axios.get(`${API_URL}/api/charges-master`),
          axios.get(`${API_URL}/api/tax-details`),
          axios.get(`${API_URL}/api/item-categories`),
          axios.get(`${API_URL}/api/items`),
        ]);
        const data = poRes.data;
        setPo(data);
        setEdit(JSON.parse(JSON.stringify(data)));
        setSites(siteRes.data.filter((s) => s.status === "Active"));
        setServiceMaster(svcRes.data.filter((s) => s.status === "Active"));
        setChargesMaster(chgRes.data.filter((c) => c.status === "Active"));
        setTaxMaster(taxRes.data.filter((t) => t.status === "Active"));
        setCategories(catRes.data.filter((c) => c.status === "Active"));
        setAllItems(itemRes.data.filter((i) => i.status === "Active"));
      } catch (err) {
        console.error(err);
        setError("Failed to load Purchase Order");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const categoryNames = [...new Set(categories.map((c) => c.categoryName).filter(Boolean))].sort();

  /* cancel edit */
  // Edit/Cancel removed — page is always editable

  /* save */
  const savePo = async () => {
    setSaving(true);
    try {
      const itemBasic = (edit.items      || []).reduce((s, r) => s + Number(r.basicAmount || 0), 0);
      const itemQty   = (edit.items      || []).reduce((s, r) => s + Number(r.qty || 0), 0);
      const svcTotal  = (edit.serviceRows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const chgTotal  = (edit.chargeRows  || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const taxTotal  = (edit.taxRows     || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const payload   = { ...edit, basicAmount: itemBasic, totalQty: itemQty, netAmount: itemBasic + svcTotal + chgTotal + taxTotal };
      const res = await axios.put(`${PO_API}/${id}`, payload);
      if (res.data.success) {
        const updated = res.data.data;
        setPo(updated);
        setEdit(JSON.parse(JSON.stringify(updated)));
        setIsDirty(false);
        alert("Purchase Order Updated Successfully");
      }
    } catch (err) {
      console.error(err);
      alert("Update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  /* header field change */
  const hc = (name, value) => { setIsDirty(true); setEdit((p) => ({ ...p, [name]: value })); };

  /* item helpers */
  const itemsForRow = (rowIdx) => {
    const cat  = (edit.items || [])[rowIdx]?.itemCategory;
    return cat ? allItems.filter((i) => i.category === cat) : allItems;
  };

  const updateItem = (idx, field, value) => {
    const items = [...(edit.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "qty" || field === "rate") {
      const q = Number(field === "qty"  ? value : items[idx].qty  || 0);
      const r = Number(field === "rate" ? value : items[idx].rate || 0);
      items[idx].basicAmount = q && r ? (q * r).toFixed(2) : "";
    }
    setIsDirty(true);
    setEdit((p) => ({ ...p, items }));
  };

  /* Portal item select — fills name, code, uom */
  const handleItemSelect = (idx, item) => {
    const items = [...(edit.items || [])];
    items[idx] = {
      ...items[idx],
      itemName:     item.itemName  || "",
      itemCode:     item.itemCode  || "",
      uom:          item.uom       || "",
      itemCategory: item.category  || items[idx].itemCategory,
    };
    const q = Number(items[idx].qty  || 0);
    const r = Number(items[idx].rate || 0);
    items[idx].basicAmount = q && r ? (q * r).toFixed(2) : "";
    setIsDirty(true);
    setEdit((p) => ({ ...p, items }));
  };

  /* service helpers */
  const updateSvc = (idx, field, value) => {
    const rows = [...(edit.serviceRows || [])];
    rows[idx] = { ...rows[idx], [field]: value };
    if (field === "serviceCode") { const s = serviceMaster.find((x) => x.serviceCode === value); if (s) rows[idx].serviceName = s.serviceDetails || ""; }
    if (field === "qty" || field === "rate") { const q = Number(field === "qty" ? value : rows[idx].qty || 0); const r = Number(field === "rate" ? value : rows[idx].rate || 0); rows[idx].amount = q && r ? (q * r).toFixed(2) : ""; }
    setIsDirty(true);
    setEdit((p) => ({ ...p, serviceRows: rows }));
  };

  /* charge helpers */
  const updateChg = (idx, field, value) => {
    const rows = [...(edit.chargeRows || [])];
    rows[idx] = { ...rows[idx], [field]: value };
    if (field === "code") { const c = chargesMaster.find((x) => x.code === value); if (c) rows[idx].description = c.details || ""; }
    setIsDirty(true);
    setEdit((p) => ({ ...p, chargeRows: rows }));
  };

  /* tax helpers */
  const updateTax = (idx, field, value) => {
    const rows = [...(edit.taxRows || [])];
    rows[idx] = { ...rows[idx], [field]: value };
    if (field === "taxCode") { const t = taxMaster.find((x) => x.taxCode === value); if (t) { rows[idx].taxType = t.taxType || ""; rows[idx].taxName = t.taxName || ""; rows[idx].totalTax = t.percentage ? `${t.percentage}%` : ""; } }
    setIsDirty(true);
    setEdit((p) => ({ ...p, taxRows: rows }));
  };

  /* computed totals */
  const src = edit;   // always editing
  const itemBasic = (src?.items       || []).reduce((s, r) => s + Number(r.basicAmount || 0), 0);
  const totalQty  = (src?.items       || []).reduce((s, r) => s + Number(r.qty || 0), 0);
  const svcTotal  = (src?.serviceRows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const chgTotal  = (src?.chargeRows  || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const taxTotal  = (src?.taxRows     || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const grandTotal = itemBasic + svcTotal + chgTotal + taxTotal;

  const tabBadge = (tab) => {
    if (tab === "Items")              return itemBasic > 0 ? itemBasic.toFixed(0) : null;
    if (tab === "Service")            return svcTotal  > 0 ? svcTotal.toFixed(0)  : null;
    if (tab === "Charges / Discount") return chgTotal  > 0 ? chgTotal.toFixed(0)  : null;
    if (tab === "Tax Details")        return taxTotal  > 0 ? taxTotal.toFixed(0)  : null;
    return null;
  };

  /* ── Export to Inward — navigate to CreateGIN with PO data pre-filled ── */
  const handleExportToInward = () => {
    navigate("/create-goods-inward-note", { state: { fromPO: po } });
  };

  /* display helper (read mode) */
  const V = (field) => po?.[field] || "-";

  if (loading) return <div className="pod-page"><ModuleNavbar /><div className="pod-loading">Loading…</div></div>;
  if (error)   return <div className="pod-page"><ModuleNavbar /><div className="pod-error">{error}</div></div>;

  const currentStatus = editing ? edit.status : po?.status;
  const sc = statusColor(currentStatus);

  return (
    <div className="pod-page">
      <ModuleNavbar />

      {/* PAGE HEADER */}
      <div className="pod-header">
        <button className="pod-back-btn" onClick={() => navigate("/purchase-order")}>← Back</button>
        <div className="pod-header-title">
          <h2>Purchase Order Detail</h2>
          <span className="pod-pono-badge">{po?.poNo}</span>
        </div>
        <div className="pod-header-meta">
          <span className="pod-status-pill" style={{ background: sc.bg, color: sc.fg }}>
            {currentStatus || "-"}
          </span>
        </div>
      </div>

      {/* ══════ ORDER DETAILS CARD ══════ */}
      <div className="pod-card">
        <div className="pod-card-header">
          <div className="pod-card-title">📋 Order Details</div>
        </div>

        <div className="pod-grid">

          <div className="pod-field">
            <div className="pod-label">Transaction Category</div>
            <div className="pod-value">{po?.transactionCategory || "-"}</div>
          </div>

          <div className="pod-field">
            <div className="pod-label">PO No</div>
            <div className="pod-value pod-mono">{po?.poNo || "-"}</div>
          </div>

          <div className="pod-field">
            <div className="pod-label">PO Date</div>
            {editing
              ? <input className="pod-input" type="date" value={edit.poDate || ""} onChange={(e) => hc("poDate", e.target.value)} />
              : <div className="pod-value">{po?.poDate ? po.poDate.slice(0, 10) : "-"}</div>}
          </div>

          <div className="pod-field">
            <div className="pod-label">PO Type</div>
            {editing
              ? <select className="pod-input" value={edit.poType || ""} onChange={(e) => hc("poType", e.target.value)}>
                  <option value="">- Select -</option><option value="T">T</option><option value="UT">UT</option>
                </select>
              : <div className="pod-value">{V("poType")}</div>}
          </div>

          <div className="pod-field">
            <div className="pod-label">Party Code</div>
            <div className="pod-value">{V("partyCode")}</div>
          </div>

          <div className="pod-field">
            <div className="pod-label">Party Name</div>
            <div className="pod-value">{V("partyName")}</div>
          </div>

          <div className="pod-field">
            <div className="pod-label">Site</div>
            {editing
              ? <select className="pod-input" value={edit.site || ""} onChange={(e) => hc("site", e.target.value)}>
                  <option value="">- Select -</option>
                  {sites.map((s) => <option key={s._id} value={s.siteCode}>{s.siteCode} - {s.siteName}</option>)}
                </select>
              : <div className="pod-value">{V("site")}</div>}
          </div>

          <div className="pod-field">
            <div className="pod-label">Payment Mode</div>
            {editing
              ? <select className="pod-input" value={edit.paymentMode || ""} onChange={(e) => hc("paymentMode", e.target.value)}>
                  <option value="">- Select -</option>
                  {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              : <div className="pod-value">{V("paymentMode")}</div>}
          </div>

          <div className="pod-field">
            <div className="pod-label">ETA</div>
            {editing
              ? <input className="pod-input" type="date" value={edit.eta || ""} onChange={(e) => hc("eta", e.target.value)} />
              : <div className="pod-value">{po?.eta ? po.eta.slice(0, 10) : "-"}</div>}
          </div>

          <div className="pod-field">
            <div className="pod-label">Due Date</div>
            {editing
              ? <input className="pod-input" type="date" value={edit.dueDate || ""} onChange={(e) => hc("dueDate", e.target.value)} />
              : <div className="pod-value">{po?.dueDate ? po.dueDate.slice(0, 10) : "-"}</div>}
          </div>

          {/* Status — always a dropdown (main reason to open this page) */}
          <div className="pod-field">
            <div className="pod-label">Status</div>
            <select
              className="pod-input"
              value={editing ? (edit.status || "") : (po?.status || "")}
              onChange={(e) => editing ? hc("status", e.target.value) : null}
              disabled={!editing}
              style={!editing ? { background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0" } : {}}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/*
            ── Export to Inward hint row (view mode only, Intransit status) ──
            Shows a subtle info banner below the status field so user knows
            the button in the header is available.
          */}
          {!editing && ["Intransit", "Convert", "Partial"].includes(po?.status) && (
            <div className="pod-field pod-field-full">
              <div style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                color: "#92400e",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span>📥</span>
                <span>This PO is <strong>{po?.status}</strong>. Use <strong>Export to Inward</strong> in the header to create an Inward Note with all PO data pre-filled.</span>
              </div>
            </div>
          )}

          <div className="pod-field pod-field-full">
            <div className="pod-label">Remarks</div>
            {editing
              ? <input className="pod-input" style={{ height: 34 }} value={edit.remarks || ""} onChange={(e) => hc("remarks", e.target.value)} />
              : <div className="pod-value">{V("remarks")}</div>}
          </div>

        </div>
      </div>

      {/* ══════ TABBED SECTION CARD ══════ */}
      <div className="pod-card cpo-tab-card">

        {/* Tab bar */}
        <div className="cpo-tab-bar">
          {TABS.map((tab) => {
            const badge = tabBadge(tab);
            return (
              <button key={tab}
                className={`cpo-tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}>
                {tab}
                {badge && <span className="cpo-tab-badge">₹{Number(badge).toLocaleString("en-IN")}</span>}
              </button>
            );
          })}
          <div className="cpo-tab-grand-total">
            <span style={{ marginRight: 18 }}>Total Qty: <strong>{totalQty.toLocaleString("en-IN")}</strong></span>
            Grand Total: <strong>₹ {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* ── ITEMS panel ── */}
        {activeTab === "Items" && (
          <div className="cpo-tab-panel">
            <div className="pod-items-wrap">
              <table className="pod-items-table">
                <thead>
                  <tr>
                    <th>S No</th>
                    <th>Item Category</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>UOM</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Basic Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(editing ? edit.items : po?.items)?.length > 0 ? (
                    (editing ? edit.items : po.items).map((item, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: "center", width: 36 }}>{item.sNo ?? i + 1}</td>
                        <td>
                          {editing
                            ? <select className="pod-item-input" value={item.itemCategory || ""} onChange={(e) => updateItem(i, "itemCategory", e.target.value)}>
                                <option value="">- Select -</option>
                                {categoryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            : item.itemCategory || "-"}
                        </td>
                        {/* Item Code — auto-filled, always read-only */}
                        <td>
                          {editing
                            ? <input className="pod-item-input" value={item.itemCode || ""} readOnly style={{ background: "#f8fafc" }} />
                            : item.itemCode || "-"}
                        </td>
                        {/* Item Name — Portal TypeAhead in edit mode */}
                        <td>
                          {editing
                            ? <PortalItemTypeAhead
                                value={item.itemName || ""}
                                onChange={(v) => updateItem(i, "itemName", v)}
                                items={itemsForRow(i)}
                                onSelectItem={(itm) => handleItemSelect(i, itm)}
                                placeholder="Search item…"
                                className="pod-item-input"
                              />
                            : item.itemName || "-"}
                        </td>
                        {/* UOM — auto-filled */}
                        <td>
                          {editing
                            ? <input className="pod-item-input" value={item.uom || ""} readOnly style={{ background: "#f8fafc", maxWidth: 60 }} />
                            : item.uom || "-"}
                        </td>
                        <td>
                          {editing
                            ? <input type="number" className="pod-item-input" value={item.qty ?? ""} style={{ maxWidth: 72 }} onChange={(e) => updateItem(i, "qty", e.target.value)} />
                            : item.qty ?? "-"}
                        </td>
                        <td>
                          {editing
                            ? <input type="number" className="pod-item-input" value={item.rate ?? ""} style={{ maxWidth: 80 }} onChange={(e) => updateItem(i, "rate", e.target.value)} />
                            : item.rate ?? "-"}
                        </td>
                        <td className="pod-amt-cell">{Number(item.basicAmount || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="pod-no-items">No items found</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="7" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Item Basic Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{itemBasic.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {editing && (
              <div className="cgin-insert-row-bar">
                <button className="cgin-insert-row-btn"
                  onClick={() => setEdit((p) => ({ ...p, items: [...(p.items || []), { sNo: (p.items || []).length + 1, itemCategory: "", itemCode: "", itemName: "", uom: "", qty: "", rate: "", basicAmount: "", netAmount: "", serviceCharge: 0, charges: 0, discount: 0 }] }))}>
                  + Add Row
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SERVICE panel ── */}
        {activeTab === "Service" && (
          <div className="cpo-tab-panel">
            <div className="pod-items-wrap">
              <table className="pod-items-table">
                <thead>
                  <tr>
                    <th>S No</th><th>Service Code</th><th>Service Name</th><th>Qty</th><th>Rate</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(editing ? edit.serviceRows : po?.serviceRows)?.length > 0 ? (
                    (editing ? edit.serviceRows : po.serviceRows).map((row, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: "center", width: 36 }}>{i + 1}</td>
                        <td>
                          {editing
                            ? <select className="pod-item-input" value={row.serviceCode || ""} onChange={(e) => updateSvc(i, "serviceCode", e.target.value)}>
                                <option value="">- Select -</option>
                                {serviceMaster.map((s) => <option key={s._id} value={s.serviceCode}>{s.serviceCode}</option>)}
                              </select>
                            : row.serviceCode || "-"}
                        </td>
                        <td>
                          {editing
                            ? <input className="pod-item-input" value={row.serviceName || ""} readOnly style={{ background: "#f8fafc" }} />
                            : row.serviceName || "-"}
                        </td>
                        <td>
                          {editing
                            ? <input type="number" className="pod-item-input" value={row.qty ?? ""} style={{ maxWidth: 72 }} onChange={(e) => updateSvc(i, "qty", e.target.value)} />
                            : row.qty ?? "-"}
                        </td>
                        <td>
                          {editing
                            ? <input type="number" className="pod-item-input" value={row.rate ?? ""} style={{ maxWidth: 80 }} onChange={(e) => updateSvc(i, "rate", e.target.value)} />
                            : row.rate ?? "-"}
                        </td>
                        <td className="pod-amt-cell">{Number(row.amount || 0).toLocaleString("en-IN")}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="pod-no-items">No service rows</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Service Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{svcTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {editing && (
              <div className="cgin-insert-row-bar">
                <button className="cgin-insert-row-btn" onClick={() => setEdit((p) => ({ ...p, serviceRows: [...(p.serviceRows || []), blankServiceRow()] }))}>+ Add Row</button>
              </div>
            )}
          </div>
        )}

        {/* ── CHARGES panel ── */}
        {activeTab === "Charges / Discount" && (
          <div className="cpo-tab-panel">
            <div className="pod-items-wrap">
              <table className="pod-items-table">
                <thead>
                  <tr>
                    <th>S No</th><th>Code</th><th>Description</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(editing ? edit.chargeRows : po?.chargeRows)?.length > 0 ? (
                    (editing ? edit.chargeRows : po.chargeRows).map((row, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: "center", width: 36 }}>{i + 1}</td>
                        <td>
                          {editing
                            ? <select className="pod-item-input" value={row.code || ""} onChange={(e) => updateChg(i, "code", e.target.value)}>
                                <option value="">- Select -</option>
                                {chargesMaster.map((c) => <option key={c._id} value={c.code}>{c.code}</option>)}
                              </select>
                            : row.code || "-"}
                        </td>
                        <td>
                          {editing
                            ? <input className="pod-item-input" value={row.description || ""} readOnly style={{ background: "#f8fafc" }} />
                            : row.description || "-"}
                        </td>
                        <td className="pod-amt-cell">
                          {editing
                            ? <input type="number" className="pod-item-input" value={row.amount ?? ""} style={{ maxWidth: 90 }} onChange={(e) => updateChg(i, "amount", e.target.value)} />
                            : Number(row.amount || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="pod-no-items">No charge rows</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Charges Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{chgTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {editing && (
              <div className="cgin-insert-row-bar">
                <button className="cgin-insert-row-btn" onClick={() => setEdit((p) => ({ ...p, chargeRows: [...(p.chargeRows || []), blankChargeRow()] }))}>+ Add Row</button>
              </div>
            )}
          </div>
        )}

        {/* ── TAX panel ── */}
        {activeTab === "Tax Details" && (
          <div className="cpo-tab-panel">
            <div className="pod-items-wrap">
              <table className="pod-items-table">
                <thead>
                  <tr>
                    <th>S No</th><th>Tax Type</th><th>Tax Code</th><th>Tax Name</th><th>Total Tax %</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(editing ? edit.taxRows : po?.taxRows)?.length > 0 ? (
                    (editing ? edit.taxRows : po.taxRows).map((row, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: "center", width: 36 }}>{i + 1}</td>
                        <td>
                          {editing
                            ? <input className="pod-item-input" value={row.taxType || ""} readOnly style={{ background: "#f8fafc", maxWidth: 80 }} />
                            : row.taxType || "-"}
                        </td>
                        <td>
                          {editing
                            ? <select className="pod-item-input" value={row.taxCode || ""} onChange={(e) => updateTax(i, "taxCode", e.target.value)}>
                                <option value="">- Select -</option>
                                {taxMaster.map((t) => <option key={t._id} value={t.taxCode}>{t.taxCode}</option>)}
                              </select>
                            : row.taxCode || "-"}
                        </td>
                        <td>
                          {editing
                            ? <input className="pod-item-input" value={row.taxName || ""} readOnly style={{ background: "#f8fafc" }} />
                            : row.taxName || "-"}
                        </td>
                        <td>
                          {editing
                            ? <input className="pod-item-input" value={row.totalTax || ""} readOnly style={{ background: "#f8fafc", maxWidth: 70 }} />
                            : row.totalTax || "-"}
                        </td>
                        <td className="pod-amt-cell">
                          {editing
                            ? <input type="number" className="pod-item-input" value={row.amount ?? ""} style={{ maxWidth: 90 }} onChange={(e) => updateTax(i, "amount", e.target.value)} />
                            : Number(row.amount || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="pod-no-items">No tax rows</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Tax Total:</td>
                    <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{taxTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {editing && (
              <div className="cgin-insert-row-bar">
                <button className="cgin-insert-row-btn" onClick={() => setEdit((p) => ({ ...p, taxRows: [...(p.taxRows || []), blankTaxRow()] }))}>+ Add Row</button>
              </div>
            )}
          </div>
        )}

      </div>{/* end tab card */}

      {/* ══════ BOTTOM ACTION BAR ══════ */}
      <div className="cgin-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
        {/* Export to Inward — only for Intransit status AND after saving */}
        {po?.status === "Intransit" && (
          <button
            onClick={isDirty ? undefined : handleExportToInward}
            disabled={isDirty || saving}
            style={{
              background: isDirty ? "#9ca3af" : "#d97706",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: 6,
              cursor: isDirty ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: isDirty ? 0.6 : 1,
            }}
            title={isDirty ? "Save your changes first before exporting to Inward" : "Create Inward Note from this PO"}
          >
            📥 Export to Inward
            {isDirty && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.85 }}>(Save first)</span>}
          </button>
        )}

        {/* Save Changes — always visible; page is always in edit mode */}
        <button className="pod-save-btn btn-save" onClick={savePo} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default PODetail;