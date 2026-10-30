import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./BundlingProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/bundling-production`;

const BundlingDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    axios.get(`${API}/${id}`)
      .then((r) => { const d = r.data?.data || r.data; setData(d); setForm({ ...d }); })
      .catch(() => { alert("Failed to load record"); navigate(-1); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/${id}`, form);
      if (res.data?.success) { setData(res.data.data); setForm({ ...res.data.data }); setEditing(false); alert("Saved!"); }
    } catch (err) { alert("Save failed: " + (err.response?.data?.message || err.message)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this bundling record?")) return;
    try { await axios.delete(`${API}/${id}`); navigate("/bundling-production"); }
    catch { alert("Delete failed"); }
  };

  if (loading) return <div style={{padding:30}}>Loading…</div>;
  if (!data)   return <div style={{padding:30}}>Record not found</div>;

  const F = ({ label, field, type, opts }) => (
    <div className="bun-field">
      <label>{label}</label>
      {editing && field !== "bundleEntryNo" ? (
        opts
          ? <select name={field} value={form[field] || ""} onChange={handleChange}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
          : <input type={type || "text"} name={field} value={form[field] || ""} onChange={handleChange} />
      ) : (
        <div className="bun-readonly">{data[field] || "-"}</div>
      )}
    </div>
  );

  return (
    <div className="bun-page">
      <ModuleNavbar />

      <div className="bun-header">
        <div className="bun-header-left">
          <button className="bun-back-btn" onClick={() => navigate("/bundling-production")}>← Bundle List</button>
          <div>
            <h2>Bundling Detail</h2>
            <span style={{fontWeight:700, marginLeft:8}}>{data.bundleEntryNo}</span>
            <span className={`bun-status-badge ${(data.status || "").toLowerCase()}`} style={{marginLeft:8}}>{data.status}</span>
          </div>
        </div>
        <div style={{display:"flex", gap:10}}>
          {!editing ? (
            <>
              <button className="bun-edit-btn" style={{padding:"10px 18px"}} onClick={() => setEditing(true)}>Edit</button>
              <button className="bun-del-btn"  style={{padding:"10px 18px"}} onClick={handleDelete}>Delete</button>
            </>
          ) : (
            <>
              <button className="bun-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <button className="bun-cancel-btn" onClick={() => { setEditing(false); setForm({ ...data }); }}>Cancel</button>
            </>
          )}
        </div>
      </div>

      <div className="bun-card">
        <div className="bun-section-title">📋 Header</div>
        <div className="bun-form-grid">
          <F label="Bundle Entry No" field="bundleEntryNo" />
          <F label="Date"            field="bundleDate"    type="date" />
          <F label="Shift"           field="shift"         opts={["A","B","C"]} />
          <F label="Operator"        field="operator" />
          <F label="Site"            field="site" />
          <F label="Status"          field="status"        opts={["Open","Draft","Closed"]} />
        </div>
      </div>

      {/* Summary */}
      <div className="bun-card">
        <div className="bun-section-title">📊 Summary</div>
        <div className="bun-summary-grid">
          <div className="bun-stat-card"><div className="bun-stat-val">{data.totalBundleCount || 0}</div><div className="bun-stat-label">Total Bundles</div></div>
          <div className="bun-stat-card"><div className="bun-stat-val">{data.totalBundleWt || 0}</div><div className="bun-stat-label">Bundle Weight (KG)</div></div>
          <div className="bun-stat-card"><div className="bun-stat-val">{data.totalPieces || 0}</div><div className="bun-stat-label">Total Pieces</div></div>
          <div className="bun-stat-card"><div className="bun-stat-val">{data.totalLooseQty || 0}</div><div className="bun-stat-label">Loose Input (MT)</div></div>
        </div>
      </div>

      {/* Input */}
      <div className="bun-card">
        <div className="bun-section-title">📦 Input — Loose Finished Goods</div>
        <div className="bun-table-wrap">
          <table className="bun-table">
            <thead><tr><th>#</th><th>Product</th><th>Loose Qty (MT)</th><th>UOM</th></tr></thead>
            <tbody>
              {(data.inputs || []).map((r, i) => (
                <tr key={i}>
                  <td>{r.sNo || i + 1}</td>
                  <td>{r.product || "-"}</td>
                  <td>{r.looseQty || "-"}</td>
                  <td>{r.uom || "MT"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bundles */}
      <div className="bun-card">
        <div className="bun-section-title">🎁 Bundle List</div>
        <div className="bun-table-wrap">
          <table className="bun-table">
            <thead><tr><th>#</th><th>Bundle No</th><th>Bundle Weight (KG)</th><th>Pieces</th><th>Tag No</th><th>Type</th><th>Customer Spec</th><th>Status</th></tr></thead>
            <tbody>
              {(data.bundles || []).map((r, i) => (
                <tr key={i}>
                  <td>{r.sNo || i + 1}</td>
                  <td><strong>{r.bundleNo || "-"}</strong></td>
                  <td>{r.bundleWeight || "-"}</td>
                  <td>{r.pieces || "-"}</td>
                  <td>{r.tagNumber || "-"}</td>
                  <td>{r.bundleType || "-"}</td>
                  <td>{r.customerSpec || "-"}</td>
                  <td><span className={`bun-status-badge ${(r.bundleStatus || "").toLowerCase()}`}>{r.bundleStatus || "-"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BundlingDetail;