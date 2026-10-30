import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateDemand.css";
import { API_URL } from "../../../../config";

/*
  CREATE DEMAND — Step 2 of the Sales chain
  ───────────────────────────────────────────
  Demand No (auto, from Document Sequence) → Sauda No (typeahead over
  CONFIRMED Saudas only, shown as "SaudaNo - PartyName") → Party Code
  (auto) → Party Name (auto) → Party Address (auto) → Transaction Type
  (auto) → Demand Date → Dispatch Date → Priority
  → Items: Item Type (auto-filled from the source Sauda's items) /
           Item Code (auto, from Item Name) / Item Name (typeahead,
           Item Name master) / Size / Length / Qty

  Picking a Sauda seeds one item row per Sauda item (Item Type carried
  over, read via a dropdown scoped to that Sauda's item types), and the
  Item Name typeahead is filtered by whichever Item Type is selected —
  same pattern as Create Sauda's item grid.

  Status flow: Pending → Production Requested → Ready → Dispatched
  The Pending → Production Requested step happens automatically on
  the backend (see utils/productionRequestGenerator.js) once the
  Dispatch Date is "tomorrow" — it is not a button here.
*/

const API_BASE   = `${API_URL}/api/demand`;

const PRIORITIES = ["High", "Medium", "Low"];

/* ── 2-digit year date builder — mirrors documentSequenceRoutes.js, used
     to preview the Demand No. the moment a Transaction Category is picked
     (same pattern Create Inward/Outward uses for the GIN No. preview,
     and Create Sauda now uses for the Sauda No.) ── */
const buildDatePart = (format) => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    const year   = d.getFullYear();
    const start  = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy    = String(Math.floor((d - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`;
};

const blankItem = (sNo) => ({
  sNo, itemType: "", itemCode: "", itemName: "", size: "", length: "", qty: "",
});

const StatusBadge = ({ status }) => (
  <span className={`cd-status-badge cd-status-${(status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
    {status || "Pending"}
  </span>
);

const CreateDemand = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const today    = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    demandNo:        "",
    saudaId:         "",
    saudaNo:         "",
    transactionCategory: "",   // holds the Transaction Category _id while creating
    partyCode:       "",
    partyName:       "",
    partyAddress:    "",
    transactionType: "",
    demandDate:      today,
    dispatchDate:    "",
    priority:        "Medium",
    status:          "Pending",
    saudaQty:        0,   // fixed — total qty across all items on the source Sauda
  });

  const [items, setItems] = useState([blankItem(1)]);
  const [insertCount, setInsertCount] = useState(1);

  /* Item Type options are scoped to whichever Sauda is selected (not the
     full Sales Item Type master) — populated from that Sauda's items. */
  const [saudaItemTypes, setSaudaItemTypes] = useState([]);

  /* Item Name master — same source Create Sauda uses */
  const [itemNameOptions, setItemNameOptions] = useState([]);

  const [saudaOptions, setSaudaOptions] = useState([]);
  const [saudaQuery, setSaudaQuery]     = useState("");
  const [showSaudaList, setShowSaudaList] = useState(false);
  const saudaBoxRef = useRef(null);

  /* Transaction Category master — only Open categories configured for
     Sales / Demand Entry are shown, same as Create Inward/Outward does for GIN */
  const [transactionCategories, setTransactionCategories] = useState([]);
  /* Live Demand No. preview once a Transaction Category is picked (create only) */
  const [demandNoPreview, setDemandNoPreview] = useState("");

  /* Item Name typeahead state (per row) */
  const [activeItemRow, setActiveItemRow] = useState(null);
  const [itemNameSug,   setItemNameSug]   = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const isLocked = isEdit && form.status !== "Pending";

  /* Total Qty = sum of all item rows' Qty. Balance Qty = fixed Sauda Qty - Total Qty. */
  const totalQty   = useMemo(
    () => items.reduce((sum, r) => sum + (Number(r.qty) || 0), 0),
    [items]
  );
  const balanceQty = (Number(form.saudaQty) || 0) - totalQty;

  /* ── Load master data: Confirmed Saudas (picker) + Item Name master ── */
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [saudaRes, nameRes] = await Promise.all([
          fetch(`${API_BASE}/source-saudas`),
          fetch(`${API_URL}/api/item-names`),
        ]);
        const [saudaData, nameData] = await Promise.all([
          saudaRes.ok ? saudaRes.json() : [],
          nameRes.ok  ? nameRes.json()  : [],
        ]);
        setSaudaOptions(Array.isArray(saudaData) ? saudaData : []);
        setItemNameOptions(
          Array.isArray(nameData) ? nameData.filter((n) => n.status !== "Inactive") : []
        );
      } catch (err) {
        console.log("Error loading master data:", err);
      }
    };
    fetchMasters();
  }, []);

  /* ── Load Transaction Category master (Sales / Demand Entry, Open only) ── */
  useEffect(() => {
    fetch(`${API_URL}/api/transactions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setTransactionCategories(
          (Array.isArray(data) ? data : []).filter(
            (t) => t.module === "Sales" && t.businessEntity === "Demand Entry" && t.status === "Open"
          )
        );
      })
      .catch((err) => console.log("Error loading transaction categories:", err));
  }, []);

  /* ── Live Demand No. preview — recomputed whenever the Transaction
     Category changes. Only relevant while creating; once a Demand is
     saved its number is fixed. Mirrors Create Inward/Outward's
     IN/OUT WARD NO preview logic. ── */
  useEffect(() => {
    if (isEdit) return;
    if (!form.transactionCategory) { setDemandNoPreview(""); return; }
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) { setDemandNoPreview(""); return; }

    fetch(`${API_URL}/api/document-sequence`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const matching = (list || []).filter(
          (r) =>
            r.module === "Sales" &&
            r.businessEntity === "Demand Entry" &&
            r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setDemandNoPreview(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          return;
        }
        const last   = matching.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setDemandNoPreview(`${prefix}${date}${String(nextNo).padStart(digits, "0")}`);
      })
      .catch(() => setDemandNoPreview(""));
  }, [form.transactionCategory, transactionCategories, isEdit]);

  // ── On mount: load existing record, or fetch next Demand No ───────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (isEdit) {
          const res = await fetch(`${API_BASE}/${id}`);
          if (!res.ok) throw new Error("Record not found");
          const data = await res.json();
          setForm({
            demandNo:        data.demandNo        || "",
            saudaId:         data.saudaId          || "",
            saudaNo:         data.saudaNo          || "",
            transactionCategory: data.transactionCategory || "",  // description string once saved
            partyCode:       data.partyCode        || "",
            partyName:       data.partyName        || "",
            partyAddress:    data.partyAddress     || "",
            transactionType: data.transactionType  || "",
            demandDate:      data.demandDate       || today,
            dispatchDate:    data.dispatchDate     || "",
            priority:        data.priority         || "Medium",
            status:          data.status           || "Pending",
            saudaQty:        data.saudaQty         || 0,
          });
          setSaudaQuery(
            data.saudaNo ? `${data.saudaNo}${data.partyName ? " - " + data.partyName : ""}` : ""
          );
          setItems(
            data.items && data.items.length
              ? data.items.map((it, i) => ({ ...blankItem(i + 1), ...it, sNo: i + 1 }))
              : [blankItem(1)]
          );
        }
        // Non-edit (create) mode: Demand No. is now generated from the
        // Transaction Category the user selects, not fetched up-front.
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  // Close the Sauda suggestion list on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (saudaBoxRef.current && !saudaBoxRef.current.contains(e.target)) setShowSaudaList(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // ── Sauda picker — only ever shows Confirmed Saudas (source-saudas API) ──
  const filteredSaudas = saudaOptions.filter((s) =>
    (s.saudaNo || "").toLowerCase().includes(saudaQuery.toLowerCase()) ||
    (s.partyName || "").toLowerCase().includes(saudaQuery.toLowerCase())
  );

  const pickSauda = (sauda) => {
    // Fixed Sauda Qty — total qty across ALL items on the source Sauda,
    // captured once at pick time (shown up top, doesn't change afterwards)
    const saudaQtyTotal = (sauda.items || []).reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

    setForm((p) => ({
      ...p,
      saudaId:         sauda._id,
      saudaNo:         sauda.saudaNo,
      partyCode:       sauda.partyCode       || "",
      partyName:       sauda.partyName       || "",
      partyAddress:    sauda.partyAddress    || "",
      transactionType: sauda.transactionType || "",
      saudaQty:        saudaQtyTotal,
    }));
    setSaudaQuery(`${sauda.saudaNo}${sauda.partyName ? " - " + sauda.partyName : ""}`);
    setShowSaudaList(false);

    // Item Type choices for the grid come from THIS Sauda's items only
    const types = [...new Set((sauda.items || []).map((it) => it.itemType).filter(Boolean))];
    setSaudaItemTypes(types);

    // Seed one row per Sauda item — Item Type carried over (auto-filled),
    // Item Name/Code/Size/Length/Qty left for the user to fill in fresh.
    if (sauda.items && sauda.items.length) {
      setItems(
        sauda.items.map((it, i) => ({
          ...blankItem(i + 1),
          itemType: it.itemType || "",
        }))
      );
    } else {
      setItems([blankItem(1)]);
    }
  };

  // ── Item row handlers ───────────────────────────────────────────────
  const handleItemTypeChange = (rowIdx, val) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], itemType: val, itemName: "", itemCode: "" };
      return next;
    });
  };

  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return next;
    });
  };

  const handleItemNameInput = (rowIdx, val) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], itemName: val, itemCode: "" };
      return next;
    });
    setActiveItemRow(rowIdx);

    const rowType = items[rowIdx]?.itemType;
    const pool = rowType
      ? itemNameOptions.filter((n) => n.itemType === rowType)
      : itemNameOptions;

    if (val.trim()) {
      const lower = val.toLowerCase();
      setItemNameSug(pool.filter((n) => n.itemName?.toLowerCase().includes(lower)));
    } else {
      setItemNameSug(pool);
    }
  };

  const handleItemNameFocus = (rowIdx) => {
    setActiveItemRow(rowIdx);
    const rowType = items[rowIdx]?.itemType;
    const pool = rowType
      ? itemNameOptions.filter((n) => n.itemType === rowType)
      : itemNameOptions;
    setItemNameSug(pool);
  };

  const handleItemNameSelect = (rowIdx, nameDoc) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        itemName: nameDoc.itemName || "",
        itemCode: nameDoc.itemCode || "",
      };
      return next;
    });
    setActiveItemRow(null);
    setItemNameSug([]);
  };

  const handleItemCheck = (rowIdx, checked) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], _checked: checked };
      return next;
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
    setItems((prev) => {
      const remaining = prev.filter((r) => !r._checked);
      return (remaining.length ? remaining : [blankItem(1)]).map((r, i) => ({ ...r, sNo: i + 1 }));
    });
  };

  // ── Validation ───────────────────────────────────────────────────────
  const validate = () => {
    if (!isEdit && !form.transactionCategory) return "Please select a Transaction Category.";
    if (!form.saudaId && !form.saudaNo) return "Please select a source Sauda.";
    if (!form.dispatchDate) return "Dispatch Date is required.";
    const validRows = items.filter((r) => r.itemType && r.itemName && r.qty);
    if (validRows.length === 0) return "Please add at least one row with Item Type, Item Name and Qty.";
    if (balanceQty < 0) {
      return `Total Qty (${totalQty}) exceeds the Sauda Qty (${form.saudaQty}). Reduce the item quantities.`;
    }
    return "";
  };

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError("");
    setSuccess("");
    const msg = validate();
    if (msg) { setError(msg); return; }

    setSaving(true);
    try {
      const cleanItems = items
        .filter((r) => r.itemType || r.itemCode || r.itemName || r.size || r.length || r.qty)
        .map((r, i) => ({
          sNo:      i + 1,
          itemType: r.itemType,
          itemCode: r.itemCode,
          itemName: r.itemName,
          size:     r.size,
          length:   Number(r.length) || 0,
          qty:      Number(r.qty)    || 0,
        }));

      let demandNo = form.demandNo;
      let transactionCategoryDesc = form.transactionCategory;

      if (!isEdit) {
        // ── Generate the Demand No. from the chosen Transaction Category's
        //    Document Sequence — same pattern Create Inward/Outward uses
        //    for the GIN No., and Create Sauda uses for the Sauda No. ──
        const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
        if (!cat) { setError("Invalid Transaction Category selected."); setSaving(false); return; }

        const seqListRes = await fetch(`${API_URL}/api/document-sequence`);
        const seqList = seqListRes.ok ? await seqListRes.json() : [];
        const matchingSeq = (seqList || []).filter(
          (r) => r.module === "Sales" && r.businessEntity === "Demand Entry" && r.transactionCategory === cat.categoryDescription
        );
        if (!matchingSeq.length) {
          setError(`No Document Sequence is set up for "${cat.categoryDescription}". Please create one first.`);
          setSaving(false);
          return;
        }
        const seqEntry     = matchingSeq.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const entityPrefix = (seqEntry.entityPrefix || "").trim().toUpperCase();

        const seqRes = await fetch(`${API_URL}/api/create-document-sequence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: "Sales",
            businessEntity: "Demand Entry",
            entityPrefix,
            transactionCategory: cat.categoryDescription,
          }),
        });
        const seqData = await seqRes.json();
        if (!seqRes.ok || !seqData.generatedCode) {
          throw new Error(seqData.message || "Could not generate Demand No.");
        }
        demandNo = seqData.generatedCode;
        transactionCategoryDesc = cat.categoryDescription;
      }

      const payload = {
        ...form,
        demandNo,
        transactionCategory: transactionCategoryDesc,
        totalQty,
        balanceQty,
        items: cleanItems,
      };
      const url    = isEdit ? `${API_BASE}/${id}` : API_BASE;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed");
      }

      setSuccess("Demand saved successfully.");
      setTimeout(() => navigate("/demand-search"), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-topbar">
          <div className="cd-topbar-left">
            <button className="cd-back-btn" onClick={() => navigate("/demand-search")}>
              ← {isEdit ? "Edit Demand" : "Create Demand"}
            </button>
          </div>
        </div>
        <div className="cd-body">
          <div className="cd-card cd-loading">
            <div className="cd-spinner" />
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-page">

      {/* ── TOP BAR ── */}
      <div className="cd-topbar">
        <div className="cd-topbar-left">
          <button className="cd-back-btn" onClick={() => navigate("/demand-search")}>
            ← {isEdit ? "Edit Demand" : "Create Demand"}
          </button>
        </div>
        <div className="cd-topbar-right">
          <StatusBadge status={form.status} />
          <span className="cd-demand-no">#{form.demandNo || "—"}</span>
        </div>
      </div>

      <div className="cd-body">
        <div className="cd-card">

          {error   && <div className="cd-alert cd-alert-err">{error}</div>}
          {success && <div className="cd-alert cd-alert-ok">{success}</div>}
          {isLocked && (
            <div className="cd-alert cd-alert-ok">
              This Demand is <strong>{form.status}</strong> — it has moved past Pending, so fields are read-only.
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} noValidate>

            <div className="cd-section-title">Demand Details</div>
            <div className="cd-grid">

              {/* TRANSACTION CATEGORY — drives the Demand No. via Document Sequence,
                  same pattern as Create Inward/Outward's GIN No. and Create Sauda's
                  Sauda No. Master data only (Open categories, Sales / Demand Entry). */}
              <div className="cd-group">
                <label className="cd-label">Transaction Category {!isEdit && <span className="cd-req">*</span>}</label>
                {isEdit ? (
                  <input className="cd-input cd-readonly" value={form.transactionCategory || "-"} readOnly />
                ) : (
                  <select
                    className="cd-input"
                    name="transactionCategory"
                    value={form.transactionCategory}
                    onChange={handleChange}
                    disabled={isLocked}
                  >
                    <option value="">- Select -</option>
                    {transactionCategories.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.transactionCategoryCode} — {t.categoryDescription}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="cd-group">
                <label className="cd-label">Demand No.</label>
                <input
                  className="cd-input cd-readonly"
                  readOnly
                  value={
                    isEdit
                      ? form.demandNo
                      : !form.transactionCategory
                        ? "Select category first…"
                        : (demandNoPreview || "Generating…")
                  }
                  style={!isEdit && form.transactionCategory ? { fontWeight: 600, letterSpacing: 1, color: "#15803d" } : undefined}
                />
              </div>

              <div className="cd-group" ref={saudaBoxRef}>
                <label className="cd-label">Sauda No. <span className="cd-req">*</span></label>
                <input
                  className="cd-input"
                  value={saudaQuery}
                  onChange={(e) => { setSaudaQuery(e.target.value); setShowSaudaList(true); }}
                  onFocus={() => setShowSaudaList(true)}
                  placeholder="Search confirmed Sauda…"
                  autoComplete="off"
                  disabled={isLocked}
                />
                {showSaudaList && !isLocked && (
                  <ul className="cd-suggestions">
                    {filteredSaudas.length === 0 && <li>No confirmed Saudas found</li>}
                    {filteredSaudas.map((s) => (
                      <li key={s._id} onClick={() => pickSauda(s)}>
                        {s.saudaNo} - {s.partyName || "—"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="cd-group">
                <label className="cd-label">Party Code</label>
                <input className="cd-input cd-readonly" value={form.partyCode} readOnly placeholder="Auto-filled from Sauda" />
              </div>

              <div className="cd-group">
                <label className="cd-label">Party Name</label>
                <input className="cd-input cd-readonly" value={form.partyName} readOnly placeholder="Auto-filled from Sauda" />
              </div>

              <div className="cd-group">
                <label className="cd-label">Party Address</label>
                <input className="cd-input cd-readonly" value={form.partyAddress} readOnly placeholder="Auto-filled from Sauda" />
              </div>

              <div className="cd-group">
                <label className="cd-label">Transaction Type</label>
                <input className="cd-input cd-readonly" value={form.transactionType} readOnly placeholder="Auto-filled from Sauda" />
              </div>

              <div className="cd-group">
                <label className="cd-label">Demand Date <span className="cd-req">*</span></label>
                <input
                  className="cd-input" type="date" name="demandDate"
                  value={form.demandDate} onChange={handleChange} disabled={isLocked}
                />
              </div>

              <div className="cd-group">
                <label className="cd-label">Dispatch Date <span className="cd-req">*</span></label>
                <input
                  className="cd-input" type="date" name="dispatchDate"
                  value={form.dispatchDate} onChange={handleChange} disabled={isLocked}
                />
              </div>

              <div className="cd-group">
                <label className="cd-label">Priority</label>
                <select
                  className={`cd-input cd-priority-${form.priority.toLowerCase()}`}
                  name="priority" value={form.priority} onChange={handleChange} disabled={isLocked}
                >
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

            </div>

            {/* ── ITEMS TABLE ── */}
            <div className="cd-section-title">Items</div>

            {/* Sauda Qty (fixed) / Total Qty (sum of item qtys) / Balance Qty */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
              {[
                { label: "Sauda Qty",   value: form.saudaQty, bg: "#eef2ff", fg: "#3730a3" },
                { label: "Total Qty",   value: totalQty,      bg: "#dcfce7", fg: "#166534" },
                {
                  label: "Balance Qty", value: balanceQty,
                  bg: balanceQty < 0 ? "#fee2e2" : "#e0f2fe",
                  fg: balanceQty < 0 ? "#991b1b" : "#075985",
                },
              ].map((box) => (
                <div
                  key={box.label}
                  style={{ flex: "1 1 160px", minWidth: 150, background: box.bg, color: box.fg, borderRadius: 8, padding: "8px 14px" }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{box.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{box.value}</div>
                </div>
              ))}
            </div>

            <div className="cd-items-section">
              <div className="cd-items-header">
                <span className="cd-items-title">Item Type / Item Code / Item Name / Size / Length / Qty</span>
                {!isLocked && (
                  <button type="button" className="cd-del-rows-btn" onClick={handleDeleteChecked}>
                    Delete Checked Rows
                  </button>
                )}
              </div>

              <div className="cd-items-table-wrap">
                <table className="cd-items-table">
                  <thead>
                    <tr>
                      <th className="cd-check-cell">✓</th>
                      <th className="cd-sno-cell">S.No</th>
                      <th>Item Type</th>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Size</th>
                      <th>Length</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, idx) => (
                      <tr key={idx} className={row._checked ? "cd-row-checked" : ""}>
                        <td className="cd-check-cell">
                          <input
                            type="checkbox"
                            checked={!!row._checked}
                            onChange={(e) => handleItemCheck(idx, e.target.checked)}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="cd-sno-cell">{row.sNo}</td>

                        {/* ITEM TYPE — auto-filled/scoped from the selected Sauda's items */}
                        <td>
                          <select
                            className="cd-item-input"
                            value={row.itemType}
                            onChange={(e) => handleItemTypeChange(idx, e.target.value)}
                            disabled={isLocked || saudaItemTypes.length === 0}
                          >
                            <option value="">—</option>
                            {saudaItemTypes.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>

                        {/* ITEM CODE — auto-filled from Item Name, read-only */}
                        <td>
                          <input
                            className="cd-item-input"
                            value={row.itemCode}
                            readOnly
                            placeholder="Auto"
                            style={{ background: "#f3f4f6" }}
                          />
                        </td>

                        {/* ITEM NAME — typeahead, Item Name master, filtered by Item Type */}
                        <td className="cd-suggest-wrap">
                          <input
                            className="cd-item-input"
                            value={row.itemName}
                            onChange={(e) => handleItemNameInput(idx, e.target.value)}
                            onFocus={() => handleItemNameFocus(idx)}
                            placeholder={row.itemType ? "Type or select item…" : "Select Item Type first"}
                            disabled={isLocked || !row.itemType}
                            autoComplete="off"
                          />
                          {activeItemRow === idx && itemNameSug.length > 0 && (
                            <ul className="cd-suggest-list">
                              {itemNameSug.map((n) => (
                                <li key={n._id} onMouseDown={() => handleItemNameSelect(idx, n)}>
                                  {n.itemCode} — {n.itemName}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>

                        <td>
                          <input
                            className="cd-item-input"
                            value={row.size}
                            onChange={(e) => handleItemChange(idx, "size", e.target.value)}
                            placeholder="e.g. 8MM"
                            disabled={isLocked}
                          />
                        </td>
                        <td>
                          <input
                            className="cd-item-input"
                            type="number" min="0"
                            value={row.length}
                            onChange={(e) => handleItemChange(idx, "length", e.target.value)}
                            placeholder="0"
                            disabled={isLocked}
                          />
                        </td>
                        <td>
                          <input
                            className="cd-item-input"
                            type="number" min="0"
                            value={row.qty}
                            onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                            placeholder="0"
                            disabled={isLocked}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!isLocked && (
                <div className="cd-insert-row-bar">
                  <input
                    type="number" min="1" max="50" className="cd-insert-count"
                    value={insertCount} onChange={(e) => setInsertCount(e.target.value)}
                  />
                  <button type="button" className="cd-insert-row-btn" onClick={handleInsertRows}>
                    + Insert Rows
                  </button>
                </div>
              )}
            </div>

            {/* ── BUTTONS ── */}
            <div className="cd-btn-row">
              <button type="button" className="cd-btn cd-btn-cancel" onClick={() => navigate("/demand-search")}>
                Back
              </button>
              {!isLocked && (
                <button type="button" className="cd-btn cd-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save Demand"}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDemand;