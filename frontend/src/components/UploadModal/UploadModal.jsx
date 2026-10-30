import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { API_URL } from "../../config";
import "./UploadModal.css";

/*
  UploadModal — Generic bulk-upload component
  ──────────────────────────────────────────
  Props:
    open          : boolean
    onClose       : () => void
    onSuccess     : () => void   (called after successful save — triggers refetch)
    entityType    : "party" | "item"
    fields        : [{ key, label, required?, default? }]
    bulkEndpoint  : string  e.g. "/api/bulk-create-parties"
*/

const UploadModal = ({ open, onClose, onSuccess, entityType, fields, bulkEndpoint }) => {
  const fileRef = useRef(null);
  const [step, setStep] = useState("idle"); // idle | mapping | preview | saving | done
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});   // { fieldKey: excelHeader }
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  if (!open) return null;

  /* ── Reset ── */
  const reset = () => {
    setStep("idle");
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
    setPreview([]);
    setErrors([]);
    setSavedCount(0);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => { reset(); onClose(); };

  /* ── Parse file ── */
  const parseFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!json.length) { alert("File is empty."); return; }
      const headers = json[0].map(String);
      const rows = json.slice(1).filter((r) => r.some((c) => c !== undefined && c !== ""));
      setRawHeaders(headers);
      setRawRows(rows);

      /* Auto-map: case-insensitive fuzzy match */
      const autoMap = {};
      fields.forEach(({ key, label }) => {
        const needle = [key, label].map((s) => s.toLowerCase().replace(/\s+/g, ""));
        const match = headers.find((h) =>
          needle.some((n) => h.toLowerCase().replace(/\s+/g, "").includes(n) || n.includes(h.toLowerCase().replace(/\s+/g, "")))
        );
        if (match) autoMap[key] = match;
      });
      setMapping(autoMap);
      setStep("mapping");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileInput = (e) => parseFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    parseFile(e.dataTransfer.files[0]);
  };

  /* ── Build preview ── */
  const buildPreview = () => {
    const errs = [];
    fields.forEach(({ key, required }) => {
      if (required && !mapping[key]) errs.push(`"${key}" is required but not mapped.`);
    });
    if (errs.length) { setErrors(errs); return; }

    const headerIndex = {};
    rawHeaders.forEach((h, i) => { headerIndex[h] = i; });

    const rows = rawRows.map((row, ri) => {
      const obj = {};
      fields.forEach(({ key, default: def }) => {
        const col = mapping[key];
        obj[key] = col !== undefined ? (row[headerIndex[col]] ?? def ?? "") : (def ?? "");
      });
      return { _rowNum: ri + 2, ...obj };
    });
    setPreview(rows);
    setErrors([]);
    setStep("preview");
  };

  /* ── Save ── */
  const handleSave = async () => {
    setStep("saving");
    try {
      const payload = preview.map(({ _rowNum, ...rest }) => rest);
      const res = await axios.post(`${API_URL}${bulkEndpoint}`, { data: payload });
      setSavedCount(res.data.count ?? payload.length);
      setStep("done");
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving data.");
      setStep("preview");
    }
  };

  /* ── Template download ── */
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([fields.map((f) => f.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${entityType}_upload_template.xlsx`);
  };

  /* ── Render ── */
  return (
    <div className="upload-overlay" onClick={handleClose}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="upload-modal-header">
          <div className="upload-modal-title">
            <span className="upload-icon">⬆</span>
            Bulk Upload — {entityType === "party" ? "Party" : "Item"} Master
          </div>
          <button className="upload-close-btn" onClick={handleClose}>✕</button>
        </div>

        {/* ── STEP: idle ── */}
        {step === "idle" && (
          <div className="upload-body">
            <div
              className={`upload-dropzone ${dragOver ? "drag-active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="dropzone-icon">📊</div>
              <div className="dropzone-text">Drop your Excel / CSV file here</div>
              <div className="dropzone-sub">or click to browse</div>
              <div className="dropzone-formats">.xlsx · .xls · .csv</div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleFileInput}
              />
            </div>
            <div className="upload-template-row">
              <span>Don't have the format?</span>
              <button className="template-btn" onClick={downloadTemplate}>
                ⬇ Download Template
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: mapping ── */}
        {step === "mapping" && (
          <div className="upload-body">
            <div className="upload-file-badge">📄 {fileName} — {rawRows.length} rows detected</div>
            <div className="mapping-title">Map your columns to fields</div>
            <div className="mapping-grid">
              {fields.map(({ key, label, required }) => (
                <div className="mapping-row" key={key}>
                  <div className="mapping-field-label">
                    {required && <span className="req-star">*</span>}{label}
                  </div>
                  <div className="mapping-arrow">→</div>
                  <select
                    className="mapping-select"
                    value={mapping[key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [key]: e.target.value || undefined })}
                  >
                    <option value="">— skip —</option>
                    {rawHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {errors.length > 0 && (
              <div className="upload-errors">
                {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
              </div>
            )}
            <div className="upload-actions">
              <button className="upload-back-btn" onClick={reset}>← Back</button>
              <button className="upload-next-btn" onClick={buildPreview}>Preview Data →</button>
            </div>
          </div>
        )}

        {/* ── STEP: preview ── */}
        {step === "preview" && (
          <div className="upload-body upload-body-wide">
            <div className="upload-file-badge">✅ {preview.length} records ready to import</div>
            <div className="upload-preview-table-wrap">
              <table className="upload-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {fields.map((f) => <th key={f.key}>{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td>{row._rowNum}</td>
                      {fields.map((f) => <td key={f.key}>{String(row[f.key] ?? "")}</td>)}
                    </tr>
                  ))}
                  {preview.length > 50 && (
                    <tr><td colSpan={fields.length + 1} className="preview-more">
                      … and {preview.length - 50} more rows
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="upload-actions">
              <button className="upload-back-btn" onClick={() => setStep("mapping")}>← Re-map</button>
              <button className="upload-save-btn" onClick={handleSave}>
                💾 Save {preview.length} Records
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: saving ── */}
        {step === "saving" && (
          <div className="upload-body upload-center">
            <div className="upload-spinner">⏳</div>
            <div className="upload-saving-text">Saving records to database…</div>
          </div>
        )}

        {/* ── STEP: done ── */}
        {step === "done" && (
          <div className="upload-body upload-center">
            <div className="upload-success-icon">✅</div>
            <div className="upload-success-text">{savedCount} records saved successfully!</div>
            <button className="upload-done-btn" onClick={handleClose}>Close</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadModal;