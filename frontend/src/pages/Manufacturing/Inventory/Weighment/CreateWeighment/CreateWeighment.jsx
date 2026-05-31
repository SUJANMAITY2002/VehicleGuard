import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateWeighment.css";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";

const WEIGHMENT_API = "http://localhost:5000/api/weighment";
const today = new Date().toISOString().split("T")[0];

/* ── blank item row ─────────────────────────────────
   firstWeight  — auto-filled from previous second weight
   secondWeight — filled by Get Weight (only once)
   netWeight    — auto calculated, read-only
   weightInput  — the weighbridge input field for this row
   firstLocked  — once firstWeight is set, never overwrite
   secondLocked — once secondWeight is set via Get Weight, lock it
─────────────────────────────────────────────────── */
const blankItem = (sNo) => ({
  sNo,
  firstWeight:   "",
  secondWeight:  "",
  netWeight:     "",
  weightInput:   "",
  remarks:       "",
  firstLocked:   false,
  secondLocked:  false,
  _checked:      false,
});

const DEFAULT_ROWS = 4;

const CreateWeighment = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    weighmentNo:         "",
    transactionCategory: "",
    status:              "Open",
    inwardOutwardNoteNo: "",
    vehicleNo:           "",
    site:                "Factory Office-GYPMART INDIA",
    transactionType:     "",
    partyName:           "",
    transporterName:     "",
    weighmentInDate:     today,
    weighmentInTime:     "",
    weighmentDate:       today,
    weighmentOutDate:    today,
    weighmentOutTime:    "",

    /* Top-level weight fields */
    firstWeight:   "",
    secondWeight:  "",
    netWeight:     "",
    currentWeight: "",   /* weighbridge input */

    /* lock flags — once saved cannot be re-entered */
    firstLocked:  false,
    secondLocked: false,

    supplierInvoiceNo:   "",
    supplierInvoiceDate: today,
    transitDate:         "",
    billNo:              "",
    billDate:            today,
    totalDispatchWeight: "",
    remarks:             "",
    bulkWeigh:           false,
  });

  const [items,       setItems]       = useState(
    Array.from({ length: DEFAULT_ROWS }, (_, i) => blankItem(i + 1))
  );
  const [insertCount, setInsertCount] = useState(5);

  /* ── generic field handler (skips locked weight fields) ── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* ════════════════════════════════════════════════════
     TOP-LEVEL GET WEIGHT
     1st click → saves to firstWeight  (locks it)
     2nd click → saves to secondWeight (locks it), calculates net
     After both locked → alert, cannot re-enter
  ════════════════════════════════════════════════════ */
  const getWeight = () => {
    const value = parseFloat(formData.currentWeight);
    if (!value) { alert("Enter a weight value first"); return; }

    setFormData((prev) => {
      /* Both already locked — nothing to do */
      if (prev.firstLocked && prev.secondLocked) {
        alert("Both weights already recorded. Use item rows for additional entries.");
        return prev;
      }

      /* First weight not yet set → save as firstWeight */
      if (!prev.firstLocked) {
        return {
          ...prev,
          firstWeight:  String(value),
          firstLocked:  true,
          currentWeight: "",   /* clear input after use */
        };
      }

      /* First set, second not yet → save as secondWeight + calc net */
      const first = parseFloat(prev.firstWeight) || 0;
      const net   = Math.abs(first - value);
      return {
        ...prev,
        secondWeight:  String(value),
        netWeight:     String(net),
        secondLocked:  true,
        currentWeight: "",
      };
    });
  };

  /* ════════════════════════════════════════════════════
     ITEM ROW FOCUS — auto-inherit firstWeight
     Row 0 → inherits from top-level secondWeight
     Row N → inherits from row N-1 secondWeight
  ════════════════════════════════════════════════════ */
  const handleRowFocus = (rowIdx) => {
    setItems((prev) => {
      const next = [...prev];
      const cur  = next[rowIdx];

      /* Already locked — don't touch */
      if (cur.firstLocked) return prev;

      let sourceSecond = "";

      if (rowIdx === 0) {
        sourceSecond = formData.secondWeight;
      } else {
        sourceSecond = next[rowIdx - 1].secondWeight;
      }

      if (sourceSecond && !cur.firstWeight) {
        next[rowIdx] = { ...cur, firstWeight: sourceSecond, firstLocked: true };
      }

      return next;
    });
  };

  /* ════════════════════════════════════════════════════
     ITEM ROW GET WEIGHT
     Only fills secondWeight (once, then locks)
     firstWeight is always auto-inherited (read-only)
  ════════════════════════════════════════════════════ */
  const getItemWeight = (rowIdx) => {
    setItems((prev) => {
      const next = [...prev];
      const row  = { ...next[rowIdx] };

      if (row.secondLocked) {
        alert("Second weight already recorded for this row.");
        return prev;
      }

      const value = parseFloat(row.weightInput);
      if (!value) { alert("Enter a weight value first"); return prev; }

      const first = parseFloat(row.firstWeight || 0) || 0;
      const net   = Math.abs(first - value);

      row.secondWeight  = String(value);
      row.netWeight     = String(net);
      row.secondLocked  = true;
      row.weightInput   = "";   /* clear input after use */

      next[rowIdx] = row;
      return next;
    });
  };

  /* ── items util handlers ── */
  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return next;
    });
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
      const startSNo = prev.length + 1;
      return [...prev, ...Array.from({ length: count }, (_, i) => blankItem(startSNo + i))];
    });
  };

  const handleDeleteChecked = () => {
    setItems((prev) =>
      prev.filter((r) => !r._checked).map((r, i) => ({ ...r, sNo: i + 1 }))
    );
  };

  const anyChecked = items.some((r) => r._checked);

  /* ── SUBMIT ── */
  const handleSubmit = async () => {
    if (!formData.vehicleNo.trim()) { alert("Vehicle Number is Required"); return; }

    const { currentWeight, firstLocked, secondLocked, ...mainForm } = formData;

    const cleanItems = items
      .filter((r) => r.firstWeight || r.secondWeight || r.netWeight || r.remarks)
      .map(({ _checked, weightInput, firstLocked: fl, secondLocked: sl, ...r }) => r);

    try {
      const res = await axios.post(WEIGHMENT_API, { ...mainForm, items: cleanItems });
      alert(res.data.message || "Weighment Saved");
      navigate("/weighment");
    } catch (err) {
      console.error(err);
      alert("Save Failed");
    }
  };

  const handleCancel = () => navigate("/weighment");

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="cw-page">
      <ModuleNavbar />

      <div className="cw-header">
        <button className="cw-back-btn" onClick={handleCancel}>←</button>
        <h2>Create Weighment</h2>
      </div>

      {/* ── FORM FIELDS ── */}
      <div className="cw-form">

        <div className="cw-group">
          <label>Weighment No</label>
          <input name="weighmentNo" value={formData.weighmentNo} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Transaction Category *</label>
          <select name="transactionCategory" value={formData.transactionCategory} onChange={handleChange}>
            <option value="">Select</option>
            <option>Purchase</option>
            <option>Sales</option>
          </select>
        </div>

        <div className="cw-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleChange}>
            <option>Open</option>
            <option>Closed</option>
          </select>
        </div>

        <div className="cw-group">
          <label>Transaction Type</label>
          <select name="transactionType" value={formData.transactionType} onChange={handleChange}>
            <option value="">Select</option>
            <option>Inward</option>
            <option>Outward</option>
          </select>
        </div>

        <div className="cw-group">
          <label>Inward/Outward Note No</label>
          <input name="inwardOutwardNoteNo" value={formData.inwardOutwardNoteNo} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Vehicle No *</label>
          <input name="vehicleNo" value={formData.vehicleNo} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Party Name</label>
          <input name="partyName" value={formData.partyName} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Transporter Name</label>
          <input name="transporterName" value={formData.transporterName} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Site</label>
          <input name="site" value={formData.site} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Weighment Date</label>
          <input type="date" name="weighmentDate" value={formData.weighmentDate} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Weighment In Date</label>
          <input type="date" name="weighmentInDate" value={formData.weighmentInDate} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Weighment In Time</label>
          <input type="time" name="weighmentInTime" value={formData.weighmentInTime} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Weighment Out Date</label>
          <input type="date" name="weighmentOutDate" value={formData.weighmentOutDate} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Weighment Out Time</label>
          <input type="time" name="weighmentOutTime" value={formData.weighmentOutTime} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Supplier Invoice No</label>
          <input name="supplierInvoiceNo" value={formData.supplierInvoiceNo} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Supplier Invoice Date</label>
          <input type="date" name="supplierInvoiceDate" value={formData.supplierInvoiceDate} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Bill No</label>
          <input name="billNo" value={formData.billNo} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Bill Date</label>
          <input type="date" name="billDate" value={formData.billDate} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Total Dispatch Weight</label>
          <input name="totalDispatchWeight" value={formData.totalDispatchWeight} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Transit Date</label>
          <input type="date" name="transitDate" value={formData.transitDate} onChange={handleChange} />
        </div>

      </div>

      {/* ════════════════════════════════════════════════════
          WEIGHT ROW — all on ONE LINE
          [First Weight] [Second Weight] [Net Weight] [Weight Input + Get Weight btn]
      ════════════════════════════════════════════════════ */}
      <div className="cw-weight-bar">

        {/* First Weight — locked after first Get Weight */}
        <div className="cw-wbar-group">
          <label className="cw-wbar-label">First Weight (MT)</label>
          <input
            className={`cw-wbar-input${formData.firstLocked ? " cw-locked" : " cw-wt-yellow"}`}
            value={formData.firstWeight}
            readOnly
            placeholder="—"
          />
          {formData.firstLocked && <span className="cw-lock-icon" title="Locked">🔒</span>}
        </div>

        {/* Second Weight — locked after second Get Weight */}
        <div className="cw-wbar-group">
          <label className="cw-wbar-label">Second Weight (MT)</label>
          <input
            className={`cw-wbar-input${formData.secondLocked ? " cw-locked" : " cw-wt-yellow"}`}
            value={formData.secondWeight}
            readOnly
            placeholder="—"
          />
          {formData.secondLocked && <span className="cw-lock-icon" title="Locked">🔒</span>}
        </div>

        {/* Net Weight */}
        <div className="cw-wbar-group">
          <label className="cw-wbar-label">Net Weight (MT)</label>
          <input
            className="cw-wbar-input cw-net-green"
            value={formData.netWeight}
            readOnly
            placeholder="—"
          />
        </div>

        {/* Weighbridge input + Get Weight button */}
        <div className="cw-wbar-group cw-wbar-getweight">
          <label className="cw-wbar-label">
            Weight (In MT)
            {!formData.firstLocked  && <span className="cw-wbar-hint"> → will set First Weight</span>}
            {formData.firstLocked && !formData.secondLocked && <span className="cw-wbar-hint"> → will set Second Weight</span>}
            {formData.firstLocked && formData.secondLocked  && <span className="cw-wbar-hint cw-hint-done"> ✓ Both recorded</span>}
          </label>
          <div className="cw-get-weight-wrap">
            <input
              type="number"
              step="0.001"
              name="currentWeight"
              value={formData.currentWeight}
              onChange={handleChange}
              disabled={formData.firstLocked && formData.secondLocked}
              placeholder="Enter value"
              className="cw-wb-input"
            />
            <button
              type="button"
              className={`cw-get-btn${formData.firstLocked && formData.secondLocked ? " cw-get-btn-done" : ""}`}
              onClick={getWeight}
              disabled={formData.firstLocked && formData.secondLocked}
            >
              {!formData.firstLocked                      ? "Get Weight (→ 1st)" :
               formData.firstLocked && !formData.secondLocked ? "Get Weight (→ 2nd)" :
               "✓ Done"}
            </button>
          </div>
        </div>

      </div>

      {/* ── Remarks + Bulk Weigh ── */}
      <div className="cw-full-width">
        <div className="cw-group">
          <label>Remarks</label>
          <textarea rows="3" name="remarks" value={formData.remarks} onChange={handleChange} />
        </div>
      </div>

      <div className="cw-checkbox">
        <input type="checkbox" name="bulkWeigh" checked={formData.bulkWeigh} onChange={handleChange} />
        <span>Bulk Weigh</span>
      </div>

      {/* ════════════════════════════════════════════════════
          ITEMS GRID
          - Row N auto-inherits secondWeight from row N-1 (or top-level) on focus
          - "Get Weight" in each row only sets secondWeight (once, then locked)
          - firstWeight and all weight outputs are read-only / locked
      ════════════════════════════════════════════════════ */}
      <div className="cw-items-section">

        <div className="cw-items-header">
          <span className="cw-items-title">* Items</span>
          {anyChecked && (
            <button className="cw-del-rows-btn" onClick={handleDeleteChecked}>Delete Selected</button>
          )}
        </div>

        <div className="cw-items-table-wrap">
          <table className="cw-items-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>Del</th>
                <th>First Weight (MT)</th>
                <th>Second Weight (MT)</th>
                <th>Net Weight (MT)</th>
                <th>Weight Input (MT)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr
                  key={idx}
                  className={row._checked ? "cw-row-checked" : ""}
                  onFocus={() => handleRowFocus(idx)}
                >

                  {/* S No */}
                  <td className="cw-sno">{row.sNo}</td>

                  {/* Delete */}
                  <td className="cw-check-cell">
                    <input
                      type="checkbox"
                      checked={!!row._checked}
                      onChange={(e) => handleItemCheck(idx, e.target.checked)}
                    />
                  </td>

                  {/* First Weight — always read-only, auto-filled on focus */}
                  <td>
                    <div className="cw-item-wt-cell">
                      <input
                        className={`cw-item-input cw-wt-input${row.firstLocked ? " cw-locked" : " cw-wt-yellow"}`}
                        value={row.firstWeight}
                        readOnly
                        placeholder="← auto"
                      />
                      {row.firstLocked && <span className="cw-lock-icon-sm">🔒</span>}
                    </div>
                  </td>

                  {/* Second Weight — set by Get Weight, read-only after */}
                  <td>
                    <div className="cw-item-wt-cell">
                      <input
                        className={`cw-item-input cw-wt-input${row.secondLocked ? " cw-locked" : " cw-wt-yellow"}`}
                        value={row.secondWeight}
                        readOnly
                        placeholder="—"
                      />
                      {row.secondLocked && <span className="cw-lock-icon-sm">🔒</span>}
                    </div>
                  </td>

                  {/* Net Weight — always read-only */}
                  <td>
                    <input
                      className="cw-item-input cw-net-wt-input"
                      value={row.netWeight}
                      readOnly
                      placeholder="—"
                    />
                  </td>

                  {/* Weight Input + Get Weight button (inline) */}
                  <td>
                    <div className="cw-item-get-wrap">
                      <input
                        type="number"
                        step="0.001"
                        className="cw-item-input cw-wb-item-input"
                        value={row.weightInput}
                        onChange={(e) => handleItemChange(idx, "weightInput", e.target.value)}
                        disabled={row.secondLocked}
                        placeholder={row.secondLocked ? "✓" : "0.000"}
                      />
                      <button
                        type="button"
                        className={`cw-get-wt-row-btn${row.secondLocked ? " cw-get-done" : ""}`}
                        onClick={() => getItemWeight(idx)}
                        disabled={row.secondLocked}
                      >
                        {row.secondLocked ? "✓" : "Get Wt"}
                      </button>
                    </div>
                  </td>

                  {/* Remarks */}
                  <td>
                    <input
                      className="cw-item-input cw-remarks-input"
                      value={row.remarks}
                      onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                    />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cw-insert-row-bar">
          <input
            type="number" min="1" max="50"
            className="cw-insert-count"
            value={insertCount}
            onChange={(e) => setInsertCount(e.target.value)}
          />
          <button className="cw-insert-row-btn" onClick={handleInsertRows}>Insert Row</button>
        </div>

      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="cw-buttons">
        <button className="submit-btn" onClick={handleSubmit}>Submit</button>
        <button className="draft-btn">Save as Draft</button>
        <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
      </div>

    </div>
  );
};

export default CreateWeighment;