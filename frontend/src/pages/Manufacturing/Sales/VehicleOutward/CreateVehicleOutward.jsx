import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./CreateVehicleOutward.css";
import { API_URL } from "../../../../config";

/*
  VEHICLE OUTWARD — GATE IN / DETAILS
  ──────────────────────────────
  /vehicle-outward/create   → record the empty-vehicle arrival
                               ("Gate In") against a Ready Dispatch
  /vehicle-outward/edit/:id → view / edit that same Gate In record
                               later (Vehicle No., Driver, Gate In
                               Date/Time) — same layout as Create,
                               reached via the "Continue" button on
                               the search page.

  Everything past Gate In (tare weight, loading, gross weight, exit)
  still lives in the separate Vehicle Outward Weighment module — see
  VehicleOutwardWeighment.jsx — reachable from this page via the
  "Continue to Weighment" button once a record exists.
*/

const API_BASE        = `${API_URL}/api/vehicle-outward`;
const DISPATCH_SOURCE = `${API_URL}/api/vehicle-outward/source-dispatches`;

/* ── 2-digit year date builder — mirrors Sauda / Dispatch / Document
     Sequence routes, used to preview the Gate Out No. the moment a
     Transaction Category is picked (same pattern Create Sauda /
     Create Dispatch use) ── */
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

const CreateVehicleOutward = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);   // /vehicle-outward/edit/:id — Details / edit an existing record
  const now      = new Date();
  const today    = now.toISOString().split("T")[0];
  const nowTime  = now.toTimeString().slice(0, 5);

  const [dispatches, setDispatches] = useState([]);

  const [gateInForm, setGateInForm] = useState({
    dispatchId: "",
    transactionCategory: "",   // holds the Transaction Category _id while creating
    vehicleNo: "",
    driverName: "",
    gateInDate: today,
    gateInTime: nowTime,
  });

  /* Read-only context shown in edit mode — populated straight from
     the fetched record, not editable here (dispatch/number/stage all
     change through their own dedicated flows). */
  const [recordInfo, setRecordInfo] = useState({
    gateOutNo: "", transactionCategoryDesc: "", dispatchNo: "", partyName: "", stage: "",
  });

  /* Transaction Category master — only Open categories configured for
     Sales / Vehicle Outward are shown, same as Create Sauda / Create
     Dispatch do for their own numbers. */
  const [transactionCategories, setTransactionCategories] = useState([]);
  /* Live Gate Out No. preview once a Transaction Category is picked */
  const [gateOutNoPreview, setGateOutNoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // ── Edit mode: fetch the existing Gate Out record ──────────────────
  useEffect(() => {
    if (!isEdit) return;
    const loadRecord = async () => {
      setLoading(true);
      setError("");
      try {
        const res  = await fetch(`${API_BASE}/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Record not found");
        setGateInForm((p) => ({
          ...p,
          dispatchId: data.dispatchId || "",
          vehicleNo:  data.vehicleNo  || "",
          driverName: data.driverName || "",
          gateInDate: data.gateInDate || today,
          gateInTime: data.gateInTime || nowTime,
        }));
        setRecordInfo({
          gateOutNo: data.gateOutNo || "",
          transactionCategoryDesc: data.transactionCategory || "",
          dispatchNo: data.dispatchNo || "",
          partyName:  data.customer   || "",
          stage:      data.stage      || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadRecord();
  }, [id, isEdit]);

  // ── Create mode: load Ready dispatches to pick from ────────────────
  useEffect(() => {
    if (isEdit) return;
    const loadDispatches = async () => {
      setLoading(true);
      setError("");
      try {
        const res  = await fetch(DISPATCH_SOURCE);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load Ready dispatches.");
        setDispatches(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDispatches();
  }, [isEdit]);

  /* ── Load Transaction Category master (Sales / Vehicle Outward, Open only) ── */
  useEffect(() => {
    if (isEdit) return;
    fetch(`${API_URL}/api/transactions`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setTransactionCategories(
          (Array.isArray(data) ? data : []).filter(
            (t) => t.module === "Sales" && t.businessEntity === "Vehicle Outward" && t.status === "Open"
          )
        );
      })
      .catch((err) => console.log("Error loading transaction categories:", err));
  }, [isEdit]);

  /* ── Live Gate Out No. preview — recomputed whenever the Transaction
     Category changes. Mirrors Create Sauda / Create Dispatch's number
     preview logic. Create mode only — an edit already has a real
     gateOutNo shown from recordInfo instead. ── */
  useEffect(() => {
    if (isEdit) return;
    if (!gateInForm.transactionCategory) { setGateOutNoPreview(""); return; }
    const cat = transactionCategories.find((t) => t._id === gateInForm.transactionCategory);
    if (!cat) { setGateOutNoPreview(""); return; }

    fetch(`${API_URL}/api/document-sequence`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const matching = (list || []).filter(
          (r) =>
            r.module === "Sales" &&
            r.businessEntity === "Vehicle Outward" &&
            r.transactionCategory === cat.categoryDescription
        );
        if (!matching.length) {
          setGateOutNoPreview(`(Create a Document Sequence for "${cat.categoryDescription}" first)`);
          return;
        }
        const last   = matching.reduce((a, b) => (Number(a.incrementNo) > Number(b.incrementNo) ? a : b));
        const prefix = (last.entityPrefix || "").trim().toUpperCase();
        const digits = Math.max(1, Number(last.sequenceDigits) || 2);
        const step   = Math.max(1, Number(last.incrementStep) || 1);
        const nextNo = Number(last.incrementNo) + step;
        const date   = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
        setGateOutNoPreview(`${prefix}${date}${String(nextNo).padStart(digits, "0")}`);
      })
      .catch(() => setGateOutNoPreview(""));
  }, [gateInForm.transactionCategory, transactionCategories, isEdit]);

  const handleSelectDispatch = (e) => {
    const dispatchId = e.target.value;
    const d = dispatches.find((x) => x._id === dispatchId);
    setGateInForm((p) => ({
      ...p,
      dispatchId,
      vehicleNo:  d?.vehicleNo  || "",
      driverName: d?.driverName || "",
    }));
  };

  const handleGateIn = async () => {
    setError(""); setSuccess("");
    if (!gateInForm.transactionCategory) { setError("Please select a Transaction Category."); return; }
    if (!gateInForm.dispatchId) { setError("Please select a Dispatch."); return; }
    if (!gateInForm.gateInDate || !gateInForm.gateInTime) { setError("Gate In Date & Time are required."); return; }

    setSaving(true);
    try {
      /* ── Resolve the Gate Out No. from the chosen Transaction
         Category's Document Sequence — same pattern Create Sauda /
         Create Dispatch use on Save, so the sequence only advances
         once per actual Gate In. ── */
      const cat = transactionCategories.find((t) => t._id === gateInForm.transactionCategory);
      if (!cat) throw new Error("Invalid Transaction Category selected.");

      const seqListRes = await fetch(`${API_URL}/api/document-sequence`);
      const seqList = seqListRes.ok ? await seqListRes.json() : [];
      const matchingSeq = (seqList || []).filter(
        (r) => r.module === "Sales" && r.businessEntity === "Vehicle Outward" && r.transactionCategory === cat.categoryDescription
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
          businessEntity: "Vehicle Outward",
          entityPrefix,
          transactionCategory: cat.categoryDescription,
        }),
      });
      const seqData = await seqRes.json();
      if (!seqRes.ok || !seqData.generatedCode) {
        throw new Error(seqData.message || "Could not generate Gate Out No.");
      }

      const payload = {
        ...gateInForm,
        gateOutNo: seqData.generatedCode,
        transactionCategory: cat.categoryDescription,
      };

      const res = await fetch(`${API_BASE}/gate-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gate In failed");
      // Gate In is saved — go straight to the Weighment page for this
      // record, which now drives the rest of the outward journey.
      navigate(`/vehicle-outward-weighment/${data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit mode: save Vehicle No. / Driver / Gate In Date & Time ─────
  const handleSaveDetails = async () => {
    setError(""); setSuccess("");
    if (!gateInForm.gateInDate || !gateInForm.gateInTime) { setError("Gate In Date & Time are required."); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNo:  gateInForm.vehicleNo,
          driverName: gateInForm.driverName,
          gateInDate: gateInForm.gateInDate,
          gateInTime: gateInForm.gateInTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setSuccess("Saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dp-page">
        <div className="dp-topbar">
          <div className="dp-topbar-left">
            <button className="dp-back-btn" onClick={() => navigate("/vehicle-outward-search")}>← Vehicle Outward</button>
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
          <button className="dp-back-btn" onClick={() => navigate("/vehicle-outward-search")}>← Vehicle Outward</button>
        </div>
      </div>

      <div className="dp-body">
        <div className="dp-card">
          {error   && <div className="dp-alert dp-alert-err">{error}</div>}
          {success && <div className="dp-alert dp-alert-ok">{success}</div>}
          {!isEdit && (
            <div className="dp-alert dp-alert-info">
              Only <strong>Ready</strong> Dispatches without an existing Gate Out record are shown below.
            </div>
          )}

          <div className="dp-section-title">
            {isEdit ? `Gate Out Details — ${recordInfo.gateOutNo || "…"}` : "Gate In — Empty Vehicle Arrival"}
            {isEdit && recordInfo.stage && (
              <span className={`dp-stage-pill dp-stage-${recordInfo.stage.toLowerCase().replace(/\s+/g, "-")}`}>
                {recordInfo.stage}
              </span>
            )}
          </div>

          <div className="dp-grid">

            {/* TRANSACTION CATEGORY — drives the Gate Out No. via
                Document Sequence, same pattern as Create Sauda / Create
                Dispatch. Master data only (Open categories configured
                for Sales / Vehicle Outward). Read-only once created —
                the number is already issued and can't be re-picked. */}
            <div className="dp-group">
              <label className="dp-label">Transaction Category {!isEdit && <span className="dp-req">*</span>}</label>
              {isEdit ? (
                <input className="dp-input dp-readonly" type="text" readOnly value={recordInfo.transactionCategoryDesc || "-"} />
              ) : (
                <select
                  className="dp-input"
                  value={gateInForm.transactionCategory}
                  onChange={(e) => setGateInForm((p) => ({ ...p, transactionCategory: e.target.value }))}
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
              <label className="dp-label">Gate Out No.</label>
              <input
                className="dp-input dp-readonly"
                type="text"
                readOnly
                value={
                  isEdit
                    ? (recordInfo.gateOutNo || "-")
                    : !gateInForm.transactionCategory
                      ? "Select category first…"
                      : (gateOutNoPreview || "Generating…")
                }
                style={(isEdit && recordInfo.gateOutNo) || (!isEdit && gateInForm.transactionCategory)
                  ? { fontWeight: 600, letterSpacing: 1, color: "#15803d" } : undefined}
              />
            </div>

            {/* DISPATCH — pickable while creating; fixed (read-only)
                once the Gate Out record exists. */}
            <div className="dp-group" style={{ gridColumn: "span 2" }}>
              <label className="dp-label">Dispatch {!isEdit && <span className="dp-req">*</span>}</label>
              {isEdit ? (
                <input
                  className="dp-input dp-readonly" type="text" readOnly
                  value={`${recordInfo.dispatchNo || "-"}${recordInfo.partyName ? " — " + recordInfo.partyName : ""}`}
                />
              ) : (
                <select className="dp-input" value={gateInForm.dispatchId} onChange={handleSelectDispatch}>
                  <option value="">Select a Ready Dispatch…</option>
                  {dispatches.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.dispatchNo} — {d.partyName} ({d.vehicleNo})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="dp-group">
              <label className="dp-label">Vehicle No.</label>
              <input
                className="dp-input" value={gateInForm.vehicleNo}
                onChange={(e) => setGateInForm((p) => ({ ...p, vehicleNo: e.target.value }))}
                placeholder="e.g. UP32 AB 1234"
              />
            </div>

            <div className="dp-group">
              <label className="dp-label">Driver</label>
              <input
                className="dp-input" value={gateInForm.driverName}
                onChange={(e) => setGateInForm((p) => ({ ...p, driverName: e.target.value }))}
                placeholder="Driver name"
              />
            </div>

            <div className="dp-group">
              <label className="dp-label">Gate In Date <span className="dp-req">*</span></label>
              <input
                className="dp-input" type="date" value={gateInForm.gateInDate}
                onChange={(e) => setGateInForm((p) => ({ ...p, gateInDate: e.target.value }))}
              />
            </div>

            <div className="dp-group">
              <label className="dp-label">Gate In Time <span className="dp-req">*</span></label>
              <input
                className="dp-input" type="time" value={gateInForm.gateInTime}
                onChange={(e) => setGateInForm((p) => ({ ...p, gateInTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="dp-btn-row">
            <button type="button" className="dp-btn dp-btn-cancel" onClick={() => navigate("/vehicle-outward-search")}>
              Back
            </button>
            {isEdit && (
              <button
                type="button"
                className="dp-btn dp-btn-cancel"
                onClick={() => navigate(`/vehicle-outward-weighment/${id}`)}
                style={{ marginRight: "auto" }}
              >
                Continue to Weighment →
              </button>
            )}
            <button
              type="button"
              className="dp-btn dp-btn-save"
              onClick={isEdit ? handleSaveDetails : handleGateIn}
              disabled={saving}
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Gate In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVehicleOutward;