import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RollingProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API   = `${API_URL}/api/rolling-production`;
const today = new Date().toISOString().split("T")[0];

const genRollingNo = () =>
  `ROLL/${new Date().getFullYear().toString().slice(-2)}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${Math.floor(100000 + Math.random() * 900000)}`;

const blankInput  = (sNo) => ({ sNo, billetCode: "", billetSize: "", qty: "", uom: "MT" });
const blankOutput = (sNo) => ({ sNo, productCode: "", productName: "", size: "", qty: "", uom: "MT" });

const BILLET_SIZES = ["100×100", "130×130", "150×150", "Other"];
const PRODUCT_SIZES = ["6mm", "8mm", "10mm", "12mm", "16mm", "20mm", "25mm", "32mm"];
const PRODUCTS = [
  { code: "TMT6",  name: "TMT 6mm"  },
  { code: "TMT8",  name: "TMT 8mm"  },
  { code: "TMT10", name: "TMT 10mm" },
  { code: "TMT12", name: "TMT 12mm" },
  { code: "TMT16", name: "TMT 16mm" },
  { code: "TMT20", name: "TMT 20mm" },
  { code: "TMT25", name: "TMT 25mm" },
  { code: "TMT32", name: "TMT 32mm" },
];

const CreateRollingProduction = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    rollingNo:   genRollingNo(),
    rollingDate: today,
    shift:       "A",
    site:        "Factory Office-GYPMART INDIA",
    millNo:      "",
    operator:    "",
    remarks:     "",
    status:      "Open",
  });

  const [inputs,  setInputs]  = useState([blankInput(1)]);
  const [outputs, setOutputs] = useState([blankOutput(1)]);
  const [losses,  setLosses]  = useState({ millScale: "", cropEnd: "", misroll: "", rejection: "" });

  /* Derived totals */
  const totalInput  = inputs.reduce((s, r)  => s + (parseFloat(r.qty)  || 0), 0);
  const totalOutput = outputs.reduce((s, r) => s + (parseFloat(r.qty)  || 0), 0);
  const totalLoss   = Object.values(losses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const yieldPct    = totalInput > 0 ? ((totalOutput / totalInput) * 100).toFixed(2) : "0.00";

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* Input rows */
  const setInputField  = (idx, field, val) => setInputs((p) => p.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addInputRow    = () => setInputs((p) => [...p, blankInput(p.length + 1)]);
  const removeInputRow = (idx) => setInputs((p) => p.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sNo: i + 1 })));

  /* Output rows */
  const setOutputField  = (idx, field, val) => {
    setOutputs((p) => p.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: val };
      if (field === "productCode") {
        const match = PRODUCTS.find((p) => p.code === val);
        if (match) {
          updated.productName = match.name;
          updated.size = match.name.replace("TMT ", "") || "";
        }
      }
      if (field === "productName") {
        const match = PRODUCTS.find((p) => p.name === val);
        if (match) { updated.productCode = match.code; updated.size = match.name.replace("TMT ", "") || ""; }
      }
      return updated;
    }));
  };
  const addOutputRow    = () => setOutputs((p) => [...p, blankOutput(p.length + 1)]);
  const removeOutputRow = (idx) => setOutputs((p) => p.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sNo: i + 1 })));

  const handleSave = async () => {
    if (!form.rollingNo.trim()) { alert("Rolling No is required"); return; }
    if (!inputs.some((r) => r.qty)) { alert("At least one input billet with qty is required"); return; }
    if (!outputs.some((r) => r.qty)) { alert("At least one output product with qty is required"); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        inputs:       inputs.filter((r) => r.qty),
        outputs:      outputs.filter((r) => r.qty),
        millScaleQty: parseFloat(losses.millScale)  || 0,
        cropEndQty:   parseFloat(losses.cropEnd)    || 0,
        misrollQty:   parseFloat(losses.misroll)    || 0,
        rejectionQty: parseFloat(losses.rejection)  || 0,
        totalLossQty: totalLoss,
        inputQty:     totalInput,
        outputQty:    totalOutput,
        yieldPct:     parseFloat(yieldPct),
      };
      const res = await axios.post(API, payload);
      if (res.data?.success) {
        alert("Rolling Production saved!");
        navigate("/rolling-production");
      } else {
        alert("Save failed: " + (res.data?.message || "Unknown"));
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally { setLoading(false); }
  };

  return (
    <div className="roll-page">
      <ModuleNavbar />

      <div className="roll-header">
        <div className="roll-header-left">
          <button className="roll-back-btn" onClick={() => navigate("/rolling-production")}>← Rolling List</button>
          <div>
            <h2>Create Rolling Entry</h2>
            <span className="roll-subtitle">Convert billets into finished TMT bars</span>
          </div>
        </div>
      </div>

      {/* HEADER FIELDS */}
      <div className="roll-card">
        <div className="roll-section-title">📋 Header Information</div>
        <div className="roll-form-grid">
          <div className="roll-field">
            <label>Rolling No <span style={{color:"red"}}>*</span></label>
            <input name="rollingNo" value={form.rollingNo} readOnly className="roll-readonly" />
          </div>
          <div className="roll-field">
            <label>Rolling Date <span style={{color:"red"}}>*</span></label>
            <input type="date" name="rollingDate" value={form.rollingDate} onChange={handleChange} />
          </div>
          <div className="roll-field">
            <label>Shift <span style={{color:"red"}}>*</span></label>
            <select name="shift" value={form.shift} onChange={handleChange}>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
          <div className="roll-field">
            <label>Mill No</label>
            <input name="millNo" value={form.millNo} onChange={handleChange} placeholder="e.g. M-01" />
          </div>
          <div className="roll-field">
            <label>Operator</label>
            <input name="operator" value={form.operator} onChange={handleChange} placeholder="Operator name" />
          </div>
          <div className="roll-field">
            <label>Site</label>
            <select name="site" value={form.site} onChange={handleChange}>
              <option>Factory Office-GYPMART INDIA</option>
            </select>
          </div>
          <div className="roll-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Open</option><option>Draft</option><option>Closed</option>
            </select>
          </div>
        </div>
        <div className="roll-field" style={{ marginTop: 12 }}>
          <label>Remarks</label>
          <textarea rows="2" name="remarks" value={form.remarks} onChange={handleChange} placeholder="Enter remarks…" />
        </div>
      </div>

      {/* INPUT BILLETS */}
      <div className="roll-card">
        <div className="roll-items-header">
          <span className="roll-section-title">🧱 Input Billets</span>
          <button className="roll-add-row" onClick={addInputRow}>+ Add Row</button>
        </div>
        <div className="roll-table-wrap">
          <table className="roll-table">
            <thead>
              <tr>
                <th style={{width:50}}>#</th>
                <th>Billet Code</th>
                <th>Billet Size</th>
                <th>Qty (MT)</th>
                <th>UOM</th>
                <th style={{width:50}}>Del</th>
              </tr>
            </thead>
            <tbody>
              {inputs.map((row, idx) => (
                <tr key={idx}>
                  <td className="roll-sno">{row.sNo}</td>
                  <td><input className="roll-item-inp" value={row.billetCode} onChange={(e) => setInputField(idx, "billetCode", e.target.value)} placeholder="B-001" /></td>
                  <td>
                    <select className="roll-item-inp" value={row.billetSize} onChange={(e) => setInputField(idx, "billetSize", e.target.value)}>
                      <option value="">-- Select --</option>
                      {BILLET_SIZES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><input type="number" className="roll-item-inp roll-item-num" value={row.qty} onChange={(e) => setInputField(idx, "qty", e.target.value)} placeholder="0" min="0" step="0.001" /></td>
                  <td><input className="roll-item-inp" value={row.uom} onChange={(e) => setInputField(idx, "uom", e.target.value)} style={{width:60}} /></td>
                  <td><button className="roll-rm-row" onClick={() => removeInputRow(idx)}>✕</button></td>
                </tr>
              ))}
              <tr className="roll-total-row">
                <td colSpan={3}><strong>Total Input</strong></td>
                <td><strong>{totalInput.toFixed(3)} MT</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* OUTPUT PRODUCTS */}
      <div className="roll-card">
        <div className="roll-items-header">
          <span className="roll-section-title">🏗️ Output Products</span>
          <button className="roll-add-row" onClick={addOutputRow}>+ Add Row</button>
        </div>
        <div className="roll-table-wrap">
          <table className="roll-table">
            <thead>
              <tr>
                <th style={{width:50}}>#</th>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Size</th>
                <th>Qty (MT)</th>
                <th>UOM</th>
                <th style={{width:50}}>Del</th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((row, idx) => (
                <tr key={idx}>
                  <td className="roll-sno">{row.sNo}</td>
                  <td>
                    <select className="roll-item-inp" value={row.productCode} onChange={(e) => setOutputField(idx, "productCode", e.target.value)}>
                      <option value="">-- Select --</option>
                      {PRODUCTS.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="roll-item-inp" value={row.productName} onChange={(e) => setOutputField(idx, "productName", e.target.value)}>
                      <option value="">-- Select --</option>
                      {PRODUCTS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </td>
                  <td><input className="roll-item-inp" value={row.size} onChange={(e) => setOutputField(idx, "size", e.target.value)} placeholder="e.g. 8mm" style={{width:80}} /></td>
                  <td><input type="number" className="roll-item-inp roll-item-num" value={row.qty} onChange={(e) => setOutputField(idx, "qty", e.target.value)} placeholder="0" min="0" step="0.001" /></td>
                  <td><input className="roll-item-inp" value={row.uom} onChange={(e) => setOutputField(idx, "uom", e.target.value)} style={{width:60}} /></td>
                  <td><button className="roll-rm-row" onClick={() => removeOutputRow(idx)}>✕</button></td>
                </tr>
              ))}
              <tr className="roll-total-row">
                <td colSpan={4}><strong>Total Output</strong></td>
                <td><strong>{totalOutput.toFixed(3)} MT</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* LOSSES & YIELD */}
      <div className="roll-card">
        <div className="roll-section-title">📉 Production Losses & Yield</div>
        <div className="roll-loss-grid">
          {[
            { label: "Mill Scale (MT)",  key: "millScale" },
            { label: "Crop End (MT)",    key: "cropEnd"   },
            { label: "Misroll (MT)",     key: "misroll"   },
            { label: "Rejection (MT)",   key: "rejection" },
          ].map((l) => (
            <div className="roll-field" key={l.key}>
              <label>{l.label}</label>
              <input type="number" value={losses[l.key]}
                onChange={(e) => setLosses((p) => ({ ...p, [l.key]: e.target.value }))}
                placeholder="0" min="0" step="0.001" />
            </div>
          ))}
          <div className="roll-field">
            <label>Total Loss (MT)</label>
            <div className="roll-readonly">{totalLoss.toFixed(3)}</div>
          </div>
          <div className="roll-field">
            <label>Yield %</label>
            <div className={`roll-readonly ${parseFloat(yieldPct) >= 90 ? "roll-yield-good" : "roll-yield-warn"}`}>
              {yieldPct}%
            </div>
          </div>
        </div>
        <div className="roll-inventory-note">
          <strong>Inventory Effect:</strong>
          <span className="roll-inv-down">↓ Billet Stock reduced</span>
          <span className="roll-inv-up">↑ Finished Goods added</span>
          <span className="roll-inv-up">↑ Mill Scale added</span>
          <span className="roll-inv-up">↑ Scrap added</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="roll-actions">
        <button className="roll-cancel-btn" onClick={() => navigate("/rolling-production")} disabled={loading}>Cancel</button>
        <button className="roll-save-btn" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save Rolling Entry"}
        </button>
      </div>
    </div>
  );
};

export default CreateRollingProduction;