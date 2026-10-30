import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./DocumentSequence.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

/* ── helpers ── */
const FORMAT_OPTIONS    = ["dd/mm/yy", "mm/dd/yy", "yy/mm/dd", "julian"];

/** Mirrors the backend date-part builder so the preview is accurate. */
const buildDatePart = (format) => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yy = String(today.getFullYear()).slice(-2);

  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    /* Julian: YY + DDD (3-digit day-of-year, 1-indexed)
       e.g. 01-Jan-2026 → 26001, 31-Dec-2026 → 26365 */
    const year   = today.getFullYear();
    const start  = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy    = String(Math.floor((today - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`;  // dd/mm/yy
};

/** Re-compute the generated code client-side so the user sees the preview
 *  while filling in the edit form, exactly the same way the backend does.
 *  (Preview always reflects the CURRENT incrementNo — incrementStep only
 *  affects the number generated the NEXT time this sequence is used.) */
const previewCode = (prefix, useDateFragment, sequenceFormat, sequenceDigits, incrementNo) => {
  const p       = (prefix || "").trim().toUpperCase();
  const digits  = Math.max(1, Number(sequenceDigits) || 2);
  const padded  = String(Number(incrementNo) || 1).padStart(digits, "0");
  const datePart = useDateFragment ? buildDatePart(sequenceFormat) : "";
  return `${p}${datePart}${padded}`;
};

const DocumentSequence = () => {
  const navigate = useNavigate();

  const [allData, setAllData]         = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  /* search */
  const [module,              setModule]              = useState("");
  const [businessEntity,      setBusinessEntity]      = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [entityPrefix,        setEntityPrefix]        = useState("");
  const [transactionCode,     setTransactionCode]     = useState("");

  /* edit */
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({
    module:              "",
    businessEntity:      "",
    entityPrefix:        "",
    transactionCategory: "",
    sequenceFormat:      "dd/mm/yy",
    useDateFragment:     true,
    sequenceDigits:      2,
    incrementNo:         1,
    incrementStep:       1,
  });

  /* ── fetch ── */
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/document-sequence`);
      setAllData(res.data);
      setFilteredData(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── search ── */
  const handleSearch = () => {
    const result = allData.filter((item) => {
      const moduleMatch    = module              === "" || item.module?.toLowerCase().includes(module.toLowerCase());
      const businessMatch  = businessEntity      === "" || item.businessEntity?.toLowerCase().includes(businessEntity.toLowerCase());
      const categoryMatch  = transactionCategory === "" || item.transactionCategory?.toLowerCase().includes(transactionCategory.toLowerCase());
      const prefixMatch    = entityPrefix        === "" || item.entityPrefix?.toLowerCase().includes(entityPrefix.toLowerCase());
      const codeMatch      = transactionCode     === "" || item.generatedCode?.toLowerCase().includes(transactionCode.toLowerCase());
      return moduleMatch && businessMatch && categoryMatch && prefixMatch && codeMatch;
    });
    setFilteredData(result);
  };

  const handleReset = () => {
    setModule(""); setBusinessEntity(""); setTransactionCategory("");
    setEntityPrefix(""); setTransactionCode(""); setFilteredData(allData);
  };

  /* ── edit ── */
  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      module:              item.module              || "",
      businessEntity:      item.businessEntity      || "",
      entityPrefix:        item.entityPrefix        || "",
      transactionCategory: item.transactionCategory || "",
      sequenceFormat:      item.sequenceFormat      || "dd/mm/yy",
      useDateFragment:     item.useDateFragment !== false,  // default true
      sequenceDigits:      item.sequenceDigits      || 2,
      incrementNo:         item.incrementNo          || 1,
      incrementStep:       item.incrementStep        || 1,
    });
  };

  const setF = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked
              : e.target.type === "number"   ? Number(e.target.value)
              : e.target.value;
    setEditData((prev) => ({ ...prev, [field]: val }));
  };

  const handleUpdate = async (id) => {
    try {
      const res = await axios.put(`${API_URL}/api/document-sequence/${id}`, editData);
      if (res.data.success) {
        alert(`Saved! New code: ${res.data.generatedCode}`);
        setEditId(null);
        fetchData();
      } else {
        alert(res.data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error updating Document Sequence");
    }
  };

  const handleCancelEdit = () => setEditId(null);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sequence record?")) return;
    try {
      await axios.delete(`${API_URL}/api/document-sequence/${id}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  /* live preview while editing */
  const liveCode = editId
    ? previewCode(editData.entityPrefix, editData.useDateFragment, editData.sequenceFormat, editData.sequenceDigits, editData.incrementNo)
    : "";

  return (
    <div className="document-page">
      <ModuleNavbar />

      {/* HEADER */}
      <div className="document-header">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h2>Document Sequence</h2>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-document-sequence")}>Create ▼</button>
      </div>

      {/* SEARCH CARD */}
      <div className="document-card">
        <div className="document-grid">

          <div className="form-group">
            <label>Module</label>
            <select value={module} onChange={(e) => setModule(e.target.value)}>
              <option value="">All</option>
              {[...new Set(allData.map((i) => i.module))].map((v, idx) => (
                <option key={idx} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Business Entity</label>
            <select value={businessEntity} onChange={(e) => setBusinessEntity(e.target.value)}>
              <option value="">All</option>
              {[...new Set(allData.map((i) => i.businessEntity))].map((v, idx) => (
                <option key={idx} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Transaction Category</label>
            <select value={transactionCategory} onChange={(e) => setTransactionCategory(e.target.value)}>
              <option value="">All</option>
              {[...new Set(allData.map((i) => i.transactionCategory))].map((v, idx) => (
                <option key={idx} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Entity Prefix</label>
            <input type="text" value={entityPrefix} onChange={(e) => setEntityPrefix(e.target.value)} placeholder="Enter Prefix" />
          </div>

          <div className="form-group">
            <label>Transaction Code</label>
            <input type="text" value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} placeholder="Enter Code" />
          </div>

        </div>

        <div className="button-section">
          <button className="search-btn" onClick={handleSearch}>Search</button>
          <button className="reset-btn"  onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="result-table">
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Business Entity</th>
              <th>Transaction Category</th>
              <th>Entity Prefix</th>
              <th>Sequence Format</th>
              <th>Date Fragment</th>
              <th>Digits</th>
              <th>Starting Sequence No</th>
              <th>Increment Value</th>
              <th>Transaction Code</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? filteredData.map((item) => (
              <tr key={item._id} className={editId === item._id ? "editing-row" : ""}>

                {editId === item._id ? (
                  /* ══ EDIT ROW ══════════════════════════════════════════ */
                  <>
                    <td>
                      <input
                        type="text" value={editData.module} onChange={setF("module")}
                        placeholder="Module" className="seq-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text" value={editData.businessEntity} onChange={setF("businessEntity")}
                        placeholder="Business Entity" className="seq-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text" value={editData.transactionCategory} onChange={setF("transactionCategory")}
                        placeholder="Category" className="seq-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text" value={editData.entityPrefix} onChange={setF("entityPrefix")}
                        placeholder="Prefix" className="seq-input seq-input--sm"
                      />
                    </td>
                    <td>
                      <select value={editData.sequenceFormat} onChange={setF("sequenceFormat")} className="seq-select">
                        {FORMAT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f === "julian" ? "Julian (YY+DDD)" : f}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox" checked={editData.useDateFragment}
                        onChange={setF("useDateFragment")}
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="1" max="6" value={editData.sequenceDigits}
                        onChange={setF("sequenceDigits")} className="seq-input seq-input--xs"
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="1" value={editData.incrementNo}
                        onChange={setF("incrementNo")} className="seq-input seq-input--xs"
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="1" value={editData.incrementStep}
                        onChange={setF("incrementStep")} className="seq-input seq-input--xs"
                        title="Amount added to the running number each time a document is generated"
                      />
                    </td>
                    {/* live preview */}
                    <td className="code-cell preview-code" title="Live preview">{liveCode}</td>
                    <td className="action-cell">
                      <button className="save-btn" onClick={() => handleUpdate(item._id)}>Save</button>
                      <button className="cancel-edit-btn" onClick={handleCancelEdit}>✕</button>
                    </td>
                  </>
                ) : (
                  /* ══ VIEW ROW ══════════════════════════════════════════ */
                  <>
                    <td>{item.module}</td>
                    <td>{item.businessEntity}</td>
                    <td>{item.transactionCategory || "-"}</td>
                    <td>{item.entityPrefix || "-"}</td>
                    <td>{item.sequenceFormat}</td>
                    <td>{item.useDateFragment === false ? "No" : "Yes"}</td>
                    <td>{item.sequenceDigits}</td>
                    <td>{item.incrementNo}</td>
                    <td>{item.incrementStep || 1}</td>
                    <td className="code-cell">{item.generatedCode}</td>
                    <td className="action-cell">
                      <button className="edit-btn"   onClick={() => handleEdit(item)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
                    </td>
                  </>
                )}

              </tr>
            )) : (
              <tr>
                <td colSpan="11" className="no-data">No Data Found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentSequence;