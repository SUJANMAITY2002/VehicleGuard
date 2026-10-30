import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const ITEM_TYPE_OPTIONS = [
  "Raw Material",
  "Semi Finished",
  "Finished Goods",
  "Consumables",
  "Packing Material",
  "Scrap",
  "Service",
];

const CreateItemCategory = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemCode:     "",
    itemTypes:    "",
    categoryName: "",
    description:  "",
    status:       "Active",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

const handleSubmit = async () => {

  if (!formData.itemTypes)
    return alert("Item Type is required.");

  if (!formData.categoryName.trim())
    return alert("Category Name is required.");  
  try {
    const res = await axios.post(
      `${API_URL}/api/create-item-category`,
      formData
    );

    alert(res.data.message);

    setFormData({
      itemCode: "",
      itemTypes: "",
      categoryName: "",
      description: "",
      status: "Active",
    });
  } catch (err) {
    console.log(err);
    alert("Error Saving Item Category");
  }
};

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Item Category</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Item Category</div>

        <div className="create-grid">

          {/* ITEM CODE */}
          <div className="form-group">
            <label>Item Category Code</label>
            <input
              type="text"
              name="itemCode"
              value={formData.itemCode}
              onChange={handleChange}
              placeholder="e.g. CAT001"
            />
          </div>

          {/* ITEM TYPES — styled select */}
          <div className="form-group">
            <label>* Item Types</label>
            <select
              name="itemTypes"
              value={formData.itemTypes}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: formData.itemTypes ? "1.5px solid #1976d2" : "1px solid #ccc",
                background: formData.itemTypes ? "#e8f4fd" : "#fff",
                color: formData.itemTypes ? "#1976d2" : "#555",
                fontWeight: formData.itemTypes ? "600" : "400",
                cursor: "pointer",
                outline: "none",
                transition: "border 0.2s, background 0.2s",
              }}
            >
              <option value="">— Select Type —</option>
              {ITEM_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* CATEGORY NAME */}
          <div className="form-group">
            <label>* Category Name</label>
            <input
              type="text"
              name="categoryName"
              value={formData.categoryName}
              onChange={handleChange}
              placeholder="e.g. TMT, Iron, Cement"
            />
          </div>

          {/* DESCRIPTION */}
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
            />
          </div>

          {/* STATUS */}
          <div className="form-group">
            <label>Status</label>
            <input type="text" name="status" value={formData.status} readOnly />
          </div>

        </div>

        <div className="action-buttons">
          <button className="draft-btn">Save as Draft</button>
          <button className="submit-btn" onClick={handleSubmit}>Submit</button>
          <button className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreateItemCategory;