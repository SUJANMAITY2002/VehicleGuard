import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./BundlingProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API   = `${API_URL}/api/bundling-production`;
const today = new Date().toISOString().split("T")[0];

const genBundleEntryNo = () =>
  `BND-ENTRY/${new Date().getFullYear().toString().slice(-2)}-${(new Date().getFullYear() + 1).toString().slice(-2)}/${Math.floor(100000 + Math.random() * 900000)}`;

const genBundleNo = (idx) =>
  `BND${String(idx + 1).padStart(4, "0")}`;

const blankInput  = (sNo) => ({ sNo, product: "", looseQty: "", uom: "MT" });
const blankBundle = (sNo) => ({
  sNo, bundleNo: genBundleNo(sNo - 1),
  bundleWeight: "", pieces: "", tagNumber: "", bundleType: "Standard",
  customerSpec: "", bundleStatus: "Ready",
});

const PRODUCTS = ["TMT 6mm","TMT 8mm","TMT 10mm","TMT 12mm","TMT 16mm","TMT 20mm","TMT 25mm","TMT 32mm"];

const CreateBundlingProduction = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    bundleEntryNo: genBundleEntryNo(),
    bundleDate:    today,
    shift:         "A",
    site:          "Factory Office-GYPMART INDIA",
    operator:      "",
    remarks:       "",
    status:        "Open",
  });

  const [inputs,  setInputs]  = useState([blankInput(1)]);
  const [bundles, setBundles] = useState([blankBundle(1)]);

  /* Derived totals */
  const totalLooseQty   = inputs.reduce((s, r)  => s + (parseFloat(r.looseQty)     || 0), 0);
  const totalBundleWt   = bundles.reduce((s, r) => s + (parseFloat(r.bundleWeight) || 0), 0);
  const totalPieces     = bundles.reduce((s, r) => s + (parseInt(r.pieces)         || 0), 0);
  const totalBundleCount = bundles.length;

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  /* Input rows */
  const setInputField  = (idx, field, val) => setInputs((p)  => p.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addInputRow    = () => setInputs((p)  => [...p,  blankInput(p.length + 1)]);
  const removeInputRow = (idx) => setInputs((p)  => p.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sNo: i + 1 })));

  /* Bundle rows */
  const setBundleField   = (idx, field, val) => setBundles((p) => p.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addBundleRow     = () => setBundles((p) => [...p, blankBundle(p.length + 1)]);
  const removeBundleRow  = (idx) => setBundles((p) => p.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sNo: i + 1 })));

  const handleSave = async () => {
    if (!inputs.some((r) => r.product && r.looseQty)) {
      alert("At least one input product with quantity is required"); return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        inputs:           inputs.filter((r) => r.looseQty),
        bundles:          bundles.filter((r) => r.bundleWeight),
        totalLooseQty,
        totalBundleWt,
        totalPieces,
        totalBundleCount,
      };
      const res = await axios.post(API, payload);
      if (res.data?.success) {
        alert("Bundling Production saved!");
        navigate("/bundling-production");
      } else {
        alert("Save failed: " + (res.data?.message || "Unknown"));
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally { setLoading(false); }
  };

  return (
    <div className="bun-page">
      <ModuleNavbar />

      <div className="bun-header">
        <div className="bun-header-left">
          <button className="bun-back-btn" onClick={() => navigate("/bundling-production")}>← Bundle List</button>
          <div>
            <h2>Create Bundle Entry</h2>
            <span className="bun-subtitle">Convert loose bars into saleable bundles</span>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="bun-card">
        <div className="bun-section-title">📋 Header Information</div>
        <div className="bun-form-grid">
          <div className="bun-field">
            <label>Bundle Entry No <span style={{color:"red"}}>*</span></label>
            <input name="bundleEntryNo" value={form.bundleEntryNo} readOnly className="bun-readonly" />
          </div>
          <div className="bun-field">
            <label>Bundle Date <span style={{color:"red"}}>*</span></label>
            <input type="date" name="bundleDate" value={form.bundleDate} onChange={handleChange} />
          </div>
          <div className="bun-field">
            <label>Shift</label>
            <select name="shift" value={form.shift} onChange={handleChange}>
              <option>A</option><option>B</option><option>C</option>
            </select>
          </div>
          <div className="bun-field">
            <label>Operator</label>
            <input name="operator" value={form.operator} onChange={handleChange} placeholder="Operator name" />
          </div>
          <div className="bun-field">
            <label>Site</label>
            <select name="site" value={form.site} onChange={handleChange}>
              <option>Factory Office-GYPMART INDIA</option>
            </select>
          </div>
          <div className="bun-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Open</option><option>Draft</option><option>Closed</option>
            </select>
          </div>
        </div>
        <div className="bun-field" style={{marginTop:12}}>
          <label>Remarks</label>
          <textarea rows="2" name="remarks" value={form.remarks} onChange={handleChange} placeholder="Enter remarks…" />
        </div>
      </div>

      {/* INPUT (LOOSE) */}
      <div className="bun-card">
        <div className="bun-items-header">
          <span className="bun-section-title">📦 Input — Loose Finished Goods</span>
          <button className="bun-add-row" onClick={addInputRow}>+ Add Row</button>
        </div>
        <div className="bun-table-wrap">
          <table className="bun-table">
            <thead>
              <tr>
                <th style={{width:50}}>#</th>
                <th>Product</th>
                <th>Loose Qty (MT)</th>
                <th>UOM</th>
                <th style={{width:50}}>Del</th>
              </tr>
            </thead>
            <tbody>
              {inputs.map((row, idx) => (
                <tr key={idx}>
                  <td className="bun-sno">{row.sNo}</td>
                  <td>
                    <select className="bun-item-inp" value={row.product} onChange={(e) => setInputField(idx, "product", e.target.value)}>
                      <option value="">-- Select --</option>
                      {PRODUCTS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td><input type="number" className="bun-item-inp bun-item-num" value={row.looseQty} onChange={(e) => setInputField(idx, "looseQty", e.target.value)} placeholder="0" min="0" step="0.001" /></td>
                  <td><input className="bun-item-inp" value={row.uom} onChange={(e) => setInputField(idx, "uom", e.target.value)} style={{width:60}} /></td>
                  <td><button className="bun-rm-row" onClick={() => removeInputRow(idx)}>✕</button></td>
                </tr>
              ))}
              <tr className="bun-total-row">
                <td colSpan={2}><strong>Total Loose</strong></td>
                <td><strong>{totalLooseQty.toFixed(3)} MT</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* BUNDLE OUTPUT */}
      <div className="bun-card">
        <div className="bun-items-header">
          <span className="bun-section-title">🎁 Bundle Output</span>
          <button className="bun-add-row" onClick={addBundleRow}>+ Add Row</button>
        </div>
        <div className="bun-table-wrap">
          <table className="bun-table">
            <thead>
              <tr>
                <th style={{width:50}}>#</th>
                <th>Bundle No</th>
                <th>Bundle Weight (KG)</th>
                <th>Pieces</th>
                <th>Tag Number</th>
                <th>Bundle Type</th>
                <th>Customer Spec</th>
                <th>Bundle Status</th>
                <th style={{width:50}}>Del</th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((row, idx) => (
                <tr key={idx}>
                  <td className="bun-sno">{row.sNo}</td>
                  <td><input className="bun-item-inp" value={row.bundleNo} onChange={(e) => setBundleField(idx, "bundleNo", e.target.value)} /></td>
                  <td><input type="number" className="bun-item-inp bun-item-num" value={row.bundleWeight} onChange={(e) => setBundleField(idx, "bundleWeight", e.target.value)} placeholder="0" min="0" step="0.1" /></td>
                  <td><input type="number" className="bun-item-inp bun-item-num" value={row.pieces} onChange={(e) => setBundleField(idx, "pieces", e.target.value)} placeholder="0" min="0" /></td>
                  <td><input className="bun-item-inp" value={row.tagNumber} onChange={(e) => setBundleField(idx, "tagNumber", e.target.value)} placeholder="TAG-001" /></td>
                  <td>
                    <select className="bun-item-inp" value={row.bundleType} onChange={(e) => setBundleField(idx, "bundleType", e.target.value)}>
                      <option>Standard</option><option>Export</option><option>Custom</option>
                    </select>
                  </td>
                  <td><input className="bun-item-inp" value={row.customerSpec} onChange={(e) => setBundleField(idx, "customerSpec", e.target.value)} placeholder="e.g. CUT-LENGTH" /></td>
                  <td>
                    <select className="bun-item-inp" value={row.bundleStatus} onChange={(e) => setBundleField(idx, "bundleStatus", e.target.value)}>
                      <option>Ready</option><option>Dispatched</option><option>Hold</option>
                    </select>
                  </td>
                  <td><button className="bun-rm-row" onClick={() => removeBundleRow(idx)}>✕</button></td>
                </tr>
              ))}
              <tr className="bun-total-row">
                <td colSpan={2}><strong>Totals</strong></td>
                <td><strong>{totalBundleWt.toFixed(1)} KG</strong></td>
                <td><strong>{totalPieces} pcs</strong></td>
                <td colSpan={5}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bun-summary-grid" style={{marginTop:16}}>
          <div className="bun-stat-card">
            <div className="bun-stat-val">{totalBundleCount}</div>
            <div className="bun-stat-label">Total Bundles</div>
          </div>
          <div className="bun-stat-card">
            <div className="bun-stat-val">{totalBundleWt.toFixed(1)}</div>
            <div className="bun-stat-label">Total Weight (KG)</div>
          </div>
          <div className="bun-stat-card">
            <div className="bun-stat-val">{totalPieces}</div>
            <div className="bun-stat-label">Total Pieces</div>
          </div>
          <div className="bun-stat-card">
            <div className="bun-stat-val">{totalLooseQty.toFixed(3)}</div>
            <div className="bun-stat-label">Loose Input (MT)</div>
          </div>
        </div>

        <div className="bun-inventory-note">
          <strong>Inventory Effect:</strong>
          <span className="bun-inv-down">↓ Loose Finished Goods reduced</span>
          <span className="bun-inv-up">↑ Bundle Stock added</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="bun-actions">
        <button className="bun-cancel-btn" onClick={() => navigate("/bundling-production")} disabled={loading}>Cancel</button>
        <button className="bun-save-btn" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save Bundle Entry"}
        </button>
      </div>
    </div>
  );
};

export default CreateBundlingProduction;