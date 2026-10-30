import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./RollingProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/rolling-production`;

const RollingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    axios.get(`${API}/${id}`)
      .then((r) => {
        const d = r.data?.data || r.data;
        setData(d); setForm({ ...d });
      })
      .catch(() => { alert("Failed to load record"); navigate(-1); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/${id}`, form);
      if (res.data?.success) {
        setData(res.data.data);
        setForm({ ...res.data.data });
        setEditing(false);
        alert("Saved successfully!");
      }
    } catch (err) { alert("Save failed: " + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this rolling record?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      navigate("/rolling-production");
    } catch { alert("Delete failed"); }
  };

  if (loading) return <div style={{padding:30}}>Loading…</div>;
  if (!data)   return <div style={{padding:30}}>Record not found</div>;

  const F = ({ label, field, type, opts }) => (
    <div className="roll-field">
      <label>{label}</label>
      {editing && field !== "rollingNo" ? (
        opts
          ? <select name={field} value={form[field] || ""} onChange={handleChange}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
          : <input type={type || "text"} name={field} value={form[field] || ""} onChange={handleChange} />
      ) : (
        <div className="roll-readonly">{data[field] || "-"}</div>
      )}
    </div>
  );

  return (
    <div className="roll-page">
      <ModuleNavbar />

      <div className="roll-header">
        <div className="roll-header-left">
          <button className="roll-back-btn" onClick={() => navigate("/rolling-production")}>← Rolling List</button>
          <div>
            <h2>Rolling Detail</h2>
            <span style={{fontWeight:700, marginLeft:8}}>{data.rollingNo}</span>
            <span className={`roll-status-badge ${(data.status || "").toLowerCase()}`} style={{marginLeft:8}}>{data.status}</span>
          </div>
        </div>
        <div style={{display:"flex", gap:10}}>
          {!editing ? (
            <>
              <button className="roll-edit-btn" style={{padding:"10px 18px"}} onClick={() => setEditing(true)}>Edit</button>
              <button className="roll-del-btn"  style={{padding:"10px 18px"}} onClick={handleDelete}>Delete</button>
            </>
          ) : (
            <>
              <button className="roll-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <button className="roll-cancel-btn" onClick={() => { setEditing(false); setForm({ ...data }); }}>Cancel</button>
            </>
          )}
        </div>
      </div>

      <div className="roll-card">
        <div className="roll-section-title">📋 Header</div>
        <div className="roll-form-grid">
          <F label="Rolling No"   field="rollingNo" />
          <F label="Date"         field="rollingDate" type="date" />
          <F label="Shift"        field="shift"       opts={["A","B","C"]} />
          <F label="Mill No"      field="millNo" />
          <F label="Operator"     field="operator" />
          <F label="Site"         field="site" />
          <F label="Status"       field="status"      opts={["Open","Draft","Closed"]} />
        </div>
        <div className="roll-field" style={{marginTop:12}}>
          <label>Remarks</label>
          {editing
            ? <textarea rows="2" name="remarks" value={form.remarks || ""} onChange={handleChange} />
            : <div className="roll-readonly">{data.remarks || "-"}</div>}
        </div>
      </div>

      {/* Input Billets */}
      <div className="roll-card">
        <div className="roll-section-title">🧱 Input Billets</div>
        <div className="roll-table-wrap">
          <table className="roll-table">
            <thead><tr><th>#</th><th>Billet Code</th><th>Billet Size</th><th>Qty (MT)</th><th>UOM</th></tr></thead>
            <tbody>
              {(data.inputs || []).map((r, i) => (
                <tr key={i}>
                  <td>{r.sNo || i + 1}</td>
                  <td>{r.billetCode || "-"}</td>
                  <td>{r.billetSize || "-"}</td>
                  <td>{r.qty || "-"}</td>
                  <td>{r.uom || "MT"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Output Products */}
      <div className="roll-card">
        <div className="roll-section-title">🏗️ Output Products</div>
        <div className="roll-table-wrap">
          <table className="roll-table">
            <thead><tr><th>#</th><th>Product Code</th><th>Product Name</th><th>Size</th><th>Qty (MT)</th></tr></thead>
            <tbody>
              {(data.outputs || []).map((r, i) => (
                <tr key={i}>
                  <td>{r.sNo || i + 1}</td>
                  <td>{r.productCode || "-"}</td>
                  <td>{r.productName || "-"}</td>
                  <td>{r.size || "-"}</td>
                  <td>{r.qty || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Losses & Yield */}
      <div className="roll-card">
        <div className="roll-section-title">📉 Losses & Yield</div>
        <div className="roll-loss-grid">
          {[
            { label: "Input (MT)",      val: data.inputQty },
            { label: "Output (MT)",     val: data.outputQty },
            { label: "Mill Scale (MT)", val: data.millScaleQty },
            { label: "Crop End (MT)",   val: data.cropEndQty },
            { label: "Misroll (MT)",    val: data.misrollQty },
            { label: "Rejection (MT)",  val: data.rejectionQty },
            { label: "Total Loss (MT)", val: data.totalLossQty },
            { label: "Yield %",         val: data.yieldPct != null ? data.yieldPct + "%" : "-", highlight: true },
          ].map((f) => (
            <div className="roll-field" key={f.label}>
              <label>{f.label}</label>
              <div className={`roll-readonly ${f.highlight ? (parseFloat(f.val) >= 90 ? "roll-yield-good" : "roll-yield-warn") : ""}`}>
                {f.val != null ? f.val : "-"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RollingDetail;