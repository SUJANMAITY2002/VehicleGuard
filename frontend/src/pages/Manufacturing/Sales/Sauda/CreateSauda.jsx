import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateSauda.css";
import { API_URL } from "../../../../config";

/*
  CREATE SAUDA — Step 1 of the Sales chain
  ─────────────────────────────────────────
  Sauda No (auto, from Document Sequence) → Date (today, editable) →
  Party Code (auto) → Party Name (typeahead, Sales Party master) →
  Party Address (auto) → Transaction Type (T / UT) → Valid Till (optional)
  → Payment Terms → Remarks
  → Items: Sl No / Item Type (Sales Item Type master) / Item Code (auto) /
           Item Name (typeahead, Item Name master) / Rate / Qty

  Status flow: Draft → Confirmed → Completed
                        └────────→ Cancelled

  Once Confirmed, a Sauda becomes the source document for Demand Entry
  (Step 2), so edits are locked and only Cancel remains available.
*/

const API_BASE = `${API_URL}/api/sauda`;

const PAYMENT_TERMS = ["Prepaid", "Postpaid", "Advance 50%", "Credit 30 Days"];

/* ── 2-digit year date builder — mirrors documentSequenceRoutes.js, used
     to preview the Sauda No. the moment a Transaction Category is picked
     (same pattern Create Inward/Outward uses for the GIN No. preview) ── */
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
  sNo, itemType: "", itemCode: "", itemName: "", rate: "", qty: "",
});

/* ── Defensive field getters — adjust here if your Sales Party master
     uses different field names than partyCode / partyName / address ── */
const getPartyCode    = (p) => p?.partyCode ?? p?.code ?? p?.salesPartyCode ?? "";
const getPartyName    = (p) => p?.partyName ?? p?.name ?? "";
/* Sales Party master (SalesPartyRoutes.js) has no address field — it stores
   location / city / district / state / pinCode separately. Build a
   display address from those instead of looking for a field that
   doesn't exist (which is why it was never auto-filling before). */
const getPartyAddress = (p) => {
  if (!p) return "";
  if (p.address) return p.address;
  if (p.partyAddress) return p.partyAddress;
  if (p.billingAddress) return p.billingAddress;
  return [p.location, p.city, p.district].filter(Boolean).join(", ");
};

const StatusBadge = ({ status }) => (
  <span className={`scf-status-badge scf-status-${(status || "draft").toLowerCase()}`}>
    {status || "Draft"}
  </span>
);

const CreateSauda = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    saudaNo:      "",
    saudaDate:    today,
    transactionCategory: "",   // holds the Transaction Category _id while creating
    partyCode:    "",
    partyName:    "",
    partyAddress: "",
    transactionType: "T",
    validTill:    "",
    paymentTerms: "",
    remarks:      "",
    status:       "Draft",
  });

  const [items, setItems] = useState([blankItem(1)]);
  const [insertCount, setInsertCount] = useState(1);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const isLocked = isEdit && form.status !== "Draft";

  /* ── Master data ─────────────────────────────────────────────────── */
  const [partyOptions,    setPartyOptions]    = useState([]); // Sales Party master
  const [itemTypeOptions, setItemTypeOptions] = useState([]); // Sales Item Type master
  const [itemNameOptions, setItemNameOptions] = useState([]); // Item Name master

  /* Transaction Category master — only Open categories configured for
     Sales / Sauda are shown, same as Create Inward/Outward does for GIN */
  const [transactionCategories, setTransactionCategories] = useState([]);
  /* Live Sauda No. preview once a Transaction Category is picked (create only) */
  const [saudaNoPreview, setSaudaNoPreview] = useState("");

  /* ── Party typeahead state ──────────────────────────────────────── */
  const [partyInput,    setPartyInput]    = useState("");
  const [partySug,      setPartySug]      = useState([]);
  const [showPartySug,  setShowPartySug]  = useState(false);
  const partyRef = useRef(null);

  /* ── Item Name typeahead state (per row) ────────────────────────── */
  const [activeItemRow, setActiveItemRow] = useState(null);
  const [itemNameSug,   setItemNameSug]   = useState([]);

  /* ── Load master data ────────────────────────────────────────────── */
  useEffect(() => {
    const fetchMasters = async () => {
      try {
        const [partyRes, typeRes, nameRes] = await Promise.all([
          fetch(`${API_URL}/api/sales-parties`),
          fetch(`${API_URL}/api/sales-item-types`),
          fetch(`${API_URL}/api/item-names`),
        ]);
        const [partyData, typeData, nameData] = await Promise.all([
          partyRes.ok ? partyRes.json() : [],
          typeRes.ok  ? typeRes.json()  : [],
          nameRes.ok  ? nameRes.json()  : [],
        ]);
        setPartyOptions(Array.isArray(partyData) ? partyData : []);
        setItemTypeOptions(Array.isArray(typeData) ? typeData : []);
        setItemNameOptions(
          Array.isArray(nameData) ? nameData.filter((n) => n.status !== "Inactive") : []
        );
      } catch (err) {
        console.log("Error loading master data:", err);
      }
    };
    fetchMasters();
  }, []);

  /* ── Load Transaction Category master (Sales / Sauda, Open only) ── */
  useEffect(() => {
    fetch(`${API_URL}/api/transactions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setTransactionCategories(
          (Array.isArray(data) ? data : []).filter(
            (t) => t.module === "Sales" && t.businessEntity === "Sauda" && t.status === "Open"
          )
        );
      })
      .catch((err) => console.log("Error loading transaction categories:", err));
  }, []);

  /* ── Live Sauda No. preview — recomputed whenever the Transaction
     Category changes. Only relevant while creating; once a Sauda is
     saved its number is fixed. Mirrors Create Inward/Outward's
     IN/OUT WARD NO preview logic. ── */
  useEffect(() => {
    if (isEdit) return;
    if (!form.transactionCategory) { setSaudaNoPreview(""); return; }
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) { setSaudaNoPreview(""); return; }

    fetch(`${API_URL}/api/document-sequence`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const matching = (list || []).filter(
          (r) =>
            r.module === "Sales" &&
            r.businessEntity === "Sauda" &&
            r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setSaudaNoPreview(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          return;
        }
        const last   = matching.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setSaudaNoPreview(`${prefix}${date}${String(nextNo).padStart(digits, "0")}`);
      })
      .catch(() => setSaudaNoPreview(""));
  }, [form.transactionCategory, transactionCategories, isEdit]);

  /* Close party suggestion list on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) setShowPartySug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── On mount: load existing record or fetch next Sauda No ─────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (isEdit) {
          const res = await fetch(`${API_BASE}/${id}`);
          if (!res.ok) throw new Error("Record not found");
          const data = await res.json();
          setForm({
            saudaNo:      data.saudaNo      || "",
            saudaDate:    data.saudaDate    || today,
            transactionCategory: data.transactionCategory || "",  // description string once saved
            partyCode:    data.partyCode    || "",
            partyName:    data.partyName    || "",
            partyAddress: data.partyAddress || "",
            transactionType: data.transactionType || "T",
            validTill:    data.validTill    || "",
            paymentTerms: data.paymentTerms || "",
            remarks:      data.remarks      || "",
            status:       data.status       || "Draft",
          });
          setPartyInput(data.partyName || "");
          setItems(
            data.items && data.items.length
              ? data.items.map((it, i) => ({ ...blankItem(i + 1), ...it, sNo: i + 1 }))
              : [blankItem(1)]
          );
        }
        // Non-edit (create) mode: Sauda No. is now generated from the
        // Transaction Category the user selects, not fetched up-front.
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  /* ── Party typeahead handlers ────────────────────────────────────── */
  const handlePartyInput = (val) => {
    setPartyInput(val);
    setForm((p) => ({ ...p, partyName: val, partyCode: "", partyAddress: "" }));
    if (val.trim()) {
      const lower = val.toLowerCase();
      const matches = partyOptions.filter((p) => getPartyName(p).toLowerCase().includes(lower));
      setPartySug(matches);
      setShowPartySug(matches.length > 0);
    } else {
      setPartySug([]);
      setShowPartySug(false);
    }
  };

  const handlePartySelect = (party) => {
    setPartyInput(getPartyName(party));
    setForm((p) => ({
      ...p,
      partyName:    getPartyName(party),
      partyCode:    getPartyCode(party),
      partyAddress: getPartyAddress(party),
    }));
    setShowPartySug(false);
  };

  // ── Item row handlers ───────────────────────────────────────────────────
  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return next;
    });
  };

  /* Item Type — changing it resets the Item Name/Code for that row since
     the Item Name suggestions are filtered by Item Type */
  const handleItemTypeChange = (rowIdx, val) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], itemType: val, itemName: "", itemCode: "" };
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
        itemType: nameDoc.itemType || next[rowIdx].itemType,
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

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    if (!isEdit && !form.transactionCategory) return "Please select a Transaction Category.";
    if (!form.partyName) return "Please select a Party.";
    if (!form.saudaDate) return "Date is required.";
    const validRows = items.filter((r) => r.itemName && r.rate && r.qty);
    if (validRows.length === 0) return "Please add at least one item row (Item Name, Rate and Qty required).";
    return "";
  };

  // ── Save (Draft or Confirm) ─────────────────────────────────────────────
  const handleSave = async (nextStatus) => {
    setError("");
    setSuccess("");

    const msg = validate();
    if (msg) { setError(msg); return; }

    setSaving(true);
    try {
      const cleanItems = items
        .filter((r) => r.itemType || r.itemCode || r.itemName || r.rate || r.qty)
        .map((r, i) => ({
          sNo:      i + 1,
          itemType: r.itemType,
          itemCode: r.itemCode,
          itemName: r.itemName,
          rate:     Number(r.rate) || 0,
          qty:      Number(r.qty)  || 0,
        }));

      let saudaNo = form.saudaNo;
      let transactionCategoryDesc = form.transactionCategory;

      if (!isEdit) {
        // ── Generate the Sauda No. from the chosen Transaction Category's
        //    Document Sequence — same pattern Create Inward/Outward uses
        //    for the GIN No. Done here (not on category-select) so the
        //    sequence only actually advances once, on Save. ──
        const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
        if (!cat) { setError("Invalid Transaction Category selected."); setSaving(false); return; }

        const seqListRes = await fetch(`${API_URL}/api/document-sequence`);
        const seqList = seqListRes.ok ? await seqListRes.json() : [];
        const matchingSeq = (seqList || []).filter(
          (r) => r.module === "Sales" && r.businessEntity === "Sauda" && r.transactionCategory === cat.categoryDescription
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
            businessEntity: "Sauda",
            entityPrefix,
            transactionCategory: cat.categoryDescription,
          }),
        });
        const seqData = await seqRes.json();
        if (!seqRes.ok || !seqData.generatedCode) {
          throw new Error(seqData.message || "Could not generate Sauda No.");
        }
        saudaNo = seqData.generatedCode;
        transactionCategoryDesc = cat.categoryDescription;
      }

      const payload = {
        ...form,
        saudaNo,
        transactionCategory: transactionCategoryDesc,
        status: nextStatus,
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

      setForm((p) => ({ ...p, saudaNo, transactionCategory: transactionCategoryDesc, status: nextStatus }));
      setSuccess(
        nextStatus === "Confirmed" ? "Sauda confirmed successfully!" : "Sauda saved as draft."
      );
      setTimeout(() => navigate("/sauda-search"), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel a confirmed Sauda ─────────────────────────────────────────────
  const handleCancelSauda = async () => {
    if (!window.confirm("Cancel this Sauda? This cannot be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
      });
      if (!res.ok) throw new Error("Could not cancel Sauda");
      setForm((p) => ({ ...p, status: "Cancelled" }));
      setSuccess("Sauda cancelled.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="scf-page">
        <div className="scf-topbar">
          <div className="scf-topbar-left">
            <button className="scf-back-btn" onClick={() => navigate("/sauda-search")}>
              ← {isEdit ? "Edit Sauda" : "Create Sauda"}
            </button>
          </div>
        </div>
        <div className="scf-body">
          <div className="scf-card scf-loading">
            <div className="scf-spinner" />
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scf-page">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="scf-topbar">
        <div className="scf-topbar-left">
          <button className="scf-back-btn" onClick={() => navigate("/sauda-search")}>
            ← {isEdit ? "Edit Sauda" : "Create Sauda"}
          </button>
        </div>
        <div className="scf-topbar-right">
          <StatusBadge status={form.status} />
          <span className="scf-contract-no">#{form.saudaNo || "—"}</span>
        </div>
      </div>

      <div className="scf-body">
        <div className="scf-card">

          {error   && <div className="scf-alert scf-alert-err">{error}</div>}
          {success && <div className="scf-alert scf-alert-ok">{success}</div>}
          {isLocked && (
            <div className="scf-alert scf-alert-ok">
              This Sauda is <strong>{form.status}</strong> — it has moved past Draft, so fields are read-only.
              {form.status === "Confirmed" && " A Demand can now be created from it."}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} noValidate>

            {/* ── SECTION: Sauda Details ── */}
            <div className="scf-section-title">Sauda Details</div>
            <div className="scf-grid">

              {/* TRANSACTION CATEGORY — drives the Sauda No. via Document Sequence,
                  same pattern as Create Inward/Outward's GIN No. Master data only
                  (Open categories configured for Sales / Sauda). Fixed once created. */}
              <div className="scf-group">
                <label className="scf-label">Transaction Category {!isEdit && <span className="scf-req">*</span>}</label>
                {isEdit ? (
                  <input className="scf-input scf-readonly" type="text" value={form.transactionCategory || "-"} readOnly />
                ) : (
                  <select
                    className="scf-input"
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

              <div className="scf-group">
                <label className="scf-label">Sauda No.</label>
                <input
                  className="scf-input scf-readonly"
                  type="text"
                  readOnly
                  value={
                    isEdit
                      ? form.saudaNo
                      : !form.transactionCategory
                        ? "Select category first…"
                        : (saudaNoPreview || "Generating…")
                  }
                  style={!isEdit && form.transactionCategory ? { fontWeight: 600, letterSpacing: 1, color: "#15803d" } : undefined}
                />
              </div>

              <div className="scf-group">
                <label className="scf-label">Date <span className="scf-req">*</span></label>
                <input
                  className="scf-input"
                  type="date"
                  name="saudaDate"
                  value={form.saudaDate}
                  onChange={handleChange}
                  disabled={isLocked}
                  required
                />
              </div>

              <div className="scf-group">
                <label className="scf-label">Party Code</label>
                <input className="scf-input scf-readonly" type="text" value={form.partyCode} readOnly placeholder="Auto-filled on party select" />
              </div>

              {/* PARTY NAME — typeahead, Sales Party master */}
              <div className="scf-group scf-suggest-wrap" ref={partyRef}>
                <label className="scf-label">Party Name <span className="scf-req">*</span></label>
                <input
                  className="scf-input"
                  type="text"
                  value={partyInput}
                  onChange={(e) => handlePartyInput(e.target.value)}
                  onFocus={() => partyInput && partySug.length > 0 && setShowPartySug(true)}
                  placeholder="Type or select party…"
                  autoComplete="off"
                  disabled={isLocked}
                />
                {showPartySug && (
                  <ul className="scf-suggest-list">
                    {partySug.map((p) => (
                      <li key={p._id} onMouseDown={() => handlePartySelect(p)}>
                        {getPartyName(p)} {getPartyCode(p) ? `(${getPartyCode(p)})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="scf-group">
                <label className="scf-label">Party Address</label>
                <input className="scf-input scf-readonly" type="text" value={form.partyAddress} readOnly placeholder="Auto-filled on party select" />
              </div>

              <div className="scf-group">
                <label className="scf-label">Transaction Type <span className="scf-req">*</span></label>
                <select
                  className="scf-input"
                  name="transactionType"
                  value={form.transactionType}
                  onChange={handleChange}
                  disabled={isLocked}
                >
                  <option value="T">T</option>
                  <option value="UT">UT</option>
                </select>
              </div>

              <div className="scf-group">
                <label className="scf-label">Valid Till</label>
                <input
                  className="scf-input"
                  type="date"
                  name="validTill"
                  value={form.validTill}
                  onChange={handleChange}
                  disabled={isLocked}
                />
              </div>

              <div className="scf-group">
                <label className="scf-label">Payment Terms</label>
                <select
                  className="scf-input"
                  name="paymentTerms"
                  value={form.paymentTerms}
                  onChange={handleChange}
                  disabled={isLocked}
                >
                  <option value="">— Select Terms —</option>
                  {PAYMENT_TERMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

            </div>

            {/* ── SECTION: Remarks ── */}
            <div className="scf-section-title">Additional Info</div>
            <div className="scf-group scf-full">
              <label className="scf-label">Remarks</label>
              <textarea
                className="scf-input scf-textarea"
                name="remarks"
                rows="3"
                placeholder="Optional remarks…"
                value={form.remarks}
                onChange={handleChange}
                disabled={isLocked}
              />
            </div>

            {/* ── ITEMS TABLE ── */}
            <div className="scf-section-title">Items</div>
            <div className="scf-items-section">
              <div className="scf-items-header">
                <span className="scf-items-title">Item Type / Item Code / Item Name / Rate / Qty</span>
                {!isLocked && (
                  <button type="button" className="scf-del-rows-btn" onClick={handleDeleteChecked}>
                    Delete Checked Rows
                  </button>
                )}
              </div>

              <div className="scf-items-table-wrap">
                <table className="scf-items-table">
                  <thead>
                    <tr>
                      <th className="scf-check-cell">✓</th>
                      <th className="scf-sno-cell">S.No</th>
                      <th>Item Type</th>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Rate</th>
                      <th>Qty</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, idx) => (
                      <tr key={idx} className={row._checked ? "scf-row-checked" : ""}>
                        <td className="scf-check-cell">
                          <input
                            type="checkbox"
                            checked={!!row._checked}
                            onChange={(e) => handleItemCheck(idx, e.target.checked)}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="scf-sno-cell">{row.sNo}</td>

                        {/* ITEM TYPE — from Sales Item Type master */}
                        <td>
                          <select
                            className="scf-item-input scf-item-sm"
                            value={row.itemType}
                            onChange={(e) => handleItemTypeChange(idx, e.target.value)}
                            disabled={isLocked}
                          >
                            <option value="">—</option>
                            {itemTypeOptions.map((t) => (
                              <option key={t._id} value={t.itemType}>{t.itemType}</option>
                            ))}
                          </select>
                        </td>

                        {/* ITEM CODE — auto-filled, read-only */}
                        <td>
                          <input
                            className="scf-item-input scf-item-sm"
                            value={row.itemCode}
                            readOnly
                            placeholder="Auto"
                            style={{ background: "#f3f4f6" }}
                          />
                        </td>

                        {/* ITEM NAME — typeahead, Item Name master, filtered by Item Type */}
                        <td className="scf-suggest-wrap">
                          <input
                            className="scf-item-input scf-item-wide"
                            value={row.itemName}
                            onChange={(e) => handleItemNameInput(idx, e.target.value)}
                            onFocus={() => handleItemNameFocus(idx)}
                            placeholder={row.itemType ? "Type or select item…" : "Select Item Type first"}
                            disabled={isLocked || !row.itemType}
                            autoComplete="off"
                          />
                          {activeItemRow === idx && itemNameSug.length > 0 && (
                            <ul className="scf-suggest-list">
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
                            className="scf-item-input scf-item-num"
                            type="number"
                            min="0"
                            value={row.rate}
                            onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                            placeholder="0.00"
                            disabled={isLocked}
                          />
                        </td>
                        <td>
                          <input
                            className="scf-item-input scf-item-num"
                            type="number"
                            min="0"
                            value={row.qty}
                            onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                            placeholder="0"
                            disabled={isLocked}
                          />
                        </td>
                        <td className="scf-amount-cell">
                          {row.rate && row.qty
                            ? (Number(row.rate) * Number(row.qty)).toLocaleString("en-IN")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    <tr className="scf-items-total-row">
                      <td colSpan={7} style={{ textAlign: "right" }}>Total</td>
                      <td className="scf-amount-cell">
                        {items
                          .reduce((sum, r) => sum + (Number(r.rate) || 0) * (Number(r.qty) || 0), 0)
                          .toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {!isLocked && (
                <div className="scf-insert-row-bar">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="scf-insert-count"
                    value={insertCount}
                    onChange={(e) => setInsertCount(e.target.value)}
                  />
                  <button type="button" className="scf-insert-row-btn" onClick={handleInsertRows}>
                    + Insert Rows
                  </button>
                </div>
              )}
            </div>

            {/* ── BUTTONS ── */}
            <div className="scf-btn-row">
              <button type="button" className="scf-btn scf-btn-cancel" onClick={() => navigate("/sauda-search")}>
                Back
              </button>

              {isEdit && form.status === "Confirmed" && (
                <button
                  type="button"
                  className="scf-btn scf-btn-cancel"
                  onClick={handleCancelSauda}
                  disabled={saving}
                >
                  Cancel Sauda
                </button>
              )}

              {!isLocked && (
                <>
                  <button
                    type="button"
                    className="scf-btn scf-btn-draft"
                    onClick={() => handleSave("Draft")}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    className="scf-btn scf-btn-save"
                    onClick={() => handleSave("Confirmed")}
                    disabled={saving}
                  >
                    {saving ? "Confirming…" : "✔ Confirm"}
                  </button>
                </>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSauda;