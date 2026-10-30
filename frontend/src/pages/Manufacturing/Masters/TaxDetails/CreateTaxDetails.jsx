import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const TAX_TYPE_OPTIONS = ["GST", "IGST", "CGST", "SGST", "Cess", "TDS", "TCS"];

const CreateTaxDetails = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    entityDate:    today,
    taxType:       "",
    taxCode:       "",
    taxName:       "",
    percentage:    "",
    addOrSubtract: "Addition",
    status:        "Active",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.taxType || !formData.taxCode || !formData.taxName || formData.percentage === "") {
      alert("Tax Type, Tax Code, Tax Name and Percentage are required.");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/create-tax-details`, formData);
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error Saving Tax Details");
    }
  };

  const handleClear = () =>
    setFormData({ entityDate: today, taxType: "", taxCode: "", taxName: "", percentage: "", addOrSubtract: "Addition", status: "Active" });

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Tax Details</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Tax Details</div>

        <div className="create-grid">

          {/* Entity Date */}
          <div className="form-group">
            <label>* Entity Date</label>
            <input type="date" name="entityDate" value={formData.entityDate} onChange={handleChange} />
          </div>

          {/* Tax Type */}
          <div className="form-group">
            <label>* Tax Type</label>
            <select name="taxType" value={formData.taxType} onChange={handleChange}>
              <option value="">- Select -</option>
              {TAX_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Tax Code */}
          <div className="form-group">
            <label>* Tax Code</label>
            <input
              type="text" name="taxCode"
              value={formData.taxCode} onChange={handleChange}
              placeholder="e.g. TAX-GST-18"
            />
          </div>

          {/* Tax Name */}
          <div className="form-group">
            <label>* Tax Name</label>
            <input
              type="text" name="taxName"
              value={formData.taxName} onChange={handleChange}
              placeholder="e.g. GST 18%"
            />
          </div>

          {/* Percentage */}
          <div className="form-group">
            <label>* Percentage (%)</label>
            <input
              type="number" name="percentage" min="0" max="100"
              value={formData.percentage} onChange={handleChange}
              placeholder="e.g. 18"
            />
          </div>

          {/* Addition / Subtraction */}
          <div className="form-group">
            <label>* Addition / Subtraction</label>
            <select name="addOrSubtract" value={formData.addOrSubtract} onChange={handleChange}>
              <option value="Addition">Addition</option>
              <option value="Subtraction">Subtraction</option>
            </select>
          </div>

          {/* Status */}
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

export default CreateTaxDetails;