import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./Heat.css";

const FURNACES    = ["F1", "F2", "F3", "F4"];
const FURNACE_NOS = ["1", "2"];

const computeTotalTime = (start, end) => {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // crosses midnight
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const blankForm = {
  furnace: "", furnaceNo: "",
  startTime: "", endTime: "",
  currentConsume: "", weight: "",
  c: "", si: "", mn: "", s: "", p: "",
  remarks: "",
};

const CreateHeat = () => {
  const navigate = useNavigate();

  const [heatNoPreview, setHeatNoPreview] = useState("");
  const [form, setForm] = useState(blankForm);
  const [file, setFile] = useState(null);

  /* guard against duplicate creation from rapid/double clicks on Save */
  const isSavingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalTime = computeTotalTime(form.startTime, form.endTime);

  /* preview the Heat No whenever Furnace / Furnace No changes.
     This is a PREVIEW ONLY — the server assigns the real number,
     atomically, at the moment the heat is saved. */
  useEffect(() => {
    if (!form.furnace || !form.furnaceNo) { setHeatNoPreview(""); return; }
    axios
      .get(`${API_URL}/api/heats/next-heat-no`, {
        params: { furnace: form.furnace, furnaceNo: form.furnaceNo },
      })
      .then((res) => setHeatNoPreview(res.data.heatNo))
      .catch(() => setHeatNoPreview(""));
  }, [form.furnace, form.furnaceNo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (isSavingRef.current) return;
    if (!form.furnace)   return alert("Furnace is required.");
    if (!form.furnaceNo) return alert("Furnace No is required.");
    if (!form.startTime) return alert("Start Time is required.");
    if (!form.endTime)   return alert("End Time is required.");

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("attachment", file);

      await axios.post(`${API_URL}/api/heats`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Heat saved successfully!");
      navigate("/heat");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error saving Heat");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm(blankForm);
    setFile(null);
  };

  return (
    <div className="heat-page">
      <ModuleNavbar />

      {/* PAGE HEADER */}
      <div className="heat-cgin-header">
        <div className="heat-cgin-header-left">
          <button className="heat-back-btn" onClick={() => navigate("/heat")}>←</button>
          <h2>Create Heat</h2>
        </div>
      </div>

      {/* ══════ HEAT ENTRY FORM ══════ */}
      <div className="heat-cgin-card">

        {/* Heat No — first entity, auto-generated preview */}
        <div className="heat-section-title">Heat No</div>
        <div className="heat-grid">
          <div className="heat-form-field heat-form-field-wide">
            <label>Heat No (Auto)</label>
            <input
              type="text"
              readOnly
              value={!form.furnace || !form.furnaceNo ? "Select furnace…" : (heatNoPreview || "Generating…")}
              style={{ background: "#f1f5f9", fontWeight: 700, color: "#15803d" }}
            />
          </div>
        </div>

        {/* Heat Entry — Furnace, Furnace No, Start/End/Total Time, Consume, Weight */}
        <div className="heat-section-title">Heat Entry</div>
        <div className="heat-grid">

          <div className="heat-form-field">
            <label>* Furnace</label>
            <select name="furnace" value={form.furnace} onChange={handleChange}>
              <option value="">- Select -</option>
              {FURNACES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="heat-form-field">
            <label>* Furnace No</label>
            <select name="furnaceNo" value={form.furnaceNo} onChange={handleChange}>
              <option value="">- Select -</option>
              {FURNACE_NOS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="heat-form-field">
            <label>* Start Time</label>
            <input type="time" name="startTime" value={form.startTime} onChange={handleChange} />
          </div>

          <div className="heat-form-field">
            <label>* End Time</label>
            <input type="time" name="endTime" value={form.endTime} onChange={handleChange} />
          </div>

          <div className="heat-form-field">
            <label>Total Time</label>
            <input type="text" value={totalTime} readOnly style={{ background: "#f1f5f9", fontWeight: 600 }} />
          </div>

          <div className="heat-form-field">
            <label>Current Consume</label>
            <input type="number" name="currentConsume" value={form.currentConsume} onChange={handleChange} />
          </div>

          <div className="heat-form-field">
            <label>Weight</label>
            <input type="number" name="weight" value={form.weight} onChange={handleChange} />
          </div>

        </div>

        {/* Quality — C, Si, Mn, S, P (fills one row of 5) */}
        <div className="heat-section-title">Quality</div>
        <div className="heat-grid">
          <div className="heat-form-field">
            <label>C</label>
            <input type="number" step="0.01" name="c" value={form.c} onChange={handleChange} />
          </div>
          <div className="heat-form-field">
            <label>Si</label>
            <input type="number" step="0.01" name="si" value={form.si} onChange={handleChange} />
          </div>
          <div className="heat-form-field">
            <label>Mn</label>
            <input type="number" step="0.01" name="mn" value={form.mn} onChange={handleChange} />
          </div>
          <div className="heat-form-field">
            <label>S</label>
            <input type="number" step="0.01" name="s" value={form.s} onChange={handleChange} />
          </div>
          <div className="heat-form-field">
            <label>P</label>
            <input type="number" step="0.01" name="p" value={form.p} onChange={handleChange} />
          </div>
        </div>

        {/* Attachment & Remarks */}
        <div className="heat-section-title">Attachment &amp; Remarks</div>
        <div className="heat-grid">
          <div className="heat-form-field">
            <label>Attach File</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
          </div>
          <div className="heat-form-field heat-form-field-wide">
            <label>Remarks</label>
            <input type="text" name="remarks" value={form.remarks} onChange={handleChange} placeholder="Optional remarks" />
          </div>
        </div>

      </div>

      {/* ACTION BUTTONS */}
      <div className="heat-actions">
        <button className="heat-btn-reset-form" onClick={handleReset} disabled={isSaving}>Reset</button>
        <button
          className="heat-btn-save"
          onClick={handleSave}
          disabled={isSaving}
          style={isSaving ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          {isSaving ? "Saving…" : "Save Heat"}
        </button>
      </div>
    </div>
  );
};

export default CreateHeat;