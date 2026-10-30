import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const today = new Date().toISOString().split("T")[0];

const makeRow = () => ({
  item: "",
  logicAmount: 0,
  startDate: today,
  endDate: "",
  editing: true,
});

const fmt = (value) => Number(value || 0).toLocaleString("en-IN");

const CreateSchemeMaster = () => {
  const navigate = useNavigate();
  const [schemeInfo, setSchemeInfo] = useState({
    schemeName: "",
    description: "",
  });
  const [rows, setRows] = useState([makeRow()]);
  const [itemTypes, setItemTypes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchItemTypes = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/item-types`);
        setItemTypes(res.data.filter((item) => item.status === "Active"));
      } catch (err) {
        console.log("Error loading item types:", err);
      }
    };

    fetchItemTypes();
  }, []);

  const handleSchemeChange = (e) => {
    setSchemeInfo({ ...schemeInfo, [e.target.name]: e.target.value });
  };

  const updateRow = (idx, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const toggleEdit = (idx) => {
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, editing: !row.editing } : row))
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, makeRow()]);
  };

  const deleteRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!schemeInfo.schemeName.trim()) {
      return alert("Scheme Name is required.");
    }

    const invalid = rows.some((row) => !row.item.trim() || !row.startDate);
    if (invalid) {
      return alert("Item and Start Date are required in every row.");
    }

    try {
      setSaving(true);
      for (const row of rows) {
        await axios.post(`${API_URL}/api/create-scheme`, {
          schemeName: schemeInfo.schemeName,
          description: schemeInfo.description,
          item: row.item,
          logicAmount: row.logicAmount,
          startDate: row.startDate,
          endDate: row.endDate,
          status: "Active",
        });
      }
      alert("Scheme Saved Successfully");
      setSchemeInfo({ schemeName: "", description: "" });
      setRows([makeRow()]);
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Error Saving Scheme");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />
      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Scheme Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Scheme</div>

        <div className="search-grid" style={{ padding: "18px", gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div className="form-group">
            <label>* Scheme Name</label>
            <input
              type="text"
              name="schemeName"
              value={schemeInfo.schemeName}
              onChange={handleSchemeChange}
              placeholder="e.g. Raipur"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={schemeInfo.description}
              onChange={handleSchemeChange}
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="scheme-table-wrap">
          <div className="scheme-table-heading">Scheme Item Rows</div>

          <div className="scheme-scroll">
            <table className="scheme-matrix editable-matrix">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Logic</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.editing ? "row-editing" : ""}>
                    <td>
                      {row.editing ? (
                        <select
                          value={row.item}
                          onChange={(e) => updateRow(idx, "item", e.target.value)}
                        >
                          <option value="">- Select Item -</option>
                          {itemTypes.map((itemType) => (
                            <option key={itemType._id} value={itemType.itemTypes}>
                              {itemType.itemTypes}
                            </option>
                          ))}
                        </select>
                      ) : row.item}
                    </td>

                    <td>
                      {row.editing ? (
                        <span className="offset-display">
                          X +
                          <input
                            type="number"
                            className="offset-input"
                            value={row.logicAmount}
                            onChange={(e) => updateRow(idx, "logicAmount", e.target.value)}
                          />
                        </span>
                      ) : (
                        <span className="offset-display">X + {fmt(row.logicAmount)}</span>
                      )}
                    </td>

                    <td>
                      {row.editing ? (
                        <input
                          type="date"
                          value={row.startDate}
                          onChange={(e) => updateRow(idx, "startDate", e.target.value)}
                        />
                      ) : row.startDate}
                    </td>

                    <td>
                      {row.editing ? (
                        <input
                          type="date"
                          value={row.endDate}
                          onChange={(e) => updateRow(idx, "endDate", e.target.value)}
                        />
                      ) : row.endDate || "-"}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className={row.editing ? "save-row-btn" : "edit-row-btn"}
                        onClick={() => toggleEdit(idx)}
                      >
                        {row.editing ? "Done" : "Edit"}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteRow(idx)}
                        disabled={rows.length === 1}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="action-buttons">
          <button className="draft-btn" onClick={addRow}>Add Row</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Submit"}
          </button>
          <button className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreateSchemeMaster;