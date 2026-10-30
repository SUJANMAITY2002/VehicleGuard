import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const TAX_CLASS_OPTIONS = ["GST", "IGST", "CGST", "SGST", "Exempt"];

const CreateServiceMaster = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    entityDate:     today,
    serviceCode:    "",
    serviceDetails: "",
    sacCode:        "",
    sacDescription: "",
    taxClass:       "",
    status:         "Active",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.serviceCode || !formData.sacCode) {
      alert("Service Code and SAC Code are required.");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/create-service-master`, formData);
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error Saving Service Master");
    }
  };

  const handleClear = () =>
    setFormData({
      entityDate: today, serviceCode: "", serviceDetails: "",
      sacCode: "", sacDescription: "", taxClass: "", status: "Active",
    });

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Service Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Service Master</div>

        <div className="create-grid">

          {/* Entity Date */}
          <div className="form-group">
            <label>* Entity Date</label>
            <input type="date" name="entityDate" value={formData.entityDate} onChange={handleChange} />
          </div>

          {/* Service Code */}
          <div className="form-group">
            <label>* Service Code</label>
            <input
              type="text" name="serviceCode"
              value={formData.serviceCode} onChange={handleChange}
              placeholder="e.g. SRV-001"
            />
          </div>

          {/* Service Details */}
          <div className="form-group">
            <label>Service Details</label>
            <input
              type="text" name="serviceDetails"
              value={formData.serviceDetails} onChange={handleChange}
              placeholder="Brief description of service"
            />
          </div>

          {/* SAC Code */}
          <div className="form-group">
            <label>* SAC Code</label>
            <input
              type="text" name="sacCode"
              value={formData.sacCode} onChange={handleChange}
              placeholder="e.g. 998314"
            />
          </div>

          {/* SAC Description */}
          <div className="form-group">
            <label>SAC Description</label>
            <input
              type="text" name="sacDescription"
              value={formData.sacDescription} onChange={handleChange}
              placeholder="SAC description"
            />
          </div>

          {/* Tax Class */}
          <div className="form-group">
            <label>Tax Class</label>
            <select name="taxClass" value={formData.taxClass} onChange={handleChange}>
              <option value="">- Select -</option>
              {TAX_CLASS_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
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

export default CreateServiceMaster;