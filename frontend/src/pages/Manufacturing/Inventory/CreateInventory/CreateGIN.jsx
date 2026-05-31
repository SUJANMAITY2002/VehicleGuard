import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateGIN.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

/* ── blank item row factory ── */
const blankItem = (sNo) => ({
  sNo,
  insertBags:    "",
  itemRate:      "",
  transactionNo: "",
  partyName:     "",
  broker:        "",
  itemCode:      "",
  itemName:      "",
  uom:           "",
  salesThrough:  "",
  _checked:      false,   // local only — for delete checkbox
});

const DEFAULT_ROWS = 1;

const CreateGIN = () => {

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [transactionCodes, setTransactionCodes] = useState([]);
  const [insertCount, setInsertCount] = useState(1); // "Insert Row" count input

  const [form, setForm] = useState({
    ginNo:               "",
    poCpoNo:             "",
    status:              "Open",
    site:                "Factory Office-GYPMART INDIA",
    ginDate:             "",
    ginDescription:      "",
    ginType:             "Domestic",
    deliveryMode:        "By Road",
    transactionCategory: "",
    vendorCode:          "",
    vendorName:          "",
    manufacturerAddress: "",
    vehicleEntry:        "Inward",
    manufacturerCode:    "",
    manufacturerName:    "",
    vehicleNo:           "",
    challanInvoiceNo:    "",
    challanDate:         "",
    billDate:            "",
    ewayDate:            "",
    remarks:             "",
    comments:            "",
  });

  /* ── Items grid state ── */
  const [items, setItems] = useState(
    Array.from({ length: DEFAULT_ROWS }, (_, i) => blankItem(i + 1))
  );

  /* ── AUTO GENERATE GIN No + default dates ── */
  useEffect(() => {
    const rand  = Math.floor(100000 + Math.random() * 900000);
    const today = new Date().toISOString().split("T")[0];
    setForm((p) => ({
      ...p,
      ginNo:       `GIN/26-27/${rand}`,
      ginDate:     today,
      challanDate: today,
      billDate:    today,
      ewayDate:    today,
    }));
  }, []);

  /* ── FETCH transaction codes ── */
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res   = await axios.get("/api/document-sequence");
        const codes = res.data.map((item) => item.generatedCode).filter(Boolean);
        setTransactionCodes(codes);
      } catch (err) {
        console.error("Failed to fetch document sequences:", err);
      }
    };
    fetchCodes();
  }, []);

  /* ── form field handler ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  /* ────────────────────────────────────────────
     Items grid handlers
  ──────────────────────────────────────────── */

  /* Update a single cell in items */
  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [field]: value };
      return next;
    });
  };

  /* Toggle delete checkbox */
  const handleItemCheck = (rowIdx, checked) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], _checked: checked };
      return next;
    });
  };

  /* Insert N new rows */
  const handleInsertRows = () => {
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));
    setItems((prev) => {
      const startSNo = prev.length + 1;
      const newRows  = Array.from({ length: count }, (_, i) => blankItem(startSNo + i));
      return [...prev, ...newRows];
    });
  };

  /* Delete checked rows */
  const handleDeleteChecked = () => {
    setItems((prev) => {
      const kept = prev.filter((r) => !r._checked);
      // Re-number sNo
      return kept.map((r, i) => ({ ...r, sNo: i + 1 }));
    });
  };

  /* ── SAVE ── */
  const handleSave = async () => {
    if (!form.ginDate) { alert("GIN Date is required"); return; }
    if (!form.challanInvoiceNo) { alert("Challan/Invoice No is required"); return; }

    try {
      setLoading(true);

      // Strip internal _checked flag before sending
      const cleanItems = items
        .filter((r) => {
          // Only save rows that have at least one field filled
          const { sNo, _checked, ...rest } = r;
          return Object.values(rest).some((v) => v !== "");
        })
        .map(({ _checked, ...r }) => r);

      const payload = { ...form, items: cleanItems };

      const res = await axios.post("/api/goods-inward-note", payload);
      if (res.data.success) {
        alert("Goods Inward Note Saved Successfully");
        navigate("/goods-inward-note");
      }
    } catch (err) {
      console.error(err);
      alert("Save Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const anyChecked = items.some((r) => r._checked);

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="cgin-page">

      <ModuleNavbar />

      {/* ── HEADER ── */}
      <div className="cgin-header">
        <div className="cgin-header-left">
          <button className="cgin-back-btn" onClick={() => navigate("/goods-inward-note")}>←</button>
          <h2>Create Goods Inward Note</h2>
        </div>
      </div>

      {/* ── FORM CARD ── */}
      <div className="cgin-card">

        <div className="cgin-section-title">GIN INFORMATION</div>

        <div className="cgin-grid">

          <div className="cgin-field">
            <label>GIN No</label>
            <input type="text" value={form.ginNo} readOnly />
          </div>

          <div className="cgin-field">
            <label>PO/CPO No</label>
            <input type="text" name="poCpoNo" value={form.poCpoNo} onChange={handleChange} placeholder="Enter PO/CPO No" />
          </div>

          <div className="cgin-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Open</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Site</label>
            <select name="site" value={form.site} onChange={handleChange}>
              <option>Factory Office-GYPMART INDIA</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>GIN Date <span className="req">*</span></label>
            <input type="date" name="ginDate" value={form.ginDate} onChange={handleChange} className="inp-highlight" />
          </div>

          <div className="cgin-field">
            <label>GIN Description</label>
            <input type="text" name="ginDescription" value={form.ginDescription} onChange={handleChange} placeholder="Enter description" />
          </div>

          <div className="cgin-field">
            <label>GIN Type</label>
            <select name="ginType" value={form.ginType} onChange={handleChange}>
              <option>Domestic</option>
              <option>International</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Delivery Mode</label>
            <select name="deliveryMode" value={form.deliveryMode} onChange={handleChange}>
              <option>By Road</option>
              <option>By Train</option>
              <option>By Air</option>
              <option>By Sea</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Transaction Category <span className="field-hint">(Transaction Code)</span></label>
            <select name="transactionCategory" value={form.transactionCategory} onChange={handleChange}>
              <option value="">-- Select Transaction Code --</option>
              {transactionCodes.map((code, i) => <option key={i} value={code}>{code}</option>)}
            </select>
          </div>

          <div className="cgin-field">
            <label>Vendor Code</label>
            <input type="text" name="vendorCode" value={form.vendorCode} onChange={handleChange} placeholder="e.g. CSM095" />
          </div>

          <div className="cgin-field">
            <label>Vendor Name</label>
            <input type="text" name="vendorName" value={form.vendorName} onChange={handleChange} placeholder="Enter vendor name" />
          </div>

          <div className="cgin-field">
            <label>Manufacturer Address</label>
            <input type="text" name="manufacturerAddress" value={form.manufacturerAddress} onChange={handleChange} placeholder="Enter address" />
          </div>

          <div className="cgin-field">
            <label>Vehicle Entry</label>
            <select name="vehicleEntry" value={form.vehicleEntry} onChange={handleChange}>
              <option>Inward</option>
              <option>Outward</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Manufacturer Code</label>
            <input type="text" name="manufacturerCode" value={form.manufacturerCode} onChange={handleChange} placeholder="Enter manufacturer code" />
          </div>

          <div className="cgin-field">
            <label>Manufacturer Name</label>
            <input type="text" name="manufacturerName" value={form.manufacturerName} onChange={handleChange} placeholder="Enter manufacturer name" />
          </div>

          <div className="cgin-field">
            <label>Vehicle No</label>
            <input type="text" name="vehicleNo" value={form.vehicleNo} onChange={handleChange} placeholder="Enter vehicle no" />
          </div>

          <div className="cgin-field">
            <label>Challan/Invoice No <span className="req">*</span></label>
            <input type="text" name="challanInvoiceNo" value={form.challanInvoiceNo} onChange={handleChange} placeholder="Enter challan/invoice no" className="inp-highlight" />
          </div>

          <div className="cgin-field">
            <label>Challan Date <span className="req">*</span></label>
            <input type="date" name="challanDate" value={form.challanDate} onChange={handleChange} className="inp-highlight" />
          </div>

          <div className="cgin-field">
            <label>Bill Date</label>
            <input type="date" name="billDate" value={form.billDate} onChange={handleChange} />
          </div>

          <div className="cgin-field">
            <label>E-Way Date</label>
            <input type="date" name="ewayDate" value={form.ewayDate} onChange={handleChange} />
          </div>

        </div>

        {/* ── REMARKS & COMMENTS ── */}
        <div className="cgin-full-width">
          <div className="cgin-field">
            <label>Remarks</label>
            <textarea rows="3" name="remarks" value={form.remarks} onChange={handleChange} placeholder="Enter remarks..." />
          </div>
          <div className="cgin-field">
            <label>Comments</label>
            <textarea rows="3" name="comments" value={form.comments} onChange={handleChange} placeholder="Enter comments..." />
          </div>
        </div>

        {/* ════════════════════════════════════════
            ITEMS GRID
        ════════════════════════════════════════ */}
        <div className="cgin-items-section">

          <div className="cgin-items-header">
            <span className="cgin-items-title">* Items</span>
            {anyChecked && (
              <button className="cgin-del-rows-btn" onClick={handleDeleteChecked}>
                Delete Selected
              </button>
            )}
          </div>

          <div className="cgin-items-table-wrap">
            <table className="cgin-items-table">
              <thead>
                <tr>
                  <th>S No</th>
                  <th>Insert Bags</th>
                  <th>Delete</th>
                  <th>Item Rate</th>
                  <th>Transaction No</th>
                  <th>Party Name</th>
                  <th>Broker</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>UOM</th>
                  <th>Sales Through</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx} className={row._checked ? "cgin-row-checked" : ""}>

                    {/* S No */}
                    <td className="cgin-sno-cell">{row.sNo}</td>

                    {/* Insert Bags */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input"
                        value={row.insertBags}
                        onChange={(e) => handleItemChange(idx, "insertBags", e.target.value)}
                        placeholder="Bags"
                      />
                    </td>

                    {/* Delete checkbox */}
                    <td className="cgin-check-cell">
                      <input
                        type="checkbox"
                        checked={row._checked}
                        onChange={(e) => handleItemCheck(idx, e.target.checked)}
                      />
                    </td>

                    {/* Item Rate */}
                    <td>
                      <input
                        type="number"
                        className="cgin-item-input cgin-item-num"
                        value={row.itemRate}
                        onChange={(e) => handleItemChange(idx, "itemRate", e.target.value)}
                        placeholder="0.00"
                      />
                    </td>

                    {/* Transaction No */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input"
                        value={row.transactionNo}
                        onChange={(e) => handleItemChange(idx, "transactionNo", e.target.value)}
                      />
                    </td>

                    {/* Party Name */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input cgin-item-wide"
                        value={row.partyName}
                        onChange={(e) => handleItemChange(idx, "partyName", e.target.value)}
                      />
                    </td>

                    {/* Broker */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input"
                        value={row.broker}
                        onChange={(e) => handleItemChange(idx, "broker", e.target.value)}
                      />
                    </td>

                    {/* Item Code */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input"
                        value={row.itemCode}
                        onChange={(e) => handleItemChange(idx, "itemCode", e.target.value)}
                      />
                    </td>

                    {/* Item Name */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input cgin-item-wide"
                        value={row.itemName}
                        onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                      />
                    </td>

                    {/* UOM */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input cgin-item-sm"
                        value={row.uom}
                        onChange={(e) => handleItemChange(idx, "uom", e.target.value)}
                        placeholder="MT"
                      />
                    </td>

                    {/* Sales Through */}
                    <td>
                      <input
                        type="text"
                        className="cgin-item-input"
                        value={row.salesThrough}
                        onChange={(e) => handleItemChange(idx, "salesThrough", e.target.value)}
                      />
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insert Row controls */}
          <div className="cgin-insert-row-bar">
            <input
              type="number"
              min="1"
              max="50"
              className="cgin-insert-count"
              value={insertCount}
              onChange={(e) => setInsertCount(e.target.value)}
            />
            <button className="cgin-insert-row-btn" onClick={handleInsertRows}>
              Insert Row
            </button>
          </div>

        </div>
        {/* end items section */}

        {/* ── ACTION BUTTONS ── */}
        <div className="cgin-actions">
          <button className="btn-cancel" onClick={() => navigate("/goods-inward-note")} disabled={loading}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateGIN;
