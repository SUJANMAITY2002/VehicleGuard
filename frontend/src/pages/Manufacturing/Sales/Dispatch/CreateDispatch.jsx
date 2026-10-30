import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateDispatch.css";
import { API_URL } from "../../../../config";

/*
  FINAL DISPATCH LIST — Step 5
  ──────────────────────────────
  Dispatch No (auto, from Document Sequence) → Sauda No (typeahead over
  CONFIRMED Saudas) → Dispatch Date
  → picking a Sauda auto-loads every "Ready" Demand item raised against
    it (Item Code / Item Name / Size / Qty / Remarks)
  → each row has a Dispatch action (Qty is editable before sending),
    and "Dispatch All" sends every currently-listed row in one go.

  Every Dispatch action is its own POST — a fresh Dispatch No is
  consumed from the Document Sequence master each time (per-row
  dispatch and Dispatch All can each happen more than once per visit).

  Status flow (once created): Ready → Loaded → Vehicle Out
  (advanced from the Dispatch Search / list page, not here)
*/

const API_BASE = `${API_URL}/api/dispatch`;

/* ── 2-digit year date builder — mirrors Sauda / Document Sequence
     routes, used to preview the Dispatch No. the moment a Transaction
     Category is picked (same pattern Create Sauda uses) ── */
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

const StatusBadge = ({ status }) => (
  <span className={`dp-status-badge dp-status-${(status || "ready").toLowerCase().replace(/\s+/g, "-")}`}>
    {status || "Ready"}
  </span>
);

const CreateDispatch = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id); // "view" mode — an already-created Dispatch
  const today    = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    dispatchNo:   "",
    transactionCategory: "",   // holds the Transaction Category _id while creating
    saudaId:      "",
    saudaNo:      "",
    partyCode:    "",
    partyName:    "",
    partyAddress: "",
    dispatchDate: today,
    status:       "Ready",
  });

  /* Transaction Category master — only Open categories configured for
     Sales / Final Dispatch List are shown, same as Create Sauda does
     for the Sauda No. */
  const [transactionCategories, setTransactionCategories] = useState([]);
  /* Live Dispatch No. preview once a Transaction Category is picked (create only) */
  const [dispatchNoPreview, setDispatchNoPreview] = useState("");

  /* Pending Ready-demand-item rows for the selected Sauda (create mode) */
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  /* Already-saved items, shown read-only (view mode) */
  const [savedItems, setSavedItems] = useState([]);

  const [saudaOptions,   setSaudaOptions]   = useState([]);
  const [saudaQuery,     setSaudaQuery]     = useState("");
  const [showSaudaList,  setShowSaudaList]  = useState(false);
  const saudaBoxRef = useRef(null);

  const [dispatchingRow, setDispatchingRow] = useState(null);
  const [dispatchingAll, setDispatchingAll] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // ── Load Confirmed Saudas (picker) + existing record (view) ───────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (isEdit) {
          const res = await fetch(`${API_BASE}/${id}`);
          if (!res.ok) throw new Error("Record not found");
          const data = await res.json();
          setForm({
            dispatchNo:   data.dispatchNo   || "",
            transactionCategory: data.transactionCategory || "",  // description string once saved
            saudaId:      data.saudaId      || "",
            saudaNo:      data.saudaNo      || "",
            partyCode:    data.partyCode    || "",
            partyName:    data.partyName    || "",
            partyAddress: data.partyAddress || "",
            dispatchDate: data.dispatchDate || today,
            status:       data.status       || "Ready",
          });
          setSavedItems(data.items || []);
        } else {
          const saudaRes = await fetch(`${API_BASE}/source-saudas`);
          const saudaData = saudaRes.ok ? await saudaRes.json() : [];
          setSaudaOptions(Array.isArray(saudaData) ? saudaData : []);
        }
        // Non-edit (create) mode: Dispatch No. is now generated from the
        // Transaction Category the user selects, not fetched up-front —
        // same pattern as Create Sauda.
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  /* ── Load Transaction Category master (Sales / Final Dispatch List, Open only) ── */
  useEffect(() => {
    if (isEdit) return;
    fetch(`${API_URL}/api/transactions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setTransactionCategories(
          (Array.isArray(data) ? data : []).filter(
            (t) => t.module === "Sales" && t.businessEntity === "Final Dispatch List" && t.status === "Open"
          )
        );
      })
      .catch((err) => console.log("Error loading transaction categories:", err));
  }, [isEdit]);

  /* ── Live Dispatch No. preview — recomputed whenever the Transaction
     Category changes. Only relevant while creating; mirrors Create
     Sauda's Sauda No. preview logic. ── */
  useEffect(() => {
    if (isEdit) return;
    if (!form.transactionCategory) { setDispatchNoPreview(""); return; }
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) { setDispatchNoPreview(""); return; }

    fetch(`${API_URL}/api/document-sequence`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const matching = (list || []).filter(
          (r) =>
            r.module === "Sales" &&
            r.businessEntity === "Final Dispatch List" &&
            r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setDispatchNoPreview(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          return;
        }
        const last   = matching.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setDispatchNoPreview(`${prefix}${date}${String(nextNo).padStart(digits, "0")}`);
      })
      .catch(() => setDispatchNoPreview(""));
  }, [form.transactionCategory, transactionCategories, isEdit]);

  /* Resolve the Dispatch No. from the chosen Transaction Category's
     Document Sequence at the moment of an actual Dispatch action — same
     pattern Create Sauda uses on Save, so the sequence only advances
     once per real dispatch, not on every keystroke. */
  const resolveDispatchNo = async () => {
    if (!form.transactionCategory) {
      throw new Error("Please select a Transaction Category first.");
    }
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) throw new Error("Invalid Transaction Category selected.");

    const seqListRes = await fetch(`${API_URL}/api/document-sequence`);
    const seqList = seqListRes.ok ? await seqListRes.json() : [];
    const matchingSeq = (seqList || []).filter(
      (r) => r.module === "Sales" && r.businessEntity === "Final Dispatch List" && r.transactionCategory === cat.categoryDescription
    );
    if (!matchingSeq.length) {
      throw new Error(`No Document Sequence is set up for "${cat.categoryDescription}". Please create one first.`);
    }
    const seqEntry     = matchingSeq.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
    const entityPrefix = (seqEntry.entityPrefix || "").trim().toUpperCase();

    const seqRes = await fetch(`${API_URL}/api/create-document-sequence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "Sales",
        businessEntity: "Final Dispatch List",
        entityPrefix,
        transactionCategory: cat.categoryDescription,
      }),
    });
    const seqData = await seqRes.json();
    if (!seqRes.ok || !seqData.generatedCode) {
      throw new Error(seqData.message || "Could not generate Dispatch No.");
    }
    return { dispatchNo: seqData.generatedCode, transactionCategoryDesc: cat.categoryDescription };
  };

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

  // ── Sauda picker ────────────────────────────────────────────────────
  const filteredSaudas = saudaOptions.filter((s) =>
    (s.saudaNo || "").toLowerCase().includes(saudaQuery.toLowerCase()) ||
    (s.partyName || "").toLowerCase().includes(saudaQuery.toLowerCase())
  );

  const fetchDemandItems = async (saudaNo) => {
    setLoadingItems(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/source-demand-items?saudaNo=${encodeURIComponent(saudaNo)}`);
      if (!res.ok) throw new Error("Could not load demand items for this Sauda.");
      const data = await res.json();
      setItems(
        (Array.isArray(data) ? data : []).map((r, i) => ({ ...r, sNo: i + 1, remarks: "" }))
      );
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const pickSauda = (sauda) => {
    setForm((p) => ({
      ...p,
      saudaId:      sauda._id,
      saudaNo:      sauda.saudaNo,
      partyCode:    sauda.partyCode    || "",
      partyName:    sauda.partyName    || "",
      partyAddress: sauda.partyAddress || "",
    }));
    setSaudaQuery(`${sauda.saudaNo}${sauda.partyName ? " - " + sauda.partyName : ""}`);
    setShowSaudaList(false);
    fetchDemandItems(sauda.saudaNo);
  };

  const handleSaudaInput = (val) => {
    setSaudaQuery(val);
    setShowSaudaList(true);
    if (!val) {
      setForm((p) => ({ ...p, saudaId: "", saudaNo: "", partyCode: "", partyName: "", partyAddress: "" }));
      setItems([]);
    }
  };

  // ── Item row field edits (Qty / Remarks) ───────────────────────────
  const handleItemFieldChange = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // ── Dispatch a single row ───────────────────────────────────────────
  const handleDispatchRow = async (idx) => {
    const row = items[idx];
    setError(""); setSuccess("");

    if (!form.dispatchDate) return setError("Dispatch Date is required.");
    if (!row.qty || Number(row.qty) <= 0) return setError("Qty must be greater than 0.");

    setDispatchingRow(idx);
    try {
      const { dispatchNo, transactionCategoryDesc } = await resolveDispatchNo();

      const payload = {
        dispatchNo,
        transactionCategory: transactionCategoryDesc,
        saudaId:      form.saudaId,
        saudaNo:      form.saudaNo,
        partyCode:    form.partyCode,
        partyName:    form.partyName,
        partyAddress: form.partyAddress,
        dispatchDate: form.dispatchDate,
        items: [{
          itemCode: row.itemCode,
          itemName: row.itemName,
          size:     row.size,
          qty:      Number(row.qty),
          remarks:  row.remarks,
          demandId: row.demandId,
          demandNo: row.demandNo,
        }],
      };
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Dispatch failed");
      }
      const data = await res.json();
      /* NOTE: keep form.transactionCategory as the master _id (not the
         description) so a subsequent row / Dispatch All in this same
         visit can still resolve another Dispatch No. from it. */
      setForm((p) => ({ ...p, dispatchNo: data.data.dispatchNo }));
      setSuccess(`"${row.itemName}" dispatched as ${data.data.dispatchNo}.`);
      setItems((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      setError(err.message);
    } finally {
      setDispatchingRow(null);
    }
  };

  // ── Dispatch every currently-listed row in one go ──────────────────
  const handleDispatchAll = async () => {
    setError(""); setSuccess("");

    if (!form.dispatchDate) return setError("Dispatch Date is required.");
    if (items.length === 0) return setError("No items to dispatch.");
    if (items.some((r) => !r.qty || Number(r.qty) <= 0)) {
      return setError("Every row needs a Qty greater than 0 before dispatching all.");
    }

    setDispatchingAll(true);
    try {
      const { dispatchNo, transactionCategoryDesc } = await resolveDispatchNo();

      const payload = {
        dispatchNo,
        transactionCategory: transactionCategoryDesc,
        saudaId:      form.saudaId,
        saudaNo:      form.saudaNo,
        partyCode:    form.partyCode,
        partyName:    form.partyName,
        partyAddress: form.partyAddress,
        dispatchDate: form.dispatchDate,
        items: items.map((row) => ({
          itemCode: row.itemCode,
          itemName: row.itemName,
          size:     row.size,
          qty:      Number(row.qty),
          remarks:  row.remarks,
          demandId: row.demandId,
          demandNo: row.demandNo,
        })),
      };
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Dispatch failed");
      }
      const data = await res.json();
      setForm((p) => ({ ...p, dispatchNo: data.data.dispatchNo }));
      setSuccess(`All items dispatched as ${data.data.dispatchNo}.`);
      setItems([]);
      setTimeout(() => navigate("/dispatch-search"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setDispatchingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="dp-page">
        <div className="dp-topbar">
          <div className="dp-topbar-left">
            <button className="dp-back-btn" onClick={() => navigate("/dispatch-search")}>
              ← {isEdit ? "View Dispatch" : "Create Dispatch"}
            </button>
          </div>
        </div>
        <div className="dp-body">
          <div className="dp-card dp-loading">
            <div className="dp-spinner" />
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dp-page">

      <div className="dp-topbar">
        <div className="dp-topbar-left">
          <button className="dp-back-btn" onClick={() => navigate("/dispatch-search")}>
            ← {isEdit ? "View Dispatch" : "Create Dispatch"}
          </button>
        </div>
        <div className="dp-topbar-right">
          <StatusBadge status={form.status} />
          <span className="dp-dispatch-no">#{form.dispatchNo || "—"}</span>
        </div>
      </div>

      <div className="dp-body">
        <div className="dp-card">

          {error   && <div className="dp-alert dp-alert-err">{error}</div>}
          {success && <div className="dp-alert dp-alert-ok">{success}</div>}
          {isEdit && (
            <div className="dp-alert dp-alert-ok">
              This Dispatch is <strong>{form.status}</strong> — read-only.
            </div>
          )}
          {!isEdit && !form.saudaNo && (
            <div className="dp-alert dp-alert-info">
              Pick a <strong>Sauda No.</strong> below to load its Ready demand items.
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} noValidate>

            <div className="dp-section-title">Dispatch Details</div>
            <div className="dp-grid">

              {/* TRANSACTION CATEGORY — drives the Dispatch No. via Document
                  Sequence, same pattern as Create Sauda's Sauda No. Master
                  data only (Open categories configured for Sales / Final
                  Dispatch List). */}
              <div className="dp-group">
                <label className="dp-label">Transaction Category {!isEdit && <span className="dp-req">*</span>}</label>
                {isEdit ? (
                  <input className="dp-input dp-readonly" type="text" value={form.transactionCategory || "-"} readOnly />
                ) : (
                  <select
                    className="dp-input"
                    name="transactionCategory"
                    value={form.transactionCategory}
                    onChange={handleChange}
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

              <div className="dp-group">
                <label className="dp-label">Dispatch No.</label>
                <input
                  className="dp-input dp-readonly"
                  type="text"
                  readOnly
                  value={
                    isEdit
                      ? form.dispatchNo
                      : !form.transactionCategory
                        ? "Select category first…"
                        : (dispatchNoPreview || "Generating…")
                  }
                  style={!isEdit && form.transactionCategory ? { fontWeight: 600, letterSpacing: 1, color: "#15803d" } : undefined}
                />
              </div>

              {/* SAUDA NO — typeahead, Confirmed Saudas only */}
              <div className="dp-group" ref={saudaBoxRef}>
                <label className="dp-label">Sauda No. {!isEdit && <span className="dp-req">*</span>}</label>
                {isEdit ? (
                  <input className="dp-input dp-readonly" value={form.saudaNo || "—"} readOnly />
                ) : (
                  <>
                    <input
                      className="dp-input"
                      value={saudaQuery}
                      onChange={(e) => handleSaudaInput(e.target.value)}
                      onFocus={() => setShowSaudaList(true)}
                      placeholder="Type or select Sauda…"
                      autoComplete="off"
                    />
                    {showSaudaList && filteredSaudas.length > 0 && (
                      <ul className="dp-suggestions">
                        {filteredSaudas.map((s) => (
                          <li key={s._id} onMouseDown={() => pickSauda(s)}>
                            {s.saudaNo}
                            {s.partyName && <small>{s.partyName}</small>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              <div className="dp-group">
                <label className="dp-label">Dispatch Date <span className="dp-req">*</span></label>
                <input
                  className="dp-input" type="date" name="dispatchDate"
                  value={form.dispatchDate} onChange={handleChange} disabled={isEdit}
                />
              </div>

              {/* PARTY NAME — auto-filled from the picked Sauda */}
              <div className="dp-group">
                <label className="dp-label">Party Name</label>
                <input
                  className="dp-input dp-readonly"
                  type="text"
                  value={form.partyName || "-"}
                  readOnly
                  placeholder="Auto-filled on Sauda select"
                />
              </div>

              {/* PARTY ADDRESS — auto-filled from the picked Sauda */}
              <div className="dp-group">
                <label className="dp-label">Party Address</label>
                <input
                  className="dp-input dp-readonly"
                  type="text"
                  value={form.partyAddress || "-"}
                  readOnly
                  placeholder="Auto-filled on Sauda select"
                />
              </div>

            </div>

            {/* ── ITEMS: pending Ready-demand rows (create) or saved items (view) ── */}
            <div className="dp-section-title">Items</div>
            <div className="dp-items-section">
              <div className="dp-items-header">
                <span className="dp-items-title">
                  Item Code / Item Name / Size / Qty / Remarks
                  <span className="dp-items-count">
                    {" "}— {isEdit ? savedItems.length : items.length} item
                    {(isEdit ? savedItems.length : items.length) !== 1 ? "s" : ""}
                  </span>
                </span>
                {!isEdit && items.length > 0 && (
                  <button
                    type="button"
                    className="dp-dispatch-all-btn"
                    onClick={handleDispatchAll}
                    disabled={dispatchingAll || dispatchingRow !== null}
                  >
                    {dispatchingAll ? "Dispatching All…" : "⬆ Dispatch All"}
                  </button>
                )}
              </div>

              <div className="dp-items-table-wrap">
                <table className="dp-items-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Size</th>
                      <th>Qty</th>
                      <th>Remarks</th>
                      {!isEdit && <th>Demand Status</th>}
                      {!isEdit && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {isEdit ? (
                      savedItems.length ? savedItems.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.itemCode}</td>
                          <td>{row.itemName}</td>
                          <td>{row.size || "-"}</td>
                          <td>{row.qty}</td>
                          <td>{row.remarks || "-"}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>No items</td></tr>
                      )
                    ) : loadingItems ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        Loading demand items…
                      </td></tr>
                    ) : !form.saudaNo ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        Select a Sauda No. above to load items.
                      </td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                        No dispatchable demand items found for this Sauda yet (needs a Demand with status
                        "Production Requested" or "Ready").
                      </td></tr>
                    ) : (
                      items.map((row, idx) => (
                        <tr key={`${row.demandId}-${row.itemCode}-${idx}`}>
                          <td>{row.itemCode}</td>
                          <td>{row.itemName}</td>
                          <td>{row.size || "-"}</td>
                          <td>
                            <input
                              type="number" min="0" className="dp-bundle-input"
                              value={row.qty}
                              onChange={(e) => handleItemFieldChange(idx, "qty", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text" className="dp-remarks-input"
                              value={row.remarks}
                              onChange={(e) => handleItemFieldChange(idx, "remarks", e.target.value)}
                              placeholder="Optional"
                            />
                          </td>
                          <td>
                            <span className="dp-pr-tag">{row.demandStatus || "-"}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="dp-row-dispatch-btn"
                              onClick={() => handleDispatchRow(idx)}
                              disabled={dispatchingRow !== null || dispatchingAll}
                            >
                              {dispatchingRow === idx ? "Dispatching…" : "Dispatch"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── BUTTONS ── */}
            <div className="dp-btn-row">
              <button type="button" className="dp-btn dp-btn-cancel" onClick={() => navigate("/dispatch-search")}>
                Back
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDispatch;