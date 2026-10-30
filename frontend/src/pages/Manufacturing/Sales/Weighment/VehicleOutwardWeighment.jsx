import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./VehicleOutwardWeighment.css";
import { API_URL } from "../../../../config";

/*
  VEHICLE OUTWARD WEIGHMENT
  ──────────────────────────────
  The page a Gate In record lands on next. Three parts:

    1. Weighment header   — its own Transaction Category → Weighment No
                             (via Document Sequence, module="Sales",
                             businessEntity="Weighment"), Weighment
                             Date, Description.
    2. Weighment Details   — Outward No. (picked from existing Vehicle
                             Outward / Gate In records — fetched from
                             /api/vehicle-outward, NOT from Dispatch).
                             Selecting one auto-fills Vehicle No. and
                             Party Code (read-only) plus Party Name for
                             context. Weighment In Date/Time,
                             Transporter Name, Invoice No., Invoice
                             Date, Status are entered here.
    3. Items                — same first-weight-then-second-weight
                             capture pattern as WeighmentPages.jsx:
                             tick a row, type the scale reading into
                             Current Weight, click Get Weight — it
                             fills First Weight the first time and
                             Second Weight (+ computed Net Weight) the
                             second time.

  Reached with an id (/vehicle-outward-weighment/:id) — straight from
  Gate In completing, or "Continue" on the search page — or without
  one (/vehicle-outward-weighment) to pick an Outward No. from
  scratch.
*/

const API_BASE         = `${API_URL}/api/vehicle-outward`;
const SOURCE_OUTWARDS   = `${API_BASE}/source-outwards`;

const STATUS_OPTIONS = ["Open", "Draft", "Saved", "Convert", "Closed"];

/* ── 2-digit year date builder — mirrors Sauda / Dispatch / Vehicle
     Outward / Document Sequence routes ── */
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

const blankHeader = (today, nowTime) => ({
  weighmentTransactionCategory: "",  // Transaction Category _id while choosing; description string once saved
  weighmentNo: "",
  weighmentDate: today,
  description: "",
  weighmentInDate: today,
  weighmentInTime: nowTime,
  transporterName: "",
  invoiceNo: "",
  invoiceDate: "",
  weighmentStatus: "Open",
});

const toItemRows = (items) =>
  (Array.isArray(items) ? items : []).map((it, i) => ({
    sNo:          it.sNo || i + 1,
    itemCode:     it.itemCode || "",
    itemName:     it.itemName || "",
    size:         it.size || "",
    qty:          it.qty || 0,
    remarks:      it.remarks || "",
    firstWeight:  it.firstWeight  || "",
    secondWeight: it.secondWeight || "",
    netWeight:    it.netWeight    || "",
    _checked:     false,
  }));

const VehicleOutwardWeighment = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const now      = new Date();
  const today    = now.toISOString().split("T")[0];
  const nowTime  = now.toTimeString().slice(0, 5);

  const [record,   setRecord]   = useState(null); // the linked Vehicle Outward / Gate In record
  const [form,     setForm]     = useState(() => blankHeader(today, nowTime));
  const [items,    setItems]    = useState([]);
  const [activeRowIdx, setActiveRowIdx] = useState(null);
  const [currentWeight, setCurrentWeight] = useState("");

  const [outwardOptions, setOutwardOptions] = useState([]);
  const [outwardQuery,   setOutwardQuery]   = useState("");
  const [showOutwardList, setShowOutwardList] = useState(false);
  const outwardBoxRef = useRef(null);

  const [transactionCategories, setTransactionCategories] = useState([]);
  const [weighmentNoPreview, setWeighmentNoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [exiting, setExiting] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const itemsSectionRef = useRef(null);

  /* Locked once a Weighment No. has actually been committed — the
     category & number can't be re-picked after that, same rule
     Sauda / Dispatch / Vehicle Outward already follow. */
  const numberCommitted = Boolean(record?.weighmentNo);

  // ── Populate header/items from a fetched Vehicle Outward record ────
  const applyRecord = (data) => {
    setRecord(data);
    setForm({
      weighmentTransactionCategory: data.weighmentTransactionCategory || "",
      weighmentNo:      data.weighmentNo || "",
      weighmentDate:    data.weighmentDate || today,
      description:      data.description || "",
      weighmentInDate:  data.weighmentInDate || data.gateInDate || today,
      weighmentInTime:  data.weighmentInTime || data.gateInTime || nowTime,
      transporterName:  data.transporterName || data.driverName || "",
      invoiceNo:        data.invoiceNo || "",
      invoiceDate:      data.invoiceDate || "",
      weighmentStatus:  data.weighmentStatus || "Open",
    });
    setItems(toItemRows(data.items));
    setOutwardQuery(`${data.gateOutNo}${data.customer ? " - " + data.customer : ""}`);
  };

  // ── Load: with an id, fetch that record directly; without one, load
  //    the Outward No. picker options instead. ──────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError("");
      try {
        if (id) {
          const res  = await fetch(`${API_BASE}/${id}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Record not found");
          applyRecord(data);
        } else {
          const res  = await fetch(SOURCE_OUTWARDS);
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Could not load Vehicle Outward records.");
          setOutwardOptions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // ── Close the Outward No. suggestion list on outside click ─────────
  useEffect(() => {
    const onClick = (e) => {
      if (outwardBoxRef.current && !outwardBoxRef.current.contains(e.target)) setShowOutwardList(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ── Load Transaction Category master (Sales / Weighment, Open only) ──
  useEffect(() => {
    if (numberCommitted) return;
    fetch(`${API_URL}/api/transactions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setTransactionCategories(
          (Array.isArray(data) ? data : []).filter(
            (t) => t.module === "Sales" && t.businessEntity === "Weighment" && t.status === "Open"
          )
        );
      })
      .catch((err) => console.log("Error loading transaction categories:", err));
  }, [numberCommitted]);

  // ── Live Weighment No. preview once a Transaction Category is picked ──
  useEffect(() => {
    if (numberCommitted) return;
    if (!form.weighmentTransactionCategory) { setWeighmentNoPreview(""); return; }
    const cat = transactionCategories.find((t) => t._id === form.weighmentTransactionCategory);
    if (!cat) { setWeighmentNoPreview(""); return; }

    fetch(`${API_URL}/api/document-sequence`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const matching = (list || []).filter(
          (r) => r.module === "Sales" && r.businessEntity === "Weighment" && r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setWeighmentNoPreview(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          return;
        }
        const last   = matching.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setWeighmentNoPreview(`${prefix}${date}${String(nextNo).padStart(digits, "0")}`);
      })
      .catch(() => setWeighmentNoPreview(""));
  }, [form.weighmentTransactionCategory, transactionCategories, numberCommitted]);

  const filteredOutwards = outwardOptions.filter((o) => {
    const q = outwardQuery.trim().toLowerCase();
    if (!q) return true;
    return (o.gateOutNo || "").toLowerCase().includes(q) || (o.customer || "").toLowerCase().includes(q);
  });

  const pickOutward = async (o) => {
    setShowOutwardList(false);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/${o._id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load that record.");
      applyRecord(data);
      navigate(`/vehicle-outward-weighment/${o._id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOutwardInput = (val) => {
    setOutwardQuery(val);
    setShowOutwardList(true);
    if (!val) setRecord(null);
  };

  // ── Item weight capture — same pattern as WeighmentPages.jsx ───────
  // A row is "locked" once it has both weights + the computed net —
  // ticking it again does nothing, and the checkbox is disabled.
  const isRowLocked = (row) => !!(row?.firstWeight && row?.secondWeight && row?.netWeight);

  // Ticking a row makes it active and inherits whatever weight it
  // already carries (secondWeight first, else firstWeight) into
  // First Weight, same as WeighmentPages.jsx's handleItemCheck.
  const handleItemCheck = (rowIdx, checked) => {
    const row = items[rowIdx];
    if (checked && isRowLocked(row)) return;
    const inheritWeight = row?.secondWeight || row?.firstWeight || "";

    setItems((prev) => prev.map((r, i) => ({ ...r, _checked: i === rowIdx ? checked : false })));
    if (checked) {
      setActiveRowIdx(rowIdx);
      setItems((prev) => {
        const next = [...prev];
        next[rowIdx] = { ...next[rowIdx], _checked: true, firstWeight: inheritWeight || next[rowIdx].firstWeight };
        return next;
      });
    } else {
      setActiveRowIdx(null);
    }
    setCurrentWeight("");
  };

  // Tabbing/focusing into the next row auto-inherits the previous
  // row's Second Weight as this row's First Weight — lets successive
  // items be weighed back-to-back on the same weighbridge without
  // re-keying the tare, same chaining WeighmentPages.jsx does.
  const handleRowFocus = (rowIdx) => {
    setItems((prev) => {
      if (rowIdx === 0) return prev;
      const next = [...prev];
      const previous = next[rowIdx - 1];
      if (previous.secondWeight && !next[rowIdx].firstWeight) {
        next[rowIdx] = { ...next[rowIdx], firstWeight: previous.secondWeight };
      }
      return next;
    });
  };

  const getWeight = () => {
    if (activeRowIdx === null) {
      setError("Tick a row in the Items table before capturing weight.");
      return;
    }
    const weight = parseFloat(currentWeight);
    if (!weight) { setError("Enter a weight value first."); return; }
    setError("");

    const row = items[activeRowIdx];

    if (!row.firstWeight) {
      setItems((prev) => {
        const next = [...prev];
        next[activeRowIdx] = { ...next[activeRowIdx], firstWeight: String(weight) };
        return next;
      });
      setCurrentWeight("");
      return;
    }

    if (!row.secondWeight) {
      const first = parseFloat(row.firstWeight) || 0;
      const net   = parseFloat(Math.abs(first - weight).toFixed(3));
      setItems((prev) => {
        const next = [...prev];
        next[activeRowIdx] = { ...next[activeRowIdx], secondWeight: String(weight), netWeight: String(net), _checked: false };
        return next;
      });
      setActiveRowIdx(null);
      setCurrentWeight("");
      setTimeout(() => itemsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      return;
    }

    setError("First and Second Weight already recorded for this row.");
  };

  const activeRow         = activeRowIdx !== null ? items[activeRowIdx] : null;
  const weightButtonText  = !activeRow ? "Tick a row first" : !activeRow.firstWeight ? "Get Weight (→ 1st)" : !activeRow.secondWeight ? "Get Weight (→ 2nd)" : "Completed";
  const weightHint        = !activeRow ? "" : !activeRow.firstWeight ? " — will set First Weight" : !activeRow.secondWeight ? " — will set Second Weight" : " — completed";
  const weightDisabled    = !activeRow || (!!activeRow.firstWeight && !!activeRow.secondWeight);

  // ── Save — resolves Weighment No. (first time only) then persists
  //    header + item weights via the consolidated /weighment route ──
  const handleSaveWeighment = async () => {
    setError(""); setSuccess("");
    if (!record) { setError("Please select an Outward No. first."); return; }
    if (!numberCommitted && !form.weighmentTransactionCategory) {
      setError("Please select a Transaction Category.");
      return;
    }

    setSaving(true);
    try {
      let weighmentNo = form.weighmentNo;
      let categoryDesc = form.weighmentTransactionCategory;

      if (!numberCommitted) {
        const cat = transactionCategories.find((t) => t._id === form.weighmentTransactionCategory);
        if (!cat) throw new Error("Invalid Transaction Category selected.");
        categoryDesc = cat.categoryDescription;

        const seqListRes = await fetch(`${API_URL}/api/document-sequence`);
        const seqList = seqListRes.ok ? await seqListRes.json() : [];
        const matchingSeq = (seqList || []).filter(
          (r) => r.module === "Sales" && r.businessEntity === "Weighment" && r.transactionCategory === cat.categoryDescription
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
            businessEntity: "Weighment",
            entityPrefix,
            transactionCategory: cat.categoryDescription,
          }),
        });
        const seqData = await seqRes.json();
        if (!seqRes.ok || !seqData.generatedCode) {
          throw new Error(seqData.message || "Could not generate Weighment No.");
        }
        weighmentNo = seqData.generatedCode;
      }

      const payload = {
        weighmentTransactionCategory: categoryDesc,
        weighmentNo,
        weighmentDate:   form.weighmentDate,
        description:     form.description,
        partyCode:       record.partyCode || "",
        weighmentInDate: form.weighmentInDate,
        weighmentInTime: form.weighmentInTime,
        transporterName: form.transporterName,
        invoiceNo:       form.invoiceNo,
        invoiceDate:     form.invoiceDate,
        weighmentStatus: form.weighmentStatus,
        items: items.map((it) => ({
          sNo: it.sNo, firstWeight: it.firstWeight, secondWeight: it.secondWeight,
          netWeight: it.netWeight, remarks: it.remarks,
        })),
      };

      const res = await fetch(`${API_BASE}/${record._id}/weighment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Save failed");

      applyRecord(data.data);
      setSuccess("Weighment saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Complete / Exit — only once the record has reached "Weighed" ───
  const handleExit = async () => {
    setError(""); setSuccess("");
    setExiting(true);
    try {
      const res = await fetch(`${API_BASE}/${record._id}/exit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exitDate: today, exitTime: nowTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not complete exit.");
      applyRecord(data);
      setSuccess("Vehicle marked as Exited.");
    } catch (err) {
      setError(err.message);
    } finally {
      setExiting(false);
    }
  };

  if (loading) {
    return (
      <div className="vow-page">
        <div className="vow-topbar">
          <div className="vow-topbar-left">
            <button className="vow-back-btn" onClick={() => navigate("/vehicle-outward-weighment-search")}>← Weighment</button>
          </div>
        </div>
        <div className="vow-body">
          <div className="vow-card vow-loading">
            <div className="vow-spinner" />
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vow-page">
      <div className="vow-topbar">
        <div className="vow-topbar-left">
          <button className="vow-back-btn" onClick={() => navigate("/vehicle-outward-weighment-search")}>← Weighment</button>
          {record && <span className="vow-gateout-no">{record.gateOutNo}</span>}
        </div>
        {record && (
          <div className="vow-topbar-right">
            <span className={`vow-status-badge vow-stage-${(record.stage || "gate-in").toLowerCase().replace(/\s+/g, "-")}`}>
              {record.stage}
            </span>
          </div>
        )}
      </div>

      <div className="vow-body">
        <div className="vow-card">
          {error   && <div className="vow-alert vow-alert-err">{error}</div>}
          {success && <div className="vow-alert vow-alert-ok">{success}</div>}

          {/* ── HEADER: Transaction Category / Weighment No / Date / Description ── */}
          <div className="vow-section-title">Weighment</div>
          <div className="vow-grid">
            <div className="vow-group">
              <label className="vow-label">Transaction Category {!numberCommitted && <span className="vow-req">*</span>}</label>
              {numberCommitted ? (
                <input className="vow-input vow-readonly" type="text" readOnly value={form.weighmentTransactionCategory || "-"} />
              ) : (
                <select
                  className="vow-input"
                  value={form.weighmentTransactionCategory}
                  onChange={(e) => setForm((p) => ({ ...p, weighmentTransactionCategory: e.target.value }))}
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

            <div className="vow-group">
              <label className="vow-label">Weighment No.</label>
              <input
                className="vow-input vow-readonly"
                type="text"
                readOnly
                value={
                  numberCommitted
                    ? form.weighmentNo
                    : !form.weighmentTransactionCategory
                      ? "Select category first…"
                      : (weighmentNoPreview || "Generating…")
                }
                style={numberCommitted || (form.weighmentTransactionCategory && weighmentNoPreview)
                  ? { fontWeight: 600, letterSpacing: 1, color: "#c2410c" } : undefined}
              />
            </div>

            <div className="vow-group">
              <label className="vow-label">Weighment Date <span className="vow-req">*</span></label>
              <input
                className="vow-input" type="date" value={form.weighmentDate}
                onChange={(e) => setForm((p) => ({ ...p, weighmentDate: e.target.value }))}
              />
            </div>

            <div className="vow-group">
              <label className="vow-label">Description</label>
              <input
                className="vow-input" type="text" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional note"
              />
            </div>
          </div>

          {/* ── WEIGHMENT DETAILS ── */}
          <div className="vow-section-title">Weighment Details</div>
          <div className="vow-grid">

            <div className="vow-group" ref={outwardBoxRef} style={{ gridColumn: "span 2" }}>
              <label className="vow-label">Outward No. <span className="vow-req">*</span></label>
              {id ? (
                <input className="vow-input vow-readonly" type="text" readOnly value={outwardQuery || "-"} />
              ) : (
                <>
                  <input
                    className="vow-input"
                    value={outwardQuery}
                    onChange={(e) => handleOutwardInput(e.target.value)}
                    onFocus={() => setShowOutwardList(true)}
                    placeholder="Type or select an Outward No…"
                    autoComplete="off"
                  />
                  {showOutwardList && filteredOutwards.length > 0 && (
                    <ul className="dp-suggestions" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 5, background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, maxHeight: 220, overflowY: "auto", listStyle: "none", margin: 0, padding: 4 }}>
                      {filteredOutwards.map((o) => (
                        <li
                          key={o._id}
                          onMouseDown={() => pickOutward(o)}
                          style={{ padding: "6px 8px", cursor: "pointer", fontSize: 13, borderRadius: 3 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#fff7ed")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {o.gateOutNo}{o.customer ? ` — ${o.customer}` : ""}{o.vehicleNo ? ` (${o.vehicleNo})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="vow-group">
              <label className="vow-label">Vehicle No.</label>
              <input className="vow-input vow-readonly" type="text" readOnly value={record?.vehicleNo || "-"} />
            </div>

            <div className="vow-group">
              <label className="vow-label">Party Code</label>
              <input className="vow-input vow-readonly" type="text" readOnly value={record?.partyCode || "-"} />
            </div>

            <div className="vow-group">
              <label className="vow-label">Party Name</label>
              <input className="vow-input vow-readonly" type="text" readOnly value={record?.customer || "-"} />
            </div>

            <div className="vow-group">
              <label className="vow-label">Weighment In Date <span className="vow-req">*</span></label>
              <input
                className="vow-input" type="date" value={form.weighmentInDate}
                onChange={(e) => setForm((p) => ({ ...p, weighmentInDate: e.target.value }))}
              />
            </div>

            <div className="vow-group">
              <label className="vow-label">Weighment In Time <span className="vow-req">*</span></label>
              <input
                className="vow-input" type="time" value={form.weighmentInTime}
                onChange={(e) => setForm((p) => ({ ...p, weighmentInTime: e.target.value }))}
              />
            </div>

            <div className="vow-group">
              <label className="vow-label">Transporter Name</label>
              <input
                className="vow-input" type="text" value={form.transporterName}
                onChange={(e) => setForm((p) => ({ ...p, transporterName: e.target.value }))}
                placeholder="Transporter / driver"
              />
            </div>

            <div className="vow-group">
              <label className="vow-label">Invoice No.</label>
              <input
                className="vow-input" type="text" value={form.invoiceNo}
                onChange={(e) => setForm((p) => ({ ...p, invoiceNo: e.target.value }))}
              />
            </div>

            <div className="vow-group">
              <label className="vow-label">Invoice Date</label>
              <input
                className="vow-input" type="date" value={form.invoiceDate}
                onChange={(e) => setForm((p) => ({ ...p, invoiceDate: e.target.value }))}
              />
            </div>

            <div className="vow-group">
              <label className="vow-label">Status</label>
              <select
                className="vow-input" value={form.weighmentStatus}
                onChange={(e) => setForm((p) => ({ ...p, weighmentStatus: e.target.value }))}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>

          {/* ── WEIGHT CAPTURE — same tick-a-row / Get Weight pattern as WeighmentPages.jsx ── */}
          {record && (
            <>
              <div className="vow-section-title">Weight Capture</div>
              <div className="vow-weight-strip">

                <div className="vow-weight-box">
                  <label className="vow-label">First Weight</label>
                  <input className="vow-input vow-wt-yellow" readOnly value={activeRow?.firstWeight || ""} placeholder="—" />
                </div>

                <div className="vow-weight-box">
                  <label className="vow-label">Second Weight</label>
                  <input className="vow-input vow-wt-yellow" readOnly value={activeRow?.secondWeight || ""} placeholder="—" />
                </div>

                <div className="vow-weight-box">
                  <label className="vow-label">Net Weight</label>
                  <input
                    className="vow-input vow-wt-green" readOnly placeholder="—"
                    value={activeRow?.netWeight ? parseFloat(parseFloat(activeRow.netWeight).toFixed(3)) : ""}
                  />
                </div>

                <div className="vow-weight-box vow-weight-get-box">
                  <label className="vow-label">
                    Weight (In MT) <span className="vow-wt-hint">{weightHint}</span>
                  </label>
                  <div className="vow-get-weight-wrap">
                    <input
                      type="number" step="0.001"
                      className="vow-input"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      placeholder={activeRowIdx === null ? "Tick a row first…" : "Enter value"}
                      disabled={weightDisabled}
                    />
                    <button
                      type="button"
                      className={`vow-btn vow-btn-save vow-get-btn ${weightDisabled ? "vow-get-btn-done" : ""}`}
                      onClick={getWeight} disabled={weightDisabled}
                    >
                      {weightButtonText}
                    </button>
                  </div>
                </div>

              </div>

              {activeRowIdx === null ? (
                <div className="vow-active-row-hint vow-hint-warn">
                  ⚠️ Tick a row in the Items table below before entering weight.
                </div>
              ) : (
                <div className="vow-active-row-hint">
                  ✏️ Row {activeRowIdx + 1} selected — enter weight above and click Get Weight
                </div>
              )}
            </>
          )}

          {/* ── ITEMS — same first/second/net weight capture as WeighmentPages.jsx ── */}
          <div className="vow-section-title" ref={itemsSectionRef}>Items</div>
          {!record ? (
            <div className="vow-alert vow-alert-err" style={{ background: "#fff7ed", color: "#9a3412" }}>
              Select an Outward No. above to load its items.
            </div>
          ) : (
            <div className="vow-items-section">
              <div className="vow-items-header">
                <span className="vow-items-title">
                  Item Code / Item Name / Size / Qty — {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                {activeRowIdx !== null && <span className="vow-active-badge">Row {activeRowIdx + 1} active</span>}
              </div>

              <div className="vow-items-table-wrap">
                <table className="vow-items-table">
                  <thead>
                    <tr>
                      <th>✓</th>
                      <th>S.No</th>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Size</th>
                      <th>Qty</th>
                      <th>First Wt.</th>
                      <th>Second Wt.</th>
                      <th>Net Wt.</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, idx) => {
                      const locked = isRowLocked(row);
                      const active = activeRowIdx === idx;
                      return (
                        <tr
                          key={row.sNo || idx}
                          className={[locked ? "vow-row-locked" : "", active ? "vow-row-active" : ""].filter(Boolean).join(" ")}
                          onFocus={() => !locked && handleRowFocus(idx)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={!!row._checked}
                              onChange={(e) => handleItemCheck(idx, e.target.checked)}
                              disabled={locked}
                              title={locked ? "Row complete — locked" : "Tick to capture weight for this row"}
                            />
                          </td>
                          <td>
                            {row.sNo}
                            {locked && <span className="vow-lock-icon" title="Complete">🔒</span>}
                          </td>
                          <td>{row.itemCode || "-"}</td>
                          <td>{row.itemName || "-"}</td>
                          <td>{row.size || "-"}</td>
                          <td>{row.qty}</td>
                          <td className={row.firstWeight ? "vow-wt-filled" : ""}>{row.firstWeight || "← auto"}</td>
                          <td className={row.secondWeight ? "vow-wt-filled" : ""}>{row.secondWeight || "—"}</td>
                          <td className={row.netWeight ? "vow-net-filled" : ""}>{row.netWeight || "—"}</td>
                          <td>
                            <input
                              className="vow-input"
                              style={{ height: 28, fontSize: 12 }}
                              value={row.remarks}
                              onFocus={() => !locked && handleRowFocus(idx)}
                              onChange={(e) => setItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], remarks: e.target.value };
                                return next;
                              })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUMMARY — once weighing has started ── */}
          {record && (record.tareWeight || record.grossWeight) && (
            <div className={`vow-stage-panel ${record.stage === "Exited" ? "vow-stage-panel-done" : ""}`}>
              <div className={`vow-stage-panel-title ${record.stage === "Exited" ? "vow-done-title" : ""}`}>
                {record.stage === "Exited" ? "Weighment Complete" : "Weighment In Progress"}
              </div>
              <div className="vow-summary-grid">
                <div className="vow-summary-item">
                  <div className="vow-summary-label">Tare Weight</div>
                  <div className="vow-summary-value">{record.tareWeight ?? "-"} MT</div>
                </div>
                <div className="vow-summary-item">
                  <div className="vow-summary-label">Gross Weight</div>
                  <div className="vow-summary-value">{record.grossWeight ?? "-"} MT</div>
                </div>
                <div className="vow-summary-item">
                  <div className="vow-summary-label">Net Weight</div>
                  <div className="vow-summary-value vow-net-value">{record.netWeight ?? "-"} MT</div>
                </div>
              </div>
            </div>
          )}

          <div className="vow-btn-row">
            <button type="button" className="vow-btn vow-btn-cancel" onClick={() => navigate("/vehicle-outward-weighment-search")}>
              Back
            </button>
            {record && record.stage === "Weighed" && (
              <button type="button" className="vow-btn vow-btn-save" onClick={handleExit} disabled={exiting}>
                {exiting ? "Completing…" : "Complete / Exit"}
              </button>
            )}
            {record && record.stage !== "Exited" && (
              <button type="button" className="vow-btn vow-btn-save" onClick={handleSaveWeighment} disabled={saving}>
                {saving ? "Saving…" : "Save Weighment"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleOutwardWeighment;