import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/CreateParty.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const initialFormData = {
  siteCode: "",
  siteName: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  contactPerson: "",
  mobile: "",
  gstNo: "",
  status: "Active",
};

const CreateSite = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.siteCode.trim() || !formData.siteName.trim()) {
      return alert("Site Code and Site Name are required.");
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/create-site`, formData);
      alert(res.data.message);
      setFormData(initialFormData);
    } catch (err) {
      alert(err.response?.data?.message || "Error Saving Site");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate("/site-master", { replace: true })}>←</button>
        <h1>Site Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Site</div>

        <div className="create-grid">
          <div className="form-group">
            <label>* Site Code</label>
            <input
              type="text"
              name="siteCode"
              value={formData.siteCode}
              onChange={handleChange}
              placeholder="e.g. SITE001"
            />
          </div>

          <div className="form-group">
            <label>* Site Name</label>
            <input
              type="text"
              name="siteName"
              value={formData.siteName}
              onChange={handleChange}
              placeholder="Full site name"
            />
          </div>

          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Raipur"
            />
          </div>

          <div className="form-group">
            <label>State</label>
            <select name="state" value={formData.state} onChange={handleChange}>
              <option value="">- Select State -</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Pin Code</label>
            <input
              type="text"
              name="pinCode"
              value={formData.pinCode}
              onChange={handleChange}
              placeholder="6-digit pin"
              maxLength={6}
            />
          </div>

          <div className="form-group">
            <label>GST No</label>
            <input
              type="text"
              name="gstNo"
              value={formData.gstNo}
              onChange={handleChange}
              placeholder="15-digit GSTIN"
              maxLength={15}
            />
          </div>

          <div className="form-group">
            <label>Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Mobile</label>
            <input
              type="text"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10-digit"
              maxLength={10}
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <input type="text" name="status" value={formData.status} readOnly />
          </div>

          <div className="form-group" style={{ gridColumn: "span 4" }}>
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Full address"
            />
          </div>
        </div>

        <div className="action-buttons">
          <button className="draft-btn">Save as Draft</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Submit"}
          </button>
          <button className="cancel-btn" onClick={() => navigate("/site-master", { replace: true })}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSite;