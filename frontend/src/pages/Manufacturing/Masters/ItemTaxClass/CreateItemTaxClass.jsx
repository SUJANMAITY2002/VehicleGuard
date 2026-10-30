import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/CreateParty.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateItemTaxClass = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemTaxClassCode: "",
    description:      "",
    status:           "Active",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.itemTaxClassCode.trim())
      return alert("Item Tax Class Code is required.");

    try {
      const res = await axios.post(`${API_URL}/api/create-item-tax-class`, formData);
      alert(res.data.message);
      setFormData({ itemTaxClassCode: "", description: "", status: "Active" });
    } catch (err) {
      console.log(err);
      alert("Error saving Item Tax Class");
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Item Tax Class</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Item Tax Class</div>

        <div className="create-grid">

          {/* TAX CLASS CODE */}
          <div className="form-group">
            <label>* Item Tax Class Code</label>
            <input
              type="text"
              name="itemTaxClassCode"
              value={formData.itemTaxClassCode}
              onChange={handleChange}
              placeholder="e.g. GST18"
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
              placeholder="e.g. GST 18% applicable items"
            />
          </div>

          {/* STATUS */}
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

        </div>

        <div className="action-buttons">
          <button className="submit-btn" onClick={handleSubmit}>Submit</button>
          <button className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreateItemTaxClass;