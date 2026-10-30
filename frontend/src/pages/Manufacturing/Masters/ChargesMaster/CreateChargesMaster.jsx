import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const TYPE_OPTIONS = ["Charges", "Discount"];

const CreateChargesMaster = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    entityDate:    today,
    type:          "",
    code:          "",
    details:       "",
    addOrSubtract: "",
    status:        "Active",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.type || !formData.code || !formData.addOrSubtract) {
      alert("Type, Code and Addition/Subtraction are required.");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/create-charges-master`, formData);
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error Saving Charges/Discount Master");
    }
  };

  const handleClear = () =>
    setFormData({ entityDate: today, type: "", code: "", details: "", addOrSubtract: "", status: "Active" });

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Charges / Discount Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Charges / Discount Master</div>

        <div className="create-grid">

          {/* Entity Date */}
          <div className="form-group">
            <label>* Entity Date</label>
            <input type="date" name="entityDate" value={formData.entityDate} onChange={handleChange} />
          </div>

          {/* Type */}
          <div className="form-group">
            <label>* Type</label>
            <select name="type" value={formData.type} onChange={handleChange}>
              <option value="">- Select -</option>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Code */}
          <div className="form-group">
            <label>* Code</label>
            <input
              type="text" name="code"
              value={formData.code} onChange={handleChange}
              placeholder="e.g. CHG-001"
            />
          </div>

          {/* Details */}
          <div className="form-group">
            <label>Details</label>
            <input
              type="text" name="details"
              value={formData.details} onChange={handleChange}
              placeholder="Brief description"
            />
          </div>

          {/* Addition / Subtraction */}
          <div className="form-group">
            <label>* Addition / Subtraction</label>
            <select name="addOrSubtract" value={formData.addOrSubtract} onChange={handleChange}>
              <option value="">- Select -</option>
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

export default CreateChargesMaster;