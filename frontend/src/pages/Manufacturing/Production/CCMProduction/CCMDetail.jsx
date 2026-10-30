import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./CCMProduction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/ccm-production`;

const statusColor = (s) => {
  if (s === "Open")   return { bg: "#dcfce7", fg: "#15803d" };
  if (s === "Draft")  return { bg: "#fef3c7", fg: "#b45309" };
  if (s === "Closed") return { bg: "#fee2e2", fg: "#b91c1c" };
  return { bg: "#f1f5f9", fg: "#64748b" };
};

const CCMDetail = () => {
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
        setData(d);
        setForm({ ...d });
      })
      .catch(() => { alert("Failed to load record"); navigate(-1); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
    if (!window.confirm("Delete this CCM record?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      navigate("/ccm-production");
    } catch { alert("Delete failed"); }
  };

  if (loading) return <div className="pod-page"><ModuleNavbar /><div className="pod-loading">Loading…</div></div>;
  if (!data)   return <div className="pod-page"><ModuleNavbar /><div className="pod-error">Record not found</div></div>;

  /* Field renderer — matches PODetails' pod-field / pod-label / pod-value / pod-input pattern */
  const F = ({ label, field, type, opts }) => (
    <div className="pod-field">
      <div className="pod-label">{label}</div>
      {editing && field !== "ccmNo" ? (
        opts ? (
          <select className="pod-input" name={field} value={form[field] || ""} onChange={handleChange}>
            {opts.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input className="pod-input" type={type || "text"} name={field} value={form[field] || ""} onChange={handleChange} />
        )
      ) : (
        <div className="pod-value">{data[field] || "-"}</div>
      )}
    </div>
  );

  const currentStatus = editing ? form.status : data.status;
  const sc = statusColor(currentStatus);

  return (
    <div className="pod-page">
      <ModuleNavbar />

      {/* PAGE HEADER */}
      <div className="pod-header">
        <button className="pod-back-btn" onClick={() => navigate("/ccm-production")}>← CCM List</button>
        <div className="pod-header-title">
          <h2>CCM Detail</h2>
          <span className="pod-pono-badge">{data.ccmNo}</span>
        </div>
        <div className="pod-header-meta">
          <span className="pod-status-pill" style={{ background: sc.bg, color: sc.fg }}>
            {currentStatus || "-"}
          </span>
        </div>
      </div>

      {/* ══════ HEADER CARD ══════ */}
      <div className="pod-card">
        <div className="pod-card-header">
          <div className="pod-card-title">📋 Header</div>
          <div className="pod-card-actions">
            {!editing ? (
              <>
                <button className="pod-edit-btn" onClick={() => setEditing(true)}>Edit</button>
                <button
                  onClick={handleDelete}
                  style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button className="pod-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button className="pod-cancel-btn" onClick={() => { setEditing(false); setForm({ ...data }); }} disabled={saving}>Cancel</button>
              </>
            )}
          </div>
        </div>

        <div className="pod-grid">
          <F label="Transaction Category" field="transactionCategory" />
          <F label="CCM No"     field="ccmNo" />
          <F label="Date"       field="ccmDate"   type="date" />
          <F label="Start Time" field="startTime" type="time" />
          <F label="End Time"   field="endTime"   type="time" />
          <F label="Shift"      field="shift"     opts={["A","B","C"]} />
          <F label="Heat No"    field="heatNo" />
          <F label="Furnace No" field="furnaceNo" />
          <F label="Operator"   field="operator" />
          <F label="Rolling PIC" field="rollingPIC" />
          <F label="Bypass PIC"  field="bypassPIC" />
          <F label="Status"     field="status"    opts={["Open","Draft","Closed"]} />
        </div>
        <div className="pod-field pod-field-full" style={{ marginTop: 10 }}>
          <div className="pod-label">Remarks</div>
          {editing
            ? <textarea className="pod-textarea" rows="2" name="remarks" value={form.remarks || ""} onChange={handleChange} />
            : <div className="pod-value">{data.remarks || "-"}</div>}
        </div>
      </div>

      {/* ══════ BILLET DETAILS ══════ */}
      <div className="pod-card">
        <div className="pod-card-header">
          <div className="pod-card-title">🧱 Rolled Billets — → Rolling</div>
        </div>
        <div className="pod-items-wrap">
          <table className="pod-items-table">
            <thead>
              <tr><th>S No</th><th>Start Time</th><th>End Time</th><th>Grade</th><th>Length</th><th>Qty (MT)</th></tr>
            </thead>
            <tbody>
              {(data.outputs || []).length > 0 ? (
                (data.outputs || []).map((r, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: "center", width: 36 }}>{r.sNo || i + 1}</td>
                    <td>{r.startTime || "-"}</td>
                    <td>{r.endTime || "-"}</td>
                    <td>{r.grade || "-"}</td>
                    <td>{r.billetSize || "-"}</td>
                    <td className="pod-amt-cell">{r.qty ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="pod-no-items">No rolled billet rows</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Total Rolling:</td>
                <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{data.totalBilletQty ?? 0} MT</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="pod-card">
        <div className="pod-card-header">
          <div className="pod-card-title">⏭️ Bypass Billets — → Dispatch</div>
          {data.bypassStatus && (
            <span className="pod-status-pill" style={data.bypassStatus === "Dispatched" ? { background: "#dcfce7", color: "#15803d" } : { background: "#fef3c7", color: "#b45309" }}>
              {data.bypassStatus}
            </span>
          )}
        </div>
        <div className="pod-items-wrap">
          <table className="pod-items-table">
            <thead>
              <tr><th>S No</th><th>Start Time</th><th>End Time</th><th>Grade</th><th>Length</th><th>Qty (MT)</th></tr>
            </thead>
            <tbody>
              {(data.bypass || []).length > 0 ? (
                (data.bypass || []).map((r, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: "center", width: 36 }}>{r.sNo || i + 1}</td>
                    <td>{r.startTime || "-"}</td>
                    <td>{r.endTime || "-"}</td>
                    <td>{r.grade || "-"}</td>
                    <td>{r.billetSize || "-"}</td>
                    <td className="pod-amt-cell">{r.qty ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="pod-no-items">No bypass billets for this entry — every billet went to Rolling.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5" style={{ textAlign: "right", fontWeight: 700, padding: "6px 10px", background: "#eef1f7", fontSize: 12 }}>Total Bypass:</td>
                <td style={{ fontWeight: 700, padding: "6px 8px", background: "#eef1f7", fontFamily: "monospace", color: "#1e40af" }}>{data.totalBypassQty ?? 0} MT</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ══════ TOTALS BAR ══════ */}
      <div className="pod-grand-total">
        <span style={{ marginRight: 24 }}>Total Rolling: <strong>{data.totalBilletQty ?? 0} MT</strong></span>
        <span>Total Bypass: <strong>{data.totalBypassQty ?? 0} MT</strong></span>
      </div>

      {/* ══════ INPUT MATERIALS (legacy — collected before Billet Details replaced it on Create) ══════ */}
      {(data.inputs || []).length > 0 && (
        <div className="pod-card">
          <div className="pod-card-header">
            <div className="pod-card-title">🔥 Input Materials</div>
          </div>
          <div className="pod-items-wrap">
            <table className="pod-items-table">
              <thead>
                <tr><th>S No</th><th>Material</th><th>Heat Qty (MT)</th><th>UOM</th></tr>
              </thead>
              <tbody>
                {data.inputs.map((r, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: "center", width: 36 }}>{r.sNo || i + 1}</td>
                    <td>{r.material || "-"}</td>
                    <td>{r.heatQty || "-"}</td>
                    <td>{r.uom || "MT"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════ LOSSES & YIELD (legacy — populated only for older entries) ══════ */}
      {(data.scrapQty || data.rejectionQty || data.yieldPct) ? (
        <div className="pod-card">
          <div className="pod-card-header">
            <div className="pod-card-title">📉 Losses & Yield</div>
          </div>
          <div className="pod-grid">
            {[
              { label: "Total Input (MT)",   val: data.inputQty },
              { label: "Scrap (MT)",         val: data.scrapQty },
              { label: "Rejection (MT)",     val: data.rejectionQty },
              { label: "Total Loss (MT)",    val: data.totalLossQty },
              { label: "Yield %",            val: data.yieldPct != null ? data.yieldPct + "%" : "-", highlight: true },
            ].map((f) => (
              <div className="pod-field" key={f.label}>
                <div className="pod-label">{f.label}</div>
                <div className="pod-value" style={f.highlight ? { color: parseFloat(f.val) >= 90 ? "#15803d" : "#dc2626", fontWeight: 700 } : undefined}>
                  {f.val != null ? f.val : "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CCMDetail;