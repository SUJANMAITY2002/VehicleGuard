import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./Heat.css";

const FURNACES    = ["F1", "F2", "F3", "F4"];
const FURNACE_NOS = ["1", "2"];
const QUALITY_KEYS = ["c", "si", "mn", "s", "p"];

const computeTotalTime = (start, end) => {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const HeatDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [heat, setHeat]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState(null);
  const [file, setFile]         = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchHeat = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/heats/${id}`);
      setHeat(res.data);
      setForm({
        furnace: res.data.furnace,
        furnaceNo: res.data.furnaceNo,
        startTime: res.data.startTime,
        endTime: res.data.endTime,
        currentConsume: res.data.currentConsume,
        weight: res.data.weight,
        c: res.data.quality?.c,
        si: res.data.quality?.si,
        mn: res.data.quality?.mn,
        s: res.data.quality?.s,
        p: res.data.quality?.p,
        remarks: res.data.remarks || "",
      });
    } catch (err) {
      setError("Failed to load Heat details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHeat(); }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("attachment", file);
      const res = await axios.put(`${API_URL}/api/heats/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setHeat(res.data);
      setEditing(false);
      setFile(null);
      alert("Heat updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Error updating Heat");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFile(null);
    fetchHeat();
  };

  if (loading) return <div className="heat-loading">Loading…</div>;
  if (error)   return <div className="heat-error">{error}</div>;
  if (!heat)   return null;

  const totalTime = editing ? computeTotalTime(form.startTime, form.endTime) : heat.totalTime;

  return (
    <div className="heat-page">
      <ModuleNavbar />

      {/* PAGE HEADER */}
      <div className="heat-cgin-header">
        <div className="heat-cgin-header-left">
          <button className="heat-back-btn" onClick={() => navigate("/heat")}>←</button>
          <h2>Heat Details</h2>
          <span className="heat-no-badge">{heat.heatNo}</span>
        </div>
        <div className="heat-cgin-header-actions">
          {!editing ? (
            <button className="heat-edit-btn" onClick={() => setEditing(true)}>Edit</button>
          ) : (
            <>
              <button className="heat-save-btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button className="heat-cancel-btn" onClick={handleCancel} disabled={isSaving}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {/* ══════ HEAT ENTRY ══════ */}
      <div className="heat-cgin-card">

        {/* Heat No */}
        <div className="heat-section-title">Heat No</div>
        <div className="heat-grid">
          <div className="heat-form-field heat-form-field-wide">
            <label>Heat No</label>
            <div className="heat-value" style={{ fontWeight: 700, color: "#1d4ed8", fontFamily: "monospace" }}>
              {heat.heatNo}
            </div>
          </div>
        </div>

        {/* Heat Entry */}
        <div className="heat-section-title">Heat Entry</div>
        <div className="heat-grid">

          <div className="heat-form-field">
            <label>Furnace</label>
            {editing ? (
              <select name="furnace" value={form.furnace} onChange={handleChange}>
                {FURNACES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            ) : <div className="heat-value">{heat.furnace}</div>}
          </div>

          <div className="heat-form-field">
            <label>Furnace No</label>
            {editing ? (
              <select name="furnaceNo" value={form.furnaceNo} onChange={handleChange}>
                {FURNACE_NOS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : <div className="heat-value">{heat.furnaceNo}</div>}
          </div>

          <div className="heat-form-field">
            <label>Start Time</label>
            {editing
              ? <input type="time" name="startTime" value={form.startTime} onChange={handleChange} />
              : <div className="heat-value">{heat.startTime}</div>}
          </div>

          <div className="heat-form-field">
            <label>End Time</label>
            {editing
              ? <input type="time" name="endTime" value={form.endTime} onChange={handleChange} />
              : <div className="heat-value">{heat.endTime}</div>}
          </div>

          <div className="heat-form-field">
            <label>Total Time</label>
            <div className="heat-value">{totalTime}</div>
          </div>

          <div className="heat-form-field">
            <label>Current Consume</label>
            {editing
              ? <input type="number" name="currentConsume" value={form.currentConsume} onChange={handleChange} />
              : <div className="heat-value">{heat.currentConsume}</div>}
          </div>

          <div className="heat-form-field">
            <label>Weight</label>
            {editing
              ? <input type="number" name="weight" value={form.weight} onChange={handleChange} />
              : <div className="heat-value">{heat.weight}</div>}
          </div>

        </div>

        {/* Quality */}
        <div className="heat-section-title">Quality</div>
        <div className="heat-grid">
          {QUALITY_KEYS.map((k) => (
            <div className="heat-form-field" key={k}>
              <label>{k.charAt(0).toUpperCase() + k.slice(1)}</label>
              {editing
                ? <input type="number" step="0.01" name={k} value={form[k]} onChange={handleChange} />
                : <div className="heat-value">{heat.quality?.[k]}</div>}
            </div>
          ))}
        </div>

        {/* Attachment & Remarks */}
        <div className="heat-section-title">Attachment &amp; Remarks</div>
        <div className="heat-grid">
          <div className="heat-form-field">
            <label>Attach File</label>
            {editing ? (
              <input type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
            ) : heat.attachment?.filePath ? (
              <a href={`${API_URL}${heat.attachment.filePath}`} target="_blank" rel="noreferrer">
                {heat.attachment.fileName || "View File"}
              </a>
            ) : (
              <div className="heat-value">-</div>
            )}
          </div>

          <div className="heat-form-field heat-form-field-wide">
            <label>Remarks</label>
            {editing
              ? <input type="text" name="remarks" value={form.remarks} onChange={handleChange} />
              : <div className="heat-value">{heat.remarks || "-"}</div>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HeatDetail;