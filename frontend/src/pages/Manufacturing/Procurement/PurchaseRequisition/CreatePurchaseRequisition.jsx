import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./PurchaseRequisition.css";

const DEPT_OPTIONS   = ["Production", "Maintenance", "Stores", "Admin", "Accounts", "HR", "IT", "Quality", "Dispatch"];
const PRIORITY_OPT   = ["High", "Normal", "Low"];
const STATUS_OPTIONS = ["Pending", "Approved", "Closed"];

const emptyItem = () => ({
  itemCode:     "",
  itemName:     "",
  itemCategory: "",
  uom:          "",
  requiredQty:  "",
  remarks:      "",
});

/* ── Typeahead ── */
const TypeAhead = ({ value, onChange, suggestions, onSelect, placeholder, className }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = suggestions.filter((s) => s?.toLowerCase().includes(value.toLowerCase()));

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className || "cpr-input"}
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

const CreatePurchaseRequisition = () => {
  const navigate = useNavigate();

  /* ── header state ── */
  const [prNo,         setPrNo]         = useState("");
  const [prDate,       setPrDate]       = useState(new Date().toISOString().slice(0, 10));
  const [department,   setDepartment]   = useState("");
  const [site,         setSite]         = useState("");
  const [requestedBy,  setRequestedBy]  = useState("");
  const [priority,     setPriority]     = useState("Normal");
  const [requiredDate, setRequiredDate] = useState("");
  const [status,       setStatus]       = useState("Pending");
  const [remarks,      setRemarks]      = useState("");

  /* ── items ── */
  const [items, setItems] = useState([emptyItem()]);

  /* ── masters ── */
  const [itemMaster,    setItemMaster]    = useState([]);
  const [categoryList,  setCategoryList]  = useState([]);
  const [uomList,       setUomList]       = useState([]);
  const [siteList,      setSiteList]      = useState([]);

  /* ── inventory stock (for warning) ── */
  const [stockMap,      setStockMap]      = useState({});

  const [saving,        setSaving]        = useState(false);
  const [seqError,      setSeqError]      = useState("");

  /* ── load masters ── */
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [itemsRes, uomRes, siteRes] = await Promise.all([
          axios.get(`${API_URL}/api/items`),
          axios.get(`${API_URL}/api/uoms`),
          axios.get(`${API_URL}/api/sites`),
        ]);
        const activeItems = (itemsRes.data || []).filter((i) => i.status === "Active");
        setItemMaster(activeItems);
        setCategoryList([...new Set(activeItems.map((i) => i.itemCategory).filter(Boolean))].sort());
        setUomList((uomRes.data || []).filter((u) => u.status === "Active").map((u) => u.uomName));
        setSiteList((siteRes.data || []).filter((s) => s.status === "Active").map((s) => s.siteName || s.name));
      } catch (err) { console.log("Masters load error:", err); }
    };
    loadMasters();
  }, []);

  /* ── fetch next PR sequence ── */
  useEffect(() => {
    const fetchSeq = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/purchase-requisition/next-sequence`, {
          params: { module: "Procurement", businessEntity: "PurchaseRequisition", entityPrefix: "PR" },
        });
        if (res.data.success) {
          setPrNo(res.data.nextCode);
          setSeqError("");
        }
      } catch (err) {
        setSeqError(err.response?.data?.message || "Could not fetch PR sequence. Enter manually.");
        setPrNo("");
      }
    };
    fetchSeq();
  }, []);

  /* ── item helpers ── */
  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };

    /* auto-fill UOM and category from item master */
    if (field === "itemName") {
      const found = itemMaster.find((im) => im.itemName === value);
      if (found) {
        updated[idx].itemCode     = found.itemCode     || "";
        updated[idx].itemCategory = found.itemCategory || "";
        updated[idx].uom          = found.uom          || found.baseUOM || "";
      }
    }

    setItems(updated);
  };

  const addItem    = () => setItems([...items, emptyItem()]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  /* ── inventory warning check ── */
  const checkStock = async () => {
    const warnings = [];
    for (const it of items) {
      if (!it.itemCode || !it.requiredQty) continue;
      try {
        const res = await axios.get(`${API_URL}/api/item-inventory/${it.itemCode}`);
        const stock = res.data?.currentStock || 0;
        const reqQty = parseFloat(it.requiredQty) || 0;
        if (stock > 0 && stock >= reqQty) {
          warnings.push(`${it.itemName || it.itemCode}: Required ${reqQty} ${it.uom}, Current Stock ${stock} ${it.uom} — Stock Available`);
        }
      } catch (_) { /* item not in inventory system, proceed */ }
    }
    return warnings;
  };

  /* ── save ── */
  const handleSave = async () => {
    if (!prNo)          return alert("PR No is required");
    if (!department)    return alert("Department is required");
    if (!requestedBy)   return alert("Requested By is required");
    if (items.every((it) => !it.itemName)) return alert("Add at least one item");

    /* inventory warning check */
    const warnings = await checkStock();
    if (warnings.length > 0) {
      const proceed = window.confirm(
        "⚠️ Stock Warning:\n\n" + warnings.join("\n") + "\n\nDo you still want to proceed?"
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      const payload = {
        prNo, prDate, department, site, requestedBy, priority,
        requiredDate, status, remarks,
        items: items
          .filter((it) => it.itemName)
          .map((it, idx) => ({ ...it, sNo: idx + 1 })),
      };
      const res = await axios.post(`${API_URL}/api/create-purchase-requisition`, payload);
      if (res.data.success) {
        alert("Purchase Requisition Saved Successfully");
        navigate("/purchase-requisition");
      }
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const itemNames = itemMaster.map((im) => im.itemName);

  return (
    <div className="cpr-page">
      <ModuleNavbar />

      {/* TOP BAR */}
      <div className="pr-topbar">
        <div className="pr-topbar-left">
          <button className="pr-back-btn" onClick={() => navigate("/purchase-requisition")}>←</button>
          <h1 className="pr-title">Create Purchase Requisition</h1>
        </div>
        {prNo && <span className="pr-badge">{prNo}</span>}
      </div>

      {seqError && (
        <div className="pr-seq-warning">⚠️ {seqError}</div>
      )}

      {/* ── HEADER CARD ── */}
      <div className="cpr-card">
        <div className="cpr-card-header">📋 PR Information</div>

        <div className="cpr-grid">

          <div className="cpr-field">
            <label>PR No <span className="req">*</span></label>
            <input
              className="cpr-input"
              value={prNo}
              onChange={(e) => setPrNo(e.target.value)}
              placeholder="Auto-generated"
            />
          </div>

          <div className="cpr-field">
            <label>PR Date <span className="req">*</span></label>
            <input
              type="date"
              className="cpr-input"
              value={prDate}
              onChange={(e) => setPrDate(e.target.value)}
            />
          </div>

          <div className="cpr-field">
            <label>Department <span className="req">*</span></label>
            <select
              className="cpr-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">-- Select --</option>
              {DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="cpr-field">
            <label>Site</label>
            <select
              className="cpr-input"
              value={site}
              onChange={(e) => setSite(e.target.value)}
            >
              <option value="">-- Select --</option>
              {siteList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="cpr-field">
            <label>Requested By <span className="req">*</span></label>
            <input
              className="cpr-input"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Employee name…"
            />
          </div>

          <div className="cpr-field">
            <label>Priority</label>
            <select
              className="cpr-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY_OPT.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="cpr-field">
            <label>Required Date</label>
            <input
              type="date"
              className="cpr-input"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
            />
          </div>

          <div className="cpr-field">
            <label>Status</label>
            <select
              className="cpr-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="cpr-field cpr-field-full">
            <label>Remarks</label>
            <textarea
              className="cpr-textarea"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Optional remarks…"
            />
          </div>

        </div>
      </div>

      {/* ── ITEMS CARD ── */}
      <div className="cpr-card">
        <div className="cpr-card-header" style={{ justifyContent: "space-between", display: "flex", alignItems: "center" }}>
          <span>📦 Items</span>
          <button className="cpr-add-row-btn" onClick={addItem}>+ Add Row</button>
        </div>

        <div className="cpr-items-wrap">
          <table className="cpr-items-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>Item Code</th>
                <th>Item Name <span className="req">*</span></th>
                <th>Category</th>
                <th>UOM</th>
                <th>Required Qty <span className="req">*</span></th>
                <th>Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{idx + 1}</td>

                  <td>
                    <input
                      className="cpr-item-input"
                      value={item.itemCode}
                      onChange={(e) => updateItem(idx, "itemCode", e.target.value)}
                      placeholder="Code"
                    />
                  </td>

                  <td style={{ position: "relative" }}>
                    <TypeAhead
                      value={item.itemName}
                      onChange={(v) => updateItem(idx, "itemName", v)}
                      suggestions={itemNames}
                      onSelect={(v) => updateItem(idx, "itemName", v)}
                      placeholder="Item name…"
                      className="cpr-item-input"
                    />
                  </td>

                  <td>
                    <select
                      className="cpr-item-input"
                      value={item.itemCategory}
                      onChange={(e) => updateItem(idx, "itemCategory", e.target.value)}
                    >
                      <option value="">--</option>
                      {categoryList.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>

                  <td>
                    <select
                      className="cpr-item-input"
                      value={item.uom}
                      onChange={(e) => updateItem(idx, "uom", e.target.value)}
                    >
                      <option value="">--</option>
                      {uomList.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>

                  <td>
                    <input
                      type="number"
                      className="cpr-item-input"
                      value={item.requiredQty}
                      onChange={(e) => updateItem(idx, "requiredQty", e.target.value)}
                      placeholder="0"
                      min="0"
                    />
                  </td>

                  <td>
                    <input
                      className="cpr-item-input"
                      value={item.remarks}
                      onChange={(e) => updateItem(idx, "remarks", e.target.value)}
                      placeholder="Remarks…"
                    />
                  </td>

                  <td style={{ textAlign: "center" }}>
                    {items.length > 1 && (
                      <button
                        className="cpr-del-row-btn"
                        onClick={() => removeItem(idx)}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FOOTER BUTTONS ── */}
      <div className="cpr-footer">
        <button
          className="cpr-cancel-btn"
          onClick={() => navigate("/purchase-requisition")}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="cpr-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save PR"}
        </button>
      </div>

    </div>
  );
};

export default CreatePurchaseRequisition;