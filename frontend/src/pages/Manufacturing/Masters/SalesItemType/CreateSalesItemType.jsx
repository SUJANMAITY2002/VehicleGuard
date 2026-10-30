import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateSalesItemType = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemTypeCode: "",
    itemType:     "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.itemTypeCode.trim()) return alert("Item Type Code is required.");
    if (!formData.itemType.trim())     return alert("Item Type is required.");

    try {
      const res = await axios.post(`${API_URL}/api/create-sales-item-type`, formData);
      alert(res.data.message);
      setFormData({ itemTypeCode: "", itemType: "" });
    } catch (err) {
      console.log(err);
      alert("Error Saving Sales Item Type");
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Sales Item Type</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Sales Item Type</div>

        <div className="create-grid">

          {/* ITEM TYPE CODE */}
          <div className="form-group">
            <label>* Item Type Code</label>
            <input
              type="text"
              name="itemTypeCode"
              value={formData.itemTypeCode}
              onChange={handleChange}
              placeholder="e.g. SIT001"
            />
          </div>

          {/* ITEM TYPE */}
          <div className="form-group">
            <label>* Item Type</label>
            <input
              type="text"
              name="itemType"
              value={formData.itemType}
              onChange={handleChange}
              placeholder="e.g. TMT Bar"
            />
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

export default CreateSalesItemType;