import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import useSiteOptions from "../../../../hooks/useSiteOptions";

const GIN_API       = `${API_URL}/api/goods-inward-note`;
const WEIGHMENT_API = `${API_URL}/api/weighment`;

/* ── Portal TypeAhead — dropdown renders on <body>, escapes any overflow:hidden/auto parent ── */
const TypeAhead = ({ value, onChange, suggestions, onSelect, placeholder, className }) => {
  const [show,   setShow]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const filtered = value
    ? suggestions.filter((s) => s?.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
    : [];

  const calcCoords = useCallback(() => {
    if (!inputRef.current) return;
    const rect       = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH      = Math.min(filtered.length * 32 + 8, 220);
    const goUp       = spaceBelow < dropH + 8;
    setCoords({
      left:  rect.left,
      width: rect.width,
      top:   goUp
        ? rect.top  - dropH - 2
        : rect.bottom + 2,
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
            position:   "fixed",
            top:        coords.top,
            left:       coords.left,
            width:      coords.width,
            zIndex:     9999,
            background: "#fff",
            border:     "1.5px solid #93c5fd",
            borderRadius: 6,
            listStyle:  "none",
            margin:     0,
            padding:    0,
            maxHeight:  220,
            overflowY:  "auto",
            boxShadow:  "0 8px 24px rgba(37,99,235,0.15)",
            scrollbarWidth: "thin",
          }}
        >
          {filtered.map((s, i) => (
            <li
              key={i}
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); setShow(false); }}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                cursor: "pointer",
                borderBottom: "1px solid #f1f5f9",
                color: "#1e293b",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#1e293b"; }}
            >
              {s}
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
        className={className || "cgin-item-input"}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => { setShow(true); calcCoords(); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {dropdown}
    </>
  );
};

const blankItem = (sNo) => ({ sNo, itemCode: "", itemName: "", uom: "", qty: "", _checked: false });

const GINDetail = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [gin,      setGin]      = useState(null);
  const [form,     setForm]     = useState(null);   // edit state — mirrors CreateGIN's `form`
  const [items,    setItems]    = useState([]);
  const [editing,  setEditing]  = useState(true);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [insertCount, setInsertCount] = useState(1);

  /* ── Vehicle duplicate check ─────────────────────────────────────────────
     Fires 500ms after vehicleNo changes in edit mode.
     Excludes the current record (id) so editing an unchanged vehicle doesn't block.
  ──────────────────────────────────────────────────────────────────────────── */
  const [vehicleConflict,    setVehicleConflict]    = useState(null); // { ginNo, status } | null
  const vehicleCheckTimerRef = useRef(null);

  const checkVehicleConflict = useCallback(async (vehicleNo) => {
    if (!vehicleNo || !vehicleNo.trim()) { setVehicleConflict(null); return; }
    try {
      const res     = await axios.get(`${API_URL}/api/goods-inward-note`);
      const allGINs = Array.isArray(res.data) ? res.data : [];
      const vNo     = vehicleNo.trim().toUpperCase();
      const found   = allGINs.find(
        (g) =>
          g._id !== id &&                                   // exclude THIS record
          g.vehicleNo?.trim().toUpperCase() === vNo &&
          g.status !== "Closed"
      );
      setVehicleConflict(found ? { ginNo: found.ginNo, status: found.status } : null);
    } catch { setVehicleConflict(null); }
  }, [id]);

  /* master data */
  const { sites: siteOptions, loading: sitesLoading } = useSiteOptions("Inventory", "Inward/Outward");
  const [transactionCategories, setTransactionCategories] = useState([]);
  const [parties,   setParties]   = useState([]);
  const [itemList,  setItemList]  = useState([]);

  /* ── Load GIN record ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res  = await axios.get(`${GIN_API}/${id}`);
        const data = res.data;
        setGin(data);
        setForm({ ...data });
        setItems((data.items || []).map((it, i) => ({ ...it, sNo: it.sNo ?? i + 1, _checked: false })));
        // Auto-enter edit mode unless the record is locked
        const lockedStatuses = ["Convert", "Vout", "Closed"];
        setEditing(!lockedStatuses.includes(data.status));
      } catch (err) {
        console.error(err);
        setError("Failed to load record");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ── Load master data ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/transactions`)
      .then((res) => setTransactionCategories(
        res.data.filter((t) => t.module === "Inventory" && t.businessEntity === "Inward/Outward")
      ))
      .catch(console.error);

    axios.get(`${API_URL}/api/parties`)
      .then((res) => setParties(res.data.filter((p) => p.status === "Active")))
      .catch(console.error);

    axios.get(`${API_URL}/api/items`)
      .then((res) => setItemList(res.data.filter((i) => i.status === "Active")))
      .catch(console.error);
  }, []);

  const partyNames = parties.map((p) => p.partyName).filter(Boolean);
  const partyCodes = parties.map((p) => p.partyCode).filter(Boolean);
  const allItemCodes = itemList.map((i) => i.itemCode).filter(Boolean);
  const allItemNames = itemList.map((i) => i.itemName).filter(Boolean);

  /* ── form change handlers (same pattern as CreateGIN) ── */
const handleChange = (e) => {
  const { name, value } = e.target;

  /* ── Vehicle No: debounced duplicate check (edit mode only) ── */
  if (name === "vehicleNo") {
    clearTimeout(vehicleCheckTimerRef.current);
    vehicleCheckTimerRef.current = setTimeout(() => checkVehicleConflict(value), 500);
  }

  setForm((p) => {
    const updated = { ...p, [name]: value };

    const gross =
      name === "grossWeight"
        ? Number(value || 0)
        : Number(p.grossWeight || 0);

    const tare =
      name === "tareWeight"
        ? Number(value || 0)
        : Number(p.tareWeight || 0);

    updated.netWeight = gross - tare;

    if (name === "status" && value === "Closed" && !p.closedAt) {
      updated.closedAt = new Date().toISOString();
    }

    if (name === "status" && value !== "Closed") {
      updated.closedAt   = "";
      updated.exitTime   = "";
      updated.closedDate = "";
      updated.closedTime = "";
    }

    return updated;
  });
};

  const handlePartyNameSelect = (name) => {
    const p = parties.find((x) => x.partyName === name);
    setForm((f) => ({ ...f, partyName: name, partyCode: p?.partyCode || "" }));
  };
  const handlePartyCodeSelect = (code) => {
    const p = parties.find((x) => x.partyCode === code);
    setForm((f) => ({ ...f, partyCode: code, partyName: p?.partyName || "" }));
  };

  /* ── item row handlers ── */
  const handleItemChange = (idx, field, value) => {
    setItems((prev) => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
  };
  const handleItemCheck = (idx, checked) => {
    setItems((prev) => { const n = [...prev]; n[idx] = { ...n[idx], _checked: checked }; return n; });
  };
  const handleItemCodeSelect = (idx, code) => {
    const found = itemList.find((i) => i.itemCode === code);
    setItems((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], itemCode: code, itemName: found?.itemName || "", uom: found?.uom || "" };
      return n;
    });
  };
  const handleItemNameSelect = (idx, name) => {
    const found = itemList.find((i) => i.itemName === name);
    setItems((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], itemName: name, itemCode: found?.itemCode || "", uom: found?.uom || "" };
      return n;
    });
  };
  const handleInsertRows = () => {
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));
    setItems((prev) => {
      const start = prev.length + 1;
      return [...prev, ...Array.from({ length: count }, (_, i) => blankItem(start + i))];
    });
  };
  const handleDeleteChecked = () => {
    setItems((prev) => prev.filter((r) => !r._checked).map((r, i) => ({ ...r, sNo: i + 1 })));
  };

  /* ── Cancel edit — revert to saved data ── */
  const handleCancelEdit = () => {
    setForm({ ...gin });
    setItems((gin.items || []).map((it, i) => ({ ...it, sNo: it.sNo ?? i + 1, _checked: false })));
    const lockedStatuses = ["Convert", "Vout", "Closed"];
    setEditing(!lockedStatuses.includes(gin?.status));
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.vehicleNo || !form.vehicleNo.trim()) { alert("Vehicle No is required"); return; }

    /* Block if vehicleConflict state already detected a conflict — hard ERROR, not saved */
    if (vehicleConflict) {
      alert(`❌ Error: Vehicle "${form.vehicleNo.trim()}" has not exited yet (still IN).\nExisting GIN: ${vehicleConflict.ginNo} | Status: ${vehicleConflict.status}\n\nMark that vehicle OUT (Closed) before saving.\nChanges were NOT saved.`);
      return;
    }
    /* Live re-check at save time (in case state hasn't resolved) */
    try {
      const checkRes = await axios.get(`${API_URL}/api/goods-inward-note`);
      const allGINs  = Array.isArray(checkRes.data) ? checkRes.data : [];
      const vNo      = form.vehicleNo.trim().toUpperCase();
      const conflict = allGINs.find(
        (g) => g._id !== id &&
               g.vehicleNo?.trim().toUpperCase() === vNo &&
               g.status !== "Closed"
      );
      if (conflict) {
        alert(`❌ Error: Vehicle "${form.vehicleNo.trim()}" has not exited yet (still IN).\nExisting GIN: ${conflict.ginNo} | Status: ${conflict.status}\n\nMark that vehicle OUT (Closed) before saving.\nChanges were NOT saved.`);
        setVehicleConflict({ ginNo: conflict.ginNo, status: conflict.status });
        return;
      }
    } catch { /* non-blocking */ }

    setSaving(true);
    try {
      const cleanItems = items
        .filter((r) => { const { sNo, _checked, ...rest } = r; return Object.values(rest).some((v) => String(v).trim() !== ""); })
        .map(({ _checked, ...r }) => ({ ...r, qty: Number(r.qty) || 0 }));

      const payload = { ...form, items: cleanItems };
      if (payload.status === "Closed") {
        const cd = payload.closedDate || (payload.closedAt ? payload.closedAt.slice(0, 10) : "");
        const ct = payload.closedTime || payload.exitTime || "";
        if (!cd || !ct) {
          alert("Please enter both Closed Date and Closed Time when status is Closed");
          setSaving(false);
          return;
        }
        const ctFull = ct.length === 5 ? `${ct}:00` : ct; // ensure HH:MM:SS
        payload.exitTime   = ctFull;
        payload.closedDate = cd;
        payload.closedTime = ct;
        payload.closedAt   = new Date(`${cd}T${ct}`).toISOString();
      } else {
        payload.exitTime   = "";
        payload.closedAt   = "";
        payload.closedDate = "";
        payload.closedTime = "";
      }

      const res = await axios.put(`${GIN_API}/${id}`, payload);
      if (res.data.success) {
        const updated = res.data.data;

        /* ── Auto-close linked weighment when GIN is set to Closed ── */
        if (payload.status === "Closed" && updated.ginNo) {
          try {
            const wtRes  = await axios.get(WEIGHMENT_API, { params: { inwardOutwardNoteNo: updated.ginNo } });
            const wtList = wtRes.data?.data || [];
            await Promise.all(
              wtList
                .filter((w) => w.status !== "Closed")
                .map((w) => axios.put(`${WEIGHMENT_API}/${w._id}`, { ...w, status: "Closed" }))
            );
          } catch (wtErr) {
            console.warn("Could not auto-close linked weighment(s):", wtErr.message);
          }
        }

        setGin(updated);
        setForm({ ...updated });
        setItems((updated.items || []).map((it, i) => ({ ...it, sNo: it.sNo ?? i + 1, _checked: false })));
        const lockedStatuses = ["Convert", "Vout", "Closed"];
        setEditing(!lockedStatuses.includes(updated.status));
        alert("Updated Successfully");
      }
    } catch (err) {
      console.error(err);
      alert("Update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const anyChecked = items.some((r) => r._checked);

  /* ── Export to Weighment ── */
  const [exportingWeighment, setExportingWeighment] = useState(false);

  const handleExportToWeighment = async () => {
    if (!gin?.ginNo) { alert("GIN number not found"); return; }

    const type = (form.inOutType || "").toLowerCase() === "outward" ? "Outward" : "Inward";

    setExportingWeighment(true);
    try {
      /* Check if a weighment already exists for this GIN */
      const searchRes = await axios.get(WEIGHMENT_API, {
        params: { inwardOutwardNoteNo: gin.ginNo, transactionType: type },
      });
      const list     = searchRes.data?.data || [];
      const existing = list.find((w) => w.inwardOutwardNoteNo === gin.ginNo);

      if (existing?._id) {
        /* Weighment already exists — open it */
        navigate(`/weighment-detail/${existing._id}`, {
          state: { allowEdit: true, fromInwardOutward: true },
        });
        return;
      }

      /* No weighment yet — build pre-filled ginData and navigate to create form */
      const today = new Date().toISOString().split("T")[0];
      const ginData = {
        transactionType:     type,
        transactionCategory: form.transactionCategory || "",
        inwardOutwardNoteNo: gin.ginNo,
        vehicleNo:           form.vehicleNo            || "",

        // Party Code / Name are auto-filled from this GIN — Party Code is
        // locked (read-only) on the Weighment form itself.
        partyCode:           form.partyCode            || "",
        partyName:           form.partyName            || form.vendorName || "",

        site:                form.site                 || "",
        weighmentDate:       form.ginDate              || today,
        weighmentInDate:     form.ginDate              || today,
        weighmentOutDate: "",

        // Auto-fetched from this GIN's challan fields
        supplierInvoiceNo:   form.challanInvoiceNo     || "",
        supplierInvoiceDate: form.challanDate          || "",

        remarks:             form.remarks              || "",
        vendorCode:          form.vendorCode           || "",
        vendorName:          form.vendorName           || "",
        poCpoNo:             form.poCpoNo              || "",
        challanDate:         form.challanDate          || "",
        ewayDate:            form.ewayDate             || "",
        items: items
          .filter((r) => r.itemCode || r.itemName)
          .map((it, i) => ({
            sNo:         i + 1,
            itemCode:    it.itemCode  || "",
            itemName:    it.itemName  || "",
            uom:         it.uom       || "",
            remarks:     it.remarks   || "",
            firstWeight:  "",
            secondWeight: "",
            netWeight:    "",
          })),
      };

      const route = type === "Inward"
        ? "/weighment/create/inward/form"
        : "/weighment/create/outward/form";

      navigate(route, { state: { ginData } });
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setExportingWeighment(false);
    }
  };

  if (loading) return <div className="cgin-page"><ModuleNavbar /><p style={{ padding: 32 }}>Loading…</p></div>;
  if (error)   return <div className="cgin-page"><ModuleNavbar /><p style={{ padding: 32, color: "red" }}>{error}</p></div>;
  if (!form)   return null;

  return (
    <div className="cgin-page">
      <ModuleNavbar />

      {/* HEADER */}
      <div className="cgin-header">
        <div className="cgin-header-left">
          <button className="app-back-btn" onClick={() => navigate(-1)}>← Back</button>
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Inward Outward Note — {gin?.ginNo}
            {gin?.status && (() => {
              const ginStatusColor = {
                Open:    { bg: "#dbeafe", fg: "#1d4ed8" },
                Convert: { bg: "#ede9fe", fg: "#6d28d9" },
                Vout:    { bg: "#f0fdf4", fg: "#15803d" },
                Closed:  { bg: "#f1f5f9", fg: "#475569" },
              }[gin.status] || { bg: "#f1f5f9", fg: "#64748b" };
              return (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: "3px 10px",
                  borderRadius: 20, background: ginStatusColor.bg,
                  color: ginStatusColor.fg, letterSpacing: "0.3px",
                }}>
                  {gin.status}
                </span>
              );
            })()}
          </h2>
        </div>
        <div className="cgin-header-right" style={{ display: "flex", alignItems: "center", gap: 8 }} />
      </div>

      <div className="cgin-card">
        <div className="cgin-section-title">IN/OUT WARD INFORMATION</div>

        <div className="cgin-grid">

          {/* 1. TRANSACTION CATEGORY — read-only (set at creation) */}
          <div className="cgin-field">
            <label>Transaction Category</label>
            <input
              type="text"
              readOnly
              value={form.transactionCategory || "-"}
              style={{ background: "#f8fafc", color: "#64748b", fontWeight: 600 }}
            />
          </div>

          {/* 2. IN/OUT WARD NO — always read-only */}
          <div className="cgin-field">
            <label>IN/OUT WARD NO</label>
            <input
              type="text"
              readOnly
              value={form.ginNo || "-"}
              style={{ fontWeight: 700, letterSpacing: 1, color: "#15803d" }}
            />
          </div>

          {/* 3. IN/OUT DESCRIPTION */}
          <div className="cgin-field">
            <label>IN/OUT Description</label>
            {editing
              ? <input type="text" name="inOutDescription" value={form.inOutDescription || ""} onChange={handleChange} placeholder="Enter description" />
              : <input type="text" readOnly value={form.inOutDescription || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 4. IN/OUT TYPE */}
          <div className="cgin-field">
            <label>IN/OUT Type</label>
            {editing
              ? <select name="inOutType" value={form.inOutType || ""} onChange={handleChange}>
                  <option value="Inward">Inward</option>
                  <option value="Outward">Outward</option>
                  {/* <option value="General">General</option> */}
                </select>
              : <input type="text" readOnly value={form.inOutType || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 5. PO NO — read-only (locked after creation) */}
          <div className="cgin-field">
            <label>PO No</label>
            <input
              type="text"
              readOnly
              value={form.poCpoNo || "-"}
              style={{ background: "#f8fafc", color: "#64748b" }}
            />
          </div>

          {/* 6. ENTRY DATE */}
          <div className="cgin-field">
            <label>* Entry Date</label>
            {editing
              ? <input type="date" name="ginDate" value={form.ginDate || ""} onChange={handleChange} />
              : <input type="text" readOnly value={form.ginDate || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* GATE ENTRY TIME — manual entry, editable */}
          <div className="cgin-field">
            <label>Gate Entry Time</label>
            {editing
              ? <input
                  type="time"
                  name="entryTime"
                  value={form.entryTime || ""}
                  onChange={handleChange}
                  style={{ height: 34, border: "1px solid #93c5fd", borderRadius: 6, padding: "0 8px", fontSize: 12, background: "#f0fdf4", color: "#15803d", fontWeight: 600 }}
                />
              : <input
                  type="text"
                  readOnly
                  value={form.entryTime || "-"}
                  style={{ background: "#f0fdf4", color: "#15803d", fontWeight: 600, border: "1px dashed #86efac" }}
                />
            }
          </div>

          {/* 7. PARTY CODE — typeahead in edit, read-only otherwise */}
          <div className="cgin-field">
            <label>Party Code</label>
            {editing
              ? <TypeAhead value={form.partyCode || ""} onChange={(v) => setForm((f) => ({ ...f, partyCode: v }))}
                  suggestions={partyCodes} onSelect={handlePartyCodeSelect} placeholder="Type party code…" />
              : <input type="text" readOnly value={form.partyCode || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 8. PARTY NAME — typeahead in edit */}
          <div className="cgin-field">
            <label>Party Name</label>
            {editing
              ? <TypeAhead value={form.partyName || ""} onChange={(v) => setForm((f) => ({ ...f, partyName: v }))}
                  suggestions={partyNames} onSelect={handlePartyNameSelect} placeholder="Type party name…" />
              : <input type="text" readOnly value={form.partyName || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 9. STATUS */}
          <div className="cgin-field">
            <label>Status</label>
            {editing
              ? <select name="status" value={form.status || ""} onChange={handleChange}
                  disabled={["Convert", "Vout"].includes(form.status)}>
                  <option value="Open">Open</option>
                  {/* System-driven statuses — not manually selectable, but must exist
                      as <option> so the select renders the correct value */}
                  {form.status === "Convert" && <option value="Convert">Convert</option>}
                  {form.status === "Vout"    && <option value="Vout">Vout</option>}
                  <option value="Closed">Closed</option>
                </select>
              : <input type="text" readOnly value={form.status || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>
                    {/* CLOSED DATE + TIME — shown only when Closed, manual entry */}
          {form.status === "Closed" && (
            <>
              <div className="cgin-field">
                <label style={{ color: "#dc2626", fontWeight: 700 }}>🚪 * Closed Date</label>
                {editing
                  ? <input
                      type="date"
                      name="closedDate"
                      value={form.closedDate || (form.closedAt ? form.closedAt.slice(0, 10) : "")}
                      onChange={handleChange}
                      style={{ height: 34, border: "1.5px solid #fca5a5", borderRadius: 6, padding: "0 8px", fontSize: 12, background: "#fff1f2" }}
                    />
                  : <input type="text" readOnly
                      value={form.closedDate || (form.closedAt ? form.closedAt.slice(0, 10) : "-")}
                      style={{ background: "#fff1f2", color: "#dc2626", fontWeight: 600 }}
                    />
                }
              </div>
              <div className="cgin-field">
                <label style={{ color: "#dc2626", fontWeight: 700 }}>⏱ * Closed Time</label>
                {editing
                  ? <input
                      type="time"
                      name="closedTime"
                      value={form.closedTime || (form.exitTime ? form.exitTime.slice(0, 5) : "")}
                      onChange={handleChange}
                      style={{ height: 34, border: "1.5px solid #fca5a5", borderRadius: 6, padding: "0 8px", fontSize: 12, background: "#fff1f2", color: "#dc2626", fontWeight: 600 }}
                    />
                  : <input type="text" readOnly
                      value={form.closedTime || form.exitTime || "-"}
                      style={{ background: "#fff1f2", color: "#dc2626", fontWeight: 600 }}
                    />
                }
              </div>
            </>
          )}

          {/* 10. CHALLAN NO */}
          <div className="cgin-field">
            <label>Challan / Invoice No</label>
            {editing
              ? <input type="text" name="challanInvoiceNo" value={form.challanInvoiceNo || ""} onChange={handleChange}
                  placeholder="Enter challan / invoice no" className="inp-highlight" />
              : <input type="text" readOnly value={form.challanInvoiceNo || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 11. CHALLAN DATE + TIME */}
          <div className="cgin-field">
            <label>Challan Invoice Date &amp; Time</label>
            {editing
              ? <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" name="challanDate" value={form.challanDate || ""} onChange={handleChange}
                    className="inp-highlight" style={{ flex: 1 }} />
                  <input type="time" name="challanTime" value={form.challanTime || ""} onChange={handleChange}
                    className="inp-highlight" style={{ width: 110 }} />
                </div>
              : <input type="text" readOnly
                  value={[form.challanDate, form.challanTime].filter(Boolean).join("  ") || "-"}
                  style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>



          {/* 12. VEHICLE NO — REQUIRED */}
          <div className="cgin-field">
            <label>* Vehicle No</label>
            {editing
              ? <input type="text" name="vehicleNo" value={form.vehicleNo || ""} onChange={handleChange}
                  onBlur={(e) => { clearTimeout(vehicleCheckTimerRef.current); checkVehicleConflict(e.target.value); }}
                  placeholder="Enter vehicle no (required)" required />
              : <input type="text" readOnly value={form.vehicleNo || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 13. SITE */}
          <div className="cgin-field">
            <label>Site</label>
            {editing
              ? <select name="site" value={form.site || ""} onChange={handleChange} disabled={sitesLoading}>
                  <option value="">{sitesLoading ? "Loading…" : "- Select Site -"}</option>
                  {siteOptions.map((s) => (
                    <option key={s._id} value={s.siteCode}>{s.siteCode} — {s.siteName}</option>
                  ))}
                </select>
              : <input type="text" readOnly value={form.site || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 14. GROSS WEIGHT */}
          <div className="cgin-field">
            <label>Gross Weight</label>
            {editing
              ? <input type="number" name="grossWeight" value={form.grossWeight ?? ""} onChange={handleChange}
                  placeholder="e.g. 25000" min="0" step="0.01" />
              : <input type="text" readOnly value={form.grossWeight ?? "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 15. TARE WEIGHT */}
          <div className="cgin-field">
            <label>Tare Weight</label>
            {editing
              ? <input type="number" name="tareWeight" value={form.tareWeight ?? ""} onChange={handleChange}
                  placeholder="e.g. 7500" min="0" step="0.01" />
              : <input type="text" readOnly value={form.tareWeight ?? "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 16. NET WEIGHT */}
{/* 16. NET WEIGHT */}
  <div className="cgin-field">
    <label>Net Weight</label>
    {editing
      ? <input
          type="number"
          name="netWeight"
          value={form.netWeight ?? ""}
          readOnly
          style={{
            background: "#f8fafc",
            fontWeight: "600",
          }}
        />
              : <input type="text" readOnly value={form.netWeight ?? "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

          {/* 17. REMARKS — compact */}
          <div className="cgin-field">
            <label>Remarks</label>
            {editing
              ? <textarea rows="1" name="remarks" value={form.remarks || ""} onChange={handleChange}
                  placeholder="Enter remarks…" style={{ resize: "vertical", minHeight: 36 }} />
              : <input type="text" readOnly value={form.remarks || "-"} style={{ background: "#f8fafc", color: "#374151" }} />
            }
          </div>

        </div>

        {/* ── ITEMS SECTION ── */}
        <div className="cgin-items-section">
          <div className="cgin-items-header">
            <span className="cgin-items-title">Items</span>
            {editing && anyChecked && (
              <button className="cgin-del-rows-btn" onClick={handleDeleteChecked}>
                Delete Selected
              </button>
            )}
          </div>

          <div className="cgin-items-table-wrap">
            <table className="cgin-items-table">
              <thead>
                <tr>
                  {editing && <th style={{ width: 40 }}>✓</th>}
                  <th style={{ width: 50 }}>Sl No</th>
                  <th style={{ minWidth: 160 }}>Item Code</th>
                  <th style={{ minWidth: 200 }}>Item Name</th>
                  <th style={{ width: 90 }}>UOM</th>
                  <th style={{ width: 90 }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx} className={row._checked ? "cgin-row-checked" : ""}>
                    {editing && (
                      <td className="cgin-check-cell">
                        <input type="checkbox" checked={row._checked} onChange={(e) => handleItemCheck(idx, e.target.checked)} />
                      </td>
                    )}
                    <td className="cgin-sno-cell">{row.sNo}</td>

                    {/* Item Code */}
                    <td style={{ position: "relative" }}>
                      {editing
                        ? <TypeAhead value={row.itemCode} onChange={(v) => handleItemChange(idx, "itemCode", v)}
                            suggestions={allItemCodes} onSelect={(v) => handleItemCodeSelect(idx, v)}
                            placeholder="Code…" className="cgin-item-input" />
                        : <span>{row.itemCode || "-"}</span>
                      }
                    </td>

                    {/* Item Name */}
                    <td style={{ position: "relative" }}>
                      {editing
                        ? <TypeAhead value={row.itemName} onChange={(v) => handleItemChange(idx, "itemName", v)}
                            suggestions={allItemNames} onSelect={(v) => handleItemNameSelect(idx, v)}
                            placeholder="Name…" className="cgin-item-input cgin-item-wide" />
                        : <span>{row.itemName || "-"}</span>
                      }
                    </td>

                    {/* UOM */}
                    <td>
                      {editing
                        ? <input type="text" className="cgin-item-input cgin-item-sm" value={row.uom}
                            onChange={(e) => handleItemChange(idx, "uom", e.target.value)} placeholder="MT" />
                        : <span>{row.uom || "-"}</span>
                      }
                    </td>

                    {/* Qty — fetched from PO on create, editable here */}
                    <td>
                      {editing
                        ? <input type="number" className="cgin-item-input cgin-item-sm" value={row.qty ?? ""}
                            onChange={(e) => handleItemChange(idx, "qty", e.target.value)} placeholder="Qty" min="0" />
                        : <span>{row.qty ?? "-"}</span>
                      }
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insert Rows — only in edit mode */}
          {editing && (
            <div className="cgin-insert-row-bar">
              <input type="number" min="1" max="50" className="cgin-insert-count"
                value={insertCount} onChange={(e) => setInsertCount(e.target.value)} />
              <button className="cgin-insert-row-btn" onClick={handleInsertRows}>Insert Row</button>
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="cgin-bottom-actions" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "16px 24px 32px" }}>
          {/* Export to Weighment — always visible, direction based on inOutType */}
          <button
              onClick={handleExportToWeighment}
              disabled={exportingWeighment}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 34,
                padding: "0 16px",
                background: exportingWeighment ? "#6b7280" : (
                  (form.inOutType || "").toLowerCase() === "outward" ? "#d97706" : "#16a34a"
                ),
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                cursor: exportingWeighment ? "wait" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "background 0.2s, transform 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { if (!exportingWeighment) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
            >
              {exportingWeighment
                ? "Opening…"
                : `⚖ Export to ${(form.inOutType || "").toLowerCase() === "outward" ? "Outward" : "Inward"} Weighment`
              }
            </button>

          {editing ? (
            <>
              {/* Vehicle conflict ERROR — shows next to buttons, save is blocked */}
              {vehicleConflict && (
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "#991b1b",
                  background: "#fef2f2", border: "1.5px solid #ef4444",
                  borderRadius: 6, padding: "4px 10px", whiteSpace: "nowrap",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  ❌ Error: Vehicle still IN ({vehicleConflict.ginNo} — {vehicleConflict.status})
                </span>
              )}
              <button className="btn-cancel" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={saving || !!vehicleConflict}
                title={vehicleConflict ? `Cannot save — vehicle still inside: ${vehicleConflict.ginNo}` : ""}
                style={vehicleConflict ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : null}
      </div>

      <style>{`
        .cgin-header-right { display: flex; align-items: center; }
        .cgin-suggestions {
          position: absolute; top: 100%; left: 0; right: 0;
          background: #fff; border: 1px solid #cbd5e1; border-radius: 6px;
          max-height: 180px; overflow-y: auto; z-index: 999;
          margin: 0; padding: 0; list-style: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .cgin-suggestions li { padding: 8px 12px; cursor: pointer; font-size: 13px; color: #1e293b; }
        .cgin-suggestions li:hover { background: #f0f9ff; color: #0369a1; }
      `}</style>
    </div>
  );
};

export default GINDetail;