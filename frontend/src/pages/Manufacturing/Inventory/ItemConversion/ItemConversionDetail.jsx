import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const WEIGHMENT_API = `${API_URL}/api/weighment`;
const GIN_API       = `${API_URL}/api/goods-inward-note`;
import "./ItemConversion.css";

/* ── Portal ItemTypeAhead — renders on <body>, never clipped by table overflow ── */
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
    setCoords({ left: rect.left, width: rect.width, top: goUp ? rect.top - dropH - 2 : rect.bottom + 2 });
  }, [filtered.length]);

  useEffect(() => {
    if (!show) return;
    calcCoords();
    window.addEventListener("scroll", calcCoords, true);
    window.addEventListener("resize", calcCoords);
    return () => { window.removeEventListener("scroll", calcCoords, true); window.removeEventListener("resize", calcCoords); };
  }, [show, calcCoords]);

  useEffect(() => {
    const h = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) && listRef.current && !listRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dropdown = show && filtered.length > 0 ? ReactDOM.createPortal(
    <ul ref={listRef} style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 9999, background: "#fff", border: "1.5px solid #93c5fd", borderRadius: 6, listStyle: "none", margin: 0, padding: "4px 0", maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(37,99,235,0.15)", scrollbarWidth: "thin" }}>
      {filtered.map((item, i) => (
        <li key={item._id || i}
          onMouseDown={(e) => { e.preventDefault(); onSelectItem(item); setShow(false); }}
          style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", color: "#1e293b", display: "flex", justifyContent: "space-between", gap: 8 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1d4ed8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#1e293b"; }}
        >
          <span>{item.itemName}</span>
          <span style={{ opacity: 0.5, fontSize: "0.82em", whiteSpace: "nowrap" }}>{item.itemCode}{item.uom ? ` · ${item.uom}` : ""}</span>
        </li>
      ))}
    </ul>,
    document.body
  ) : null;

  return (
    <>
      <input ref={inputRef} type="text" className={className || "ic-item-input"} style={{ width: "100%", boxSizing: "border-box" }}
        value={value} onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }} placeholder={placeholder || "Search item…"} autoComplete="off" />
      {dropdown}
    </>
  );
};

/* ── Portal ItemCodeTypeAhead — searches by code string ── */
const PortalCodeTypeAhead = ({ value, onChange, codes, onSelectCode, placeholder, className }) => {
  const [show,   setShow]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = codes.filter((c) => !value || c?.toLowerCase().includes(value.toLowerCase())).slice(0, 12);

  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect       = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH      = Math.min(filtered.length * 34 + 8, 220);
    const goUp       = spaceBelow < dropH + 8;
    setCoords({ left: rect.left, width: rect.width, top: goUp ? rect.top - dropH - 2 : rect.bottom + 2 });
  }, [filtered.length]);

  useEffect(() => {
    if (!show) return;
    calcCoords();
    window.addEventListener("scroll", calcCoords, true);
    window.addEventListener("resize", calcCoords);
    return () => { window.removeEventListener("scroll", calcCoords, true); window.removeEventListener("resize", calcCoords); };
  }, [show, calcCoords]);

  useEffect(() => {
    const h = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target) && listRef.current && !listRef.current.contains(e.target)) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const dropdown = show && filtered.length > 0 ? ReactDOM.createPortal(
    <ul ref={listRef} style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 9999, background: "#fff", border: "1.5px solid #93c5fd", borderRadius: 6, listStyle: "none", margin: 0, padding: "4px 0", maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(37,99,235,0.15)", scrollbarWidth: "thin" }}>
      {filtered.map((code, i) => (
        <li key={i} onMouseDown={(e) => { e.preventDefault(); onSelectCode(code); setShow(false); }}
          style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", color: "#1e293b" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1d4ed8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#1e293b"; }}
        >
          {code}
        </li>
      ))}
    </ul>,
    document.body
  ) : null;

  return (
    <>
      <input ref={inputRef} type="text" className={className || "ic-item-input"} style={{ width: "100%", boxSizing: "border-box" }}
        value={value} onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }} placeholder={placeholder || "Item code…"} autoComplete="off" />
      {dropdown}
    </>
  );
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const ItemConversionDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [doc,      setDoc]      = useState(location.state?.record || null);
  const [loading,  setLoading]  = useState(!location.state?.record);
  const [error,    setError]    = useState("");
  const [editMode, setEditMode] = useState(false); // set true after doc loads
  const [editDoc,  setEditDoc]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [itemList, setItemList] = useState([]);

  /* ── Fetch item master ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/items`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setItemList(data.filter((i) => !i.status || i.status === "Open" || i.status === "Active"));
      })
      .catch(console.error);
  }, []);

  /* ── Fetch record by id if not passed via state ── */
  useEffect(() => {
    if (doc) {
      // Auto-enter edit mode (unless already Closed)
      const lockedStatuses = ["Closed"];
      if (!lockedStatuses.includes(doc.status)) {
        setEditDoc(JSON.parse(JSON.stringify(doc)));
        setEditMode(true);
      }
      setLoading(false);
      return;
    }
    const fetchDoc = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/item-conversion/${id}`);
        const fetched = Array.isArray(res.data) ? res.data[0] : res.data;
        setDoc(fetched);
        // Auto-enter edit mode
        const lockedStatuses = ["Closed"];
        if (fetched && !lockedStatuses.includes(fetched.status)) {
          setEditDoc(JSON.parse(JSON.stringify(fetched)));
          setEditMode(true);
        }
      } catch {
        setError("Item Conversion record not found.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id, doc]);

  const handleEditCancel = () => {
    // Revert to original doc; re-enable edit if not locked
    const lockedStatuses = ["Closed"];
    if (!lockedStatuses.includes(doc?.status)) {
      setEditDoc(JSON.parse(JSON.stringify(doc)));
      setEditMode(true);
    } else {
      setEditDoc(null);
      setEditMode(false);
    }
  };

  const handleEditSave = async () => {
    if (!editDoc) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/item-conversion/${id}`, editDoc);
      if (res.data?.success) {
        const savedIc = res.data.data || editDoc;

        /* ── Step 6 cascade — when IC moves to Saved, Weighment → Closed ──────
           Two paths exist depending on how the IC was created:

           PATH A — Created from GIN (Import from Inward):
             IC.ginId = GIN._id (ObjectId)
             → Resolve GIN No from GIN record
             → Find weighment where weighment.inwardOutwardNoteNo === ginNo
             → Close that weighment

           PATH B — Created from Weighment (Import from Weighment):
             IC.ginId = Weighment._id (ObjectId) stored directly
             → Try GIN lookup first; if it fails (404/wrong entity), fall back
             → Find weighment directly by _id using IC.ginId
             → Close that weighment
        ──────────────────────────────────────────────────────────────────────── */
        /* ── Cascade: IC status → Saved → Weighment → Closed ──────────────────
           Priority order:
             1. doc.weighmentId  — direct _id of the source Weighment
             2. ginId via GIN    — ginId → GIN record → inwardOutwardNoteNo → weighment
             3. ginId direct     — ginId might itself be a Weighment _id
        ──────────────────────────────────────────────────────────────────────── */
        if (editDoc.status === "Saved" && doc?.status !== "Saved") {
          const weighmentId = savedIc.weighmentId || doc?.weighmentId;
          const ginId       = savedIc.ginId       || doc?.ginId;

          try {
            let linkedWtId   = null;
            let linkedWtData = null;

            /* PATH 1 — weighmentId is the weighment's own _id (most reliable) */
            if (weighmentId && /^[a-f0-9]{24}$/i.test(weighmentId)) {
              try {
                const wtRes = await axios.get(`${WEIGHMENT_API}/${weighmentId}`);
                const wt    = wtRes.data?.data || wtRes.data;
                if (wt?._id) { linkedWtId = wt._id; linkedWtData = wt; }
              } catch { /* not found */ }
            }

            /* PATH 2 — ginId → GIN → weighment via inwardOutwardNoteNo */
            if (!linkedWtId && ginId && /^[a-f0-9]{24}$/i.test(ginId)) {
              try {
                const ginRes = await axios.get(`${GIN_API}/${ginId}`);
                const ginNo  = ginRes.data?.ginNo || ginRes.data?.data?.ginNo;
                if (ginNo) {
                  const wtRes  = await axios.get(WEIGHMENT_API);
                  const allWts = Array.isArray(wtRes.data?.data) ? wtRes.data.data : [];
                  const wt     = allWts.find((w) => w.inwardOutwardNoteNo === ginNo);
                  if (wt) { linkedWtId = wt._id; linkedWtData = wt; }
                }
              } catch { /* GIN not found */ }
            }

            /* PATH 3 — ginId is itself a Weighment _id */
            if (!linkedWtId && ginId && /^[a-f0-9]{24}$/i.test(ginId)) {
              try {
                const wtRes = await axios.get(`${WEIGHMENT_API}/${ginId}`);
                const wt    = wtRes.data?.data || wtRes.data;
                if (wt?._id) { linkedWtId = wt._id; linkedWtData = wt; }
              } catch { /* not a weighment id */ }
            }

            /* Close the linked weighment */
            if (linkedWtId && linkedWtData?.status !== "Closed") {
              await axios.put(`${WEIGHMENT_API}/${linkedWtId}`, {
                ...linkedWtData,
                status: "Closed",
              });
            }

          } catch (cascadeErr) {
            console.warn("IC → Weighment cascade warning:", cascadeErr.message);
          }
        }

        setDoc(savedIc);
        const lockedStatuses = ["Closed"];
        if (!lockedStatuses.includes(savedIc.status)) {
          setEditDoc(JSON.parse(JSON.stringify(savedIc)));
          setEditMode(true);
        } else {
          setEditMode(false);
          setEditDoc(null);
        }
        alert("Item Conversion updated successfully");
      } else {
        alert(res.data?.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleImportToGRN = () => {
    if (!doc) return;
    navigate("/create-direct-grn", {
      state: {
        directIc: {
          _id:            doc._id,
          icNo:           doc.icNo,
          vehicleNo:      doc.vehicleNo      || "",
          partyName:      doc.partyName      || "",
          partyCode:      doc.partyCode      || "",
          poNo:           doc.poNo           || "",
          ginId:          doc.ginId          || "",
          remarks:        doc.remarks        || "",
          itemCode:       doc.itemCode       || "",
          uom:            doc.uom            || "",
          baseQty:        doc.baseQty        || 0,
          conversionDate: doc.conversionDate || "",
          conversionRows: doc.conversionRows || [],
        },
      },
    });
  };

  /* ── Edit row helpers ── */
  const itemCodes = itemList.map((i) => i.itemCode).filter(Boolean);

  const updateEditRow = (idx, field, value) => {
    setEditDoc((p) => {
      const updated = [...p.conversionRows];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...p, conversionRows: updated };
    });
  };

  /* Select by item code in row */
  const handleEditRowCodeSelect = (idx, code) => {
    const found = itemList.find((i) => i.itemCode === code);
    setEditDoc((p) => {
      const updated = [...p.conversionRows];
      updated[idx] = {
        ...updated[idx],
        inventoryCode: code,
        inventoryName: found?.itemName || updated[idx].inventoryName,
        uom:           found?.uom      || updated[idx].uom,
      };
      return { ...p, conversionRows: updated };
    });
  };

  /* Select by item name in row */
  const handleEditRowItemSelect = (idx, item) => {
    setEditDoc((p) => {
      const updated = [...p.conversionRows];
      updated[idx] = {
        ...updated[idx],
        inventoryName: item.itemName || "",
        inventoryCode: item.itemCode || "",
        uom:           item.uom      || updated[idx].uom,
      };
      return { ...p, conversionRows: updated };
    });
  };

  const deleteEditRow = (idx) => {
    setEditDoc((p) => ({
      ...p,
      conversionRows: p.conversionRows
        .filter((_, i) => i !== idx)
        .map((r, i) => ({ ...r, sNo: i + 1 })),
    }));
  };

  const activeDoc   = editMode ? editDoc : doc;
  const rows        = activeDoc?.conversionRows || [];
  const totalRaQty  = rows.reduce((s, r) => s + (Number(r.raQty)  || 0), 0);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

  return (
    <div className="ic-page">
      <ModuleNavbar />

      {/* ── TOPBAR ── */}
      <div className="ic-topbar">
        <div className="ic-topbar-left">
          <button
            className="ic-back-btn"
            onClick={() => navigate("/item-conversion")}
            style={{ backgroundColor: "#2563eb", color: "#fff", border: "none" }}
          >
            ← Back
          </button>
          <div>
            <h2>Item Conversion Details</h2>
            <span className="ic-topbar-sub">{doc?.icNo ? `Document: ${doc.icNo}` : "View record"}</span>
          </div>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="ic-card ic-loading"><span className="ic-loading-spinner" /> Loading…</div>
      )}
      {error && (
        <div className="ic-card" style={{ color: "#ef4444", padding: "2rem", textAlign: "center" }}>{error}</div>
      )}

      {activeDoc && (
        <>
          {/* ── SECTION 1: CONVERSION INFORMATION ── */}
          <div className="ic-card">
            <div className="ic-card-title">
              <span className="ic-card-icon">📋</span> Conversion Information
              {editMode && <span style={{ marginLeft: 8, fontSize: 11, color: "#6366f1", fontWeight: 600 }}>— Editing</span>}
            </div>

            <div className="ic-form-grid">
              <div
                className="ic-field"
                style={{
                  background: "#fffbeb",
                  border: "1.5px solid #fbbf24",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <label style={{ color: "#92400e", fontWeight: 700 }}>★ Transaction Category</label>
                <input
                  type="text"
                  readOnly
                  value={activeDoc.transactionCategory || "—"}
                  className="ic-readonly"
                  style={{ border: "1.5px solid #fbbf24", background: "#fff", fontWeight: 600 }}
                  title="Transaction Category is locked after creation — it determines the IC No sequence"
                />
              </div>

              <div className="ic-field">
                <label>IC No</label>
                <input type="text" readOnly value={activeDoc.icNo || "—"} className="ic-readonly ic-mono" />
              </div>

              <div className="ic-field">
                <label>Conversion Date</label>
                <input
                  type={editMode ? "date" : "text"}
                  readOnly={!editMode}
                  value={activeDoc.conversionDate || ""}
                  className={!editMode ? "ic-readonly" : ""}
                  onChange={(e) => setEditDoc((p) => ({ ...p, conversionDate: e.target.value }))}
                />
              </div>

              <div className="ic-field">
                <label>PO No</label>
                <input
                  type="text"
                  readOnly={!editMode}
                  value={activeDoc.poNo || ""}
                  className={!editMode ? "ic-readonly" : ""}
                  onChange={(e) => setEditDoc((p) => ({ ...p, poNo: e.target.value }))}
                />
              </div>

              <div className="ic-field">
                <label>Vehicle No</label>
                <input
                  type="text"
                  readOnly={!editMode}
                  value={activeDoc.vehicleNo || ""}
                  className={!editMode ? "ic-readonly" : ""}
                  onChange={(e) => setEditDoc((p) => ({ ...p, vehicleNo: e.target.value }))}
                />
              </div>

              <div className="ic-field">
                <label>Party Name</label>
                <input
                  type="text"
                  readOnly={!editMode}
                  value={activeDoc.partyName || ""}
                  className={!editMode ? "ic-readonly" : ""}
                  onChange={(e) => setEditDoc((p) => ({ ...p, partyName: e.target.value }))}
                />
              </div>

              <div className="ic-field">
                <label>Party Code</label>
                <input
                  type="text"
                  readOnly
                  value={activeDoc.partyCode || ""}
                  className="ic-readonly ic-mono"
                />
              </div>

              <div className="ic-field">
                <label>Status</label>
                {editMode ? (
                  <select
                    value={activeDoc.status || "Draft"}
                    onChange={(e) => setEditDoc((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Saved">Saved</option>
                    <option value="Closed">Closed</option>
                  </select>
                ) : (
                  <div style={{ paddingTop: 4 }}>
                    {(() => {
                      const s = activeDoc.status || "Draft";
                      const badgeStyle = {
                        display: "inline-block",
                        fontSize: 12, fontWeight: 700,
                        padding: "3px 12px", borderRadius: 20,
                        ...(s === "Draft"  ? { background: "#e0f2fe", color: "#0369a1" } :
                            s === "Saved"  ? { background: "#d1fae5", color: "#065f46" } :
                            s === "Closed" ? { background: "#f1f5f9", color: "#475569" } :
                                            { background: "#f1f5f9", color: "#64748b" }),
                      };
                      return <span style={badgeStyle}>{s}</span>;
                    })()}
                  </div>
                )}
              </div>

              <div className="ic-field ic-field-full">
                <label>Remarks</label>
                <textarea
                  rows={2}
                  readOnly={!editMode}
                  value={activeDoc.remarks || ""}
                  className={!editMode ? "ic-readonly" : ""}
                  style={{ resize: "none" }}
                  onChange={(e) => setEditDoc((p) => ({ ...p, remarks: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: BASE ITEM ── */}
          <div className="ic-card">
            <div className="ic-card-title">
              <span className="ic-card-icon">📦</span> Base Item
            </div>
            <div className="ic-base-item-grid">

              {/* Item Name — primary field */}
              <div className="ic-field">
                <label>Item Name</label>
                <input
                  type="text"
                  readOnly
                  value={activeDoc.itemDescription || "—"}
                  className="ic-readonly"
                />
              </div>

              {/* Item Code — auto-filled / read-only */}
              <div className="ic-field">
                <label>Item Code</label>
                <input
                  type="text"
                  readOnly
                  value={activeDoc.itemCode || "—"}
                  className="ic-readonly ic-mono"
                />
              </div>

              <div className="ic-field">
                <label>UOM</label>
                <input type="text" readOnly value={activeDoc.uom || "—"} className="ic-readonly" />
              </div>

              <div className="ic-field">
                <label>CQty (Base Qty)</label>
                <input
                  type={editMode ? "number" : "text"}
                  readOnly={!editMode}
                  value={editMode ? (activeDoc.baseQty || "") : fmt(activeDoc.baseQty)}
                  className={!editMode ? "ic-readonly" : ""}
                  onChange={(e) => setEditDoc((p) => ({ ...p, baseQty: e.target.value }))}
                />
              </div>

              <div className="ic-field">
                <label>RQty <span className="ic-auto-badge">Total</span></label>
                <input
                  type="text"
                  readOnly
                  value={(() => {
                    const cQty = Number(activeDoc.baseQty) || 0;
                    const rQty = cQty - totalRaQty;
                    return cQty > 0 || totalRaQty > 0 ? fmt(rQty) : "—";
                  })()}
                  className="ic-readonly ic-auto-green"
                  title="RQty = CQty (Base Qty) − Total RaQty"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 3: CONVERSION BIFURCATION ── */}
          <div className="ic-card">
            <div className="ic-card-header-row">
              <div className="ic-card-title">
                <span className="ic-card-icon">🔄</span> Conversion Bifurcation
              </div>
              <div className="ic-total-badge">
                Total RaQty: <strong>{fmt(totalRaQty)}</strong>
              </div>
            </div>

            <div className="ic-conv-table-wrap">
              <table className="ic-conv-table">
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "13%" }} />
                  {editMode && <col style={{ width: "6%" }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th>S No</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>UOM</th>
                    <th>RaQty</th>
                    {editMode && <th>Del</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "ic-row-even" : "ic-row-odd"}>
                        <td className="ic-sno">{row.sNo ?? idx + 1}</td>

                        {/* Item Code */}
                        <td style={{ fontFamily: "monospace", fontSize: "0.88em" }}>
                          {editMode ? (
                            <PortalCodeTypeAhead
                              value={row.inventoryCode || ""}
                              onChange={(v) => updateEditRow(idx, "inventoryCode", v)}
                              codes={itemCodes}
                              onSelectCode={(code) => handleEditRowCodeSelect(idx, code)}
                              placeholder="Item code…"
                              className="ic-item-input"
                            />
                          ) : (row.inventoryCode || "—")}
                        </td>

                        {/* Item Name */}
                        <td style={{ fontWeight: 500 }}>
                          {editMode ? (
                            <PortalItemTypeAhead
                              value={row.inventoryName || ""}
                              onChange={(v) => updateEditRow(idx, "inventoryName", v)}
                              items={itemList}
                              onSelectItem={(item) => handleEditRowItemSelect(idx, item)}
                              placeholder="Search item name…"
                              className="ic-item-input"
                            />
                          ) : (row.inventoryName || "—")}
                        </td>

                        {/* UOM */}
                        <td>
                          {editMode ? (
                            <input
                              type="text"
                              className="ic-item-input ic-readonly"
                              readOnly
                              value={row.uom || ""}
                              placeholder="—"
                              title="Auto-filled from Item Master"
                            />
                          ) : (
                            <span style={{ display: "inline-block", background: "#e8f5e9", color: "#2e7d32", borderRadius: "4px", padding: "2px 8px", fontSize: "0.82em", fontWeight: 600 }}>
                              {row.uom || "—"}
                            </span>
                          )}
                        </td>

                        {/* RaQty */}
                        <td className="ic-sno" style={{ fontWeight: 600 }}>
                          {editMode ? (
                            <input
                              type="number"
                              className="ic-item-input ic-num"
                              value={row.raQty || ""}
                              min="0"
                              step="0.01"
                              onChange={(e) => updateEditRow(idx, "raQty", e.target.value)}
                            />
                          ) : fmt(row.raQty)}
                        </td>

                        {editMode && (
                          <td style={{ textAlign: "center" }}>
                            <button className="ic-del-row-btn" onClick={() => deleteEditRow(idx)} title="Remove row">✕</button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={editMode ? 6 : 5} style={{ textAlign: "center", padding: "2rem", opacity: 0.5, fontSize: 14 }}>
                        No conversion rows found
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="ic-total-label">Total</td>
                    <td className="ic-total-qty">{fmt(totalRaQty)}</td>
                    {editMode && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Add row button in edit mode */}
            {editMode && (
              <div className="ic-conv-actions" style={{ marginTop: 10 }}>
                <button
                  className="ic-add-row-btn"
                  onClick={() => {
                    const last    = editDoc.conversionRows;
                    const lastUom = last.length > 0 ? (last[last.length - 1].uom || "") : "";
                    setEditDoc((p) => ({
                      ...p,
                      conversionRows: [
                        ...p.conversionRows,
                        { sNo: p.conversionRows.length + 1, inventoryCode: "", inventoryName: "", uom: lastUom, raQty: "", rate: 0, amount: 0 },
                      ],
                    }));
                  }}
                >
                  + Add Row
                </button>
              </div>
            )}
          </div>

          {/* ── PAGE ACTIONS — bottom of page ── */}
          <div className="ic-page-actions">
            {doc?.status === "Draft" && (
              <span style={{
                fontSize: 11.5, color: "#6b7280", fontStyle: "italic",
                alignSelf: "center", padding: "0 8px",
              }}>
                Set status to Saved to create GRN
              </span>
            )}

            {editMode && (
              <button className="ic-cancel-btn" onClick={handleEditCancel} disabled={saving}>
                Cancel
              </button>
            )}

            {/* Import to GRN — only available when IC is Saved */}
            {doc?.status === "Saved" && (
              <button
                className="ic-create-btn"
                style={{ background: "#059669" }}
                onClick={handleImportToGRN}
                title="Create Direct GRN from this Item Conversion"
              >
                📦 Import to GRN
              </button>
            )}

            {editMode && (
              <button className="ic-save-btn" onClick={handleEditSave} disabled={saving}>
                {saving ? "Saving…" : "💾 Save"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ItemConversionDetail;