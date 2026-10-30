import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CCMProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/ccm-production`;
const today = new Date().toISOString().split("T")[0];

/* Every row is one casting time-segment, split into Rolled Billet
   (→ outputs[], goes to Rolling) and Bypass Billet (→ bypass[],
   straight to Dispatch). Length is the billet size/dimension, e.g.
   "130×130", carried on both. */
const blankBillet = (sNo) => ({
  sNo, startTime: "", endTime: "", grade: "",
  rolledQty: "", bypassQty: "", length: "",
});

/* ── Transaction Category typeahead (header) — same pattern as
   Create Purchase Order: searches code + description, selects the
   category object so its module/businessEntity can drive the
   Document Sequence lookup below. ── */
const TxnCategoryTypeAhead = ({ value, onChange, options, onSelect }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const q = (value || "").toLowerCase();
  const filtered = options.filter((t) => {
    const label = `${t.transactionCategoryCode || ""} ${t.categoryDescription || ""}`.toLowerCase();
    return label.includes(q);
  });
  return (
    <div className="cgin-field" ref={ref}>
      <label>* Transaction Category</label>
      <div style={{ position: "relative" }}>
        <input
          type="text" value={value} autoComplete="off" placeholder="Search Transaction Category…"
          onChange={(e) => { onChange(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
        />
        {show && filtered.length > 0 && (
          <ul className="po-suggestion-list">
            {filtered.map((t) => (
              <li key={t._id} onMouseDown={() => { onSelect(t); setShow(false); }}>
                {t.transactionCategoryCode} — {t.categoryDescription}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/* ── Heat No typeahead — picks a saved Heat record so its data
   (furnace, weight, quality, timings…) can be used. ── */
const HeatTypeAhead = ({ value, onChange, heats, onSelect }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const q = (value || "").toLowerCase();
  const filtered = heats.filter((h) => (h.heatNo || "").toLowerCase().includes(q)).slice(0, 15);
  return (
    <div className="cgin-field" ref={ref}>
      <label>* Heat No</label>
      <div style={{ position: "relative" }}>
        <input
          type="text" value={value} autoComplete="off" placeholder="Search Heat No…"
          onChange={(e) => { onChange(e.target.value); setShow(true); }}
          onFocus={() => setShow(true)}
        />
        {show && filtered.length > 0 && (
          <ul className="po-suggestion-list">
            {filtered.map((h) => (
              <li key={h._id} onMouseDown={() => { onSelect(h); setShow(false); }}>
                {h.heatNo} {h.furnace ? `— ${h.furnace} ${h.furnaceNo || ""}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const CreateCCMProduction = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  /* ── masters ── */
  const [transactionCategories, setTransactionCategories] = useState([]);
  const [heats, setHeats] = useState([]);

  /* Furnace dropdown options — derived from the Heats master already
     fetched below (no separate Furnace master exists yet), deduped
     by "furnace / furnaceNo" combo. */
  const furnaceOptions = Array.from(new Set(
    heats
      .map((h) => `${h.furnace || ""}${h.furnaceNo ? ` / ${h.furnaceNo}` : ""}`.trim())
      .filter(Boolean)
  ));

  /* ── Transaction Category → CCM No (Document Sequence) ── */
  const [txnCatQuery, setTxnCatQuery]   = useState("");
  const [ccmNoPreview, setCcmNoPreview] = useState("");

  /* ── Heat No → Heat detail lookup ── */
  const [heatQuery, setHeatQuery]     = useState("");
  const [selectedHeat, setSelectedHeat] = useState(null);

  /* guard against duplicate creation from rapid/double Save clicks */
  const isSavingRef = useRef(false);

  const [form, setForm] = useState({
    transactionCategory: "", // set once a category is picked (its _id)
    ccmNo: "",
    ccmDate: today,
    startTime: "",
    endTime: "",
    shift: "A",
    heatNo: "",
    furnaceNo: "",
    operator: "",
    rollingPIC: "",
    bypassPIC: "",
    remarks: "",
    status: "Open",
  });

  const [billets, setBillets] = useState([blankBillet(1)]); // Billet Details rows

  /* ── fetch masters: Transaction Categories (CCM Production ones)
     and Heats (so Heat No can be picked, not free-typed) ── */
  useEffect(() => {
    const go = async () => {
      try {
        const [txnRes, heatRes] = await Promise.all([
          axios.get(`${API_URL}/api/transactions`),
          axios.get(`${API_URL}/api/heats`),
        ]);

        /* Transaction Category master — restricted to ones set up for
           CCM Production, matching common naming variants admins use
           when creating the master (same keyword-matching approach
           Purchase Order uses for its own module). */
        setTransactionCategories(
          (txnRes.data || []).filter((t) => {
            if (t.status !== "Open") return false;
            const mod = (t.module || "").toLowerCase();
            const ent = (t.businessEntity || "").toLowerCase();
            return (
              mod.includes("ccm") ||
              mod.includes("casting") ||
              mod.includes("production") ||
              ent.includes("ccm") ||
              ent.includes("casting")
            );
          })
        );

        setHeats(heatRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    go();
  }, []);

  /* ── Compute CCM No whenever Transaction Category changes — same
     Document Sequence flow as Create Purchase Order: find the
     sequence configured for THIS category's module + businessEntity
     + transactionCategory (description), use its own entityPrefix,
     date fragment and digit padding to build a live preview. The
     real number is only registered (incremented) on Save. ── */
  useEffect(() => {
    if (!form.transactionCategory) { setCcmNoPreview(""); setForm((f) => ({ ...f, ccmNo: "" })); return; }
    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) { setCcmNoPreview(""); return; }

    axios.get(`${API_URL}/api/document-sequence`)
      .then((res) => {
        const matching = (res.data || []).filter(
          (r) =>
            r.module === cat.module &&
            r.businessEntity === cat.businessEntity &&
            r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setCcmNoPreview(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          setForm((f) => ({ ...f, ccmNo: "" }));
          return;
        }
        const last   = matching.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const useDate = last.useDateFragment ?? true;
        let datePart = "";
        if (useDate) {
          const d  = new Date();
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yy = String(d.getFullYear()).slice(-2);
          const fmt = last.sequenceFormat || "dd/mm/yy";
          if (fmt === "mm/dd/yy") {
            datePart = `${mm}${dd}${yy}`;
          } else if (fmt === "yy/mm/dd") {
            datePart = `${yy}${mm}${dd}`;
          } else if (fmt === "julian") {
            const year   = d.getFullYear();
            const start  = new Date(year, 0, 0);
            const oneDay = 1000 * 60 * 60 * 24;
            const doy    = String(Math.floor((d - start) / oneDay)).padStart(3, "0");
            datePart = `${yy}${doy}`;
          } else {
            datePart = `${dd}${mm}${yy}`;
          }
        }
        const preview = `${prefix}${datePart}${String(nextNo).padStart(digits, "0")}`;
        setCcmNoPreview(preview);
        setForm((f) => ({ ...f, ccmNo: preview }));
      })
      .catch(() => setCcmNoPreview(""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.transactionCategory, transactionCategories]);

  /* ── derived totals ── */
  const totalRollingBillets = billets.reduce((s, r) => s + (parseFloat(r.rolledQty) || 0), 0);
  const totalBypassBillets  = billets.reduce((s, r) => s + (parseFloat(r.bypassQty) || 0), 0);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleHeatSelect = (heat) => {
    setHeatQuery(heat.heatNo);
    setSelectedHeat(heat);
    setForm((f) => ({
      ...f,
      heatNo: heat.heatNo,
      furnaceNo: heat.furnace || heat.furnaceNo
        ? `${heat.furnace || ""}${heat.furnaceNo ? ` / ${heat.furnaceNo}` : ""}`.trim()
        : f.furnaceNo,
    }));
  };

  /* Billet Details rows */
  const handleBilletChange = (idx, field, val) =>
    setBillets((p) => p.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addBilletRow = () => setBillets((p) => [...p, blankBillet(p.length + 1)]);
  const removeBilletRow = (idx) =>
    setBillets((p) => p.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sNo: i + 1 })));

  const handleSave = async () => {
    if (isSavingRef.current) return;

    if (!form.transactionCategory) return alert("Transaction Category is required.");
    if (!form.heatNo.trim())       return alert("Heat No is required.");
    const validBillets = billets.filter((r) => r.rolledQty || r.bypassQty);
    if (validBillets.length === 0) return alert("Add at least one Billet Details row with a Rolled Billet or Bypass Billet qty.");

    const cat = transactionCategories.find((t) => t._id === form.transactionCategory);
    if (!cat) return alert("Invalid Transaction Category.");

    isSavingRef.current = true;
    setLoading(true);
    try {
      /* Find the Document Sequence configured for THIS Transaction
         Category (module + businessEntity + transactionCategory
         description) and use its own entityPrefix — same rule Create
         Purchase Order follows, so numbering never drifts onto an
         unrelated/auto-created sequence. */
      const seqListRes = await axios.get(`${API_URL}/api/document-sequence`);
      const matchingSeq = (seqListRes.data || []).filter(
        (r) =>
          r.module === cat.module &&
          r.businessEntity === cat.businessEntity &&
          r.transactionCategory === cat.categoryDescription
      );
      if (!matchingSeq.length) {
        alert(`No Document Sequence is set up for "${cat.categoryDescription}". Please create one first.`);
        return;
      }
      const seqEntry     = matchingSeq.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
      const entityPrefix = (seqEntry.entityPrefix || "").trim().toUpperCase();

      const seqRes = await axios.post(`${API_URL}/api/create-document-sequence`, {
        module:              cat.module,
        businessEntity:      cat.businessEntity,
        entityPrefix,
        transactionCategory: cat.categoryDescription,
      });
      const officialCcmNo = seqRes.data.generatedCode || form.ccmNo;

      /* Each Billet Details row now maps straight onto the
         outputs[]/bypass[] shape — startTime/endTime and billetSize
         (Length) are real schema fields, nothing needs folding into
         remarks any more. */
      const outputs = validBillets
        .filter((r) => r.rolledQty)
        .map((r, i) => ({
          sNo: i + 1, startTime: r.startTime, endTime: r.endTime,
          billetSize: r.length, grade: r.grade, qty: r.rolledQty,
        }));
      const bypass = validBillets
        .filter((r) => r.bypassQty)
        .map((r, i) => ({
          sNo: i + 1, startTime: r.startTime, endTime: r.endTime,
          billetSize: r.length, grade: r.grade, qty: r.bypassQty,
        }));

      const payload = {
        ...form,
        transactionCategory: cat.categoryDescription,
        ccmNo: officialCcmNo,
        outputs,
        bypass,
        totalBilletQty: totalRollingBillets,
        totalBypassQty: totalBypassBillets,
      };

      const res = await axios.post(API, payload);
      if (res.data?.success) {
        alert("CCM Production saved!");
        navigate("/ccm-production");
      } else {
        alert("Save failed: " + (res.data?.message || "Unknown"));
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      isSavingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="cpo-page">
      <ModuleNavbar />

      {/* PAGE HEADER */}
      <div className="cgin-header">
        <div className="cgin-header-left">
          <button className="back-btn" onClick={() => navigate("/ccm-production")}>←</button>
          <h2>Create CCM Entry</h2>
        </div>
        <span className="cpo-pono-badge">CCM No: {form.ccmNo || "—"}</span>
      </div>

      {/* ══════ HEADER FIELDS CARD ══════ */}
      <div className="cgin-card">
        <div className="cgin-card-title">Header Information</div>
        <div className="cgin-grid">

          <TxnCategoryTypeAhead
            value={txnCatQuery}
            onChange={(v) => { setTxnCatQuery(v); if (!v) setForm((f) => ({ ...f, transactionCategory: "" })); }}
            options={transactionCategories}
            onSelect={(t) => {
              setTxnCatQuery(`${t.transactionCategoryCode} — ${t.categoryDescription}`);
              setForm((f) => ({ ...f, transactionCategory: t._id }));
            }}
          />

          <div className="cgin-field">
            <label>CCM No</label>
            <input
              type="text"
              readOnly
              value={!form.transactionCategory ? "Select category first…" : (ccmNoPreview || "Generating…")}
              style={{ background: "#f1f5f9", fontWeight: 700, color: "#15803d" }}
            />
          </div>

          <HeatTypeAhead
            value={heatQuery}
            onChange={(v) => { setHeatQuery(v); if (!v) { setSelectedHeat(null); setForm((f) => ({ ...f, heatNo: "" })); } }}
            heats={heats}
            onSelect={handleHeatSelect}
          />

          <div className="cgin-field">
            <label>* CCM Date</label>
            <input type="date" name="ccmDate" value={form.ccmDate} onChange={handleChange} />
          </div>

          <div className="cgin-field">
            <label>* Start Time</label>
            <input type="time" name="startTime" value={form.startTime} onChange={handleChange} />
          </div>

          <div className="cgin-field">
            <label>* End Time</label>
            <input type="time" name="endTime" value={form.endTime} onChange={handleChange} />
          </div>

          <div className="cgin-field">
            <label>Rolling PIC</label>
            <input name="rollingPIC" value={form.rollingPIC} onChange={handleChange}
              placeholder="Person in charge — Rolling handover" />
          </div>

          <div className="cgin-field">
            <label>Bypass PIC</label>
            <input name="bypassPIC" value={form.bypassPIC} onChange={handleChange}
              placeholder="Person in charge — Bypass/Dispatch handover" />
          </div>

          <div className="cgin-field">
            <label>Shift</label>
            <select name="shift" value={form.shift} onChange={handleChange}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Furnace No</label>
            <select name="furnaceNo" value={form.furnaceNo} onChange={handleChange}>
              <option value="">- Select Furnace -</option>
              {furnaceOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              {form.furnaceNo && !furnaceOptions.includes(form.furnaceNo) && (
                <option value={form.furnaceNo}>{form.furnaceNo}</option>
              )}
            </select>
          </div>

          <div className="cgin-field">
            <label>Operator</label>
            <input name="operator" value={form.operator} onChange={handleChange} placeholder="Operator name" />
          </div>

          <div className="cgin-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Open</option><option>Draft</option><option>Closed</option>
            </select>
          </div>

          <div className="cgin-field" style={{ gridColumn: "span 2" }}>
            <label>Remarks</label>
            <input type="text" name="remarks" value={form.remarks} onChange={handleChange} placeholder="Optional remarks" />
          </div>

        </div>
      </div>

      {/* ══════ BILLET DETAILS CARD ══════ */}
      <div className="cgin-card">
        <div className="cgin-items-header">
          <span className="cgin-items-title">🧱 Billet Details</span>
          <button className="cgin-insert-row-btn" onClick={addBilletRow}>+ Add Row</button>
        </div>
        <div className="cgin-items-table-wrap">
          <table className="cgin-items-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>S No</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Grade</th>
                <th>Rolled Billet (MT)</th>
                <th>Bypass Billet (MT)</th>
                <th>Length</th>
                <th style={{ width: 50 }}>Del</th>
              </tr>
            </thead>
            <tbody>
              {billets.map((row, idx) => (
                <tr key={idx}>
                  <td className="cgin-sno-cell">{row.sNo}</td>
                  <td>
                    <input type="time" className="cgin-item-input"
                      value={row.startTime}
                      onChange={(e) => handleBilletChange(idx, "startTime", e.target.value)} />
                  </td>
                  <td>
                    <input type="time" className="cgin-item-input"
                      value={row.endTime}
                      onChange={(e) => handleBilletChange(idx, "endTime", e.target.value)} />
                  </td>
                  <td>
                    <select className="cgin-item-input"
                      value={row.grade}
                      onChange={(e) => handleBilletChange(idx, "grade", e.target.value)}>
                      <option value="">- Select -</option>
                      <option>Fe500</option>
                      <option>Fe550</option>
                      <option>Fe600</option>
                    </select>
                  </td>
                  <td>
                    <input type="number" className="cgin-item-input cgin-item-num"
                      value={row.rolledQty}
                      onChange={(e) => handleBilletChange(idx, "rolledQty", e.target.value)}
                      placeholder="0" min="0" step="0.001" />
                  </td>
                  <td>
                    <input type="number" className="cgin-item-input cgin-item-num"
                      value={row.bypassQty}
                      onChange={(e) => handleBilletChange(idx, "bypassQty", e.target.value)}
                      placeholder="0" min="0" step="0.001" />
                  </td>
                  <td>
                    <input className="cgin-item-input cgin-item-wide"
                      value={row.length}
                      onChange={(e) => handleBilletChange(idx, "length", e.target.value)}
                      placeholder="e.g. 130×130" />
                  </td>
                  <td>
                    <button
                      onClick={() => removeBilletRow(idx)}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 4, width: 26, height: 26, cursor: "pointer", fontWeight: 700 }}
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Row Totals:</td>
                <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{totalRollingBillets.toFixed(3)}</td>
                <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{totalBypassBillets.toFixed(3)}</td>
                <td colSpan="2" style={{ background: "#eef1f7" }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ══════ TOTALS BAR ══════ */}
      <div className="pod-grand-total">
        <span style={{ marginRight: 24 }}>Total Rolling: <strong>{totalRollingBillets.toFixed(3)} MT</strong></span>
        <span>Total Bypass: <strong>{totalBypassBillets.toFixed(3)} MT</strong></span>
      </div>

      {/* ACTIONS */}
      <div className="cgin-actions">
        <button className="btn-reset" onClick={() => navigate("/ccm-production")} disabled={loading}>Cancel</button>
        <button className="btn-save" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save CCM Entry"}
        </button>
      </div>
    </div>
  );
};

export default CreateCCMProduction;