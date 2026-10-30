import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./SalesPartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateSalesParty = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    partyCode: "",
    partyName: "",
    location:  "",
    city:      "",
    district:  "",
    state:     "",
    pinCode:   "",
    status:    "Active",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.partyCode.trim() || !formData.partyName.trim()) {
      return alert("Party Code and Party Name are required.");
    }
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/create-sales-party`, formData);
      alert(res.data.message);
      setFormData({
        partyCode: "", partyName: "", location: "", city: "",
        district: "", state: "", pinCode: "", status: "Active",
      });
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Error Saving Sales Party");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate("/sales-party-master", { replace: true })}>←</button>
        <h1>Sales Party Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Sales Party</div>

        <div className="create-grid">

          <div className="form-group">
            <label>* Party Code</label>
            <input type="text" name="partyCode" value={formData.partyCode} onChange={handleChange} placeholder="e.g. SP001" />
          </div>

          <div className="form-group">
            <label>* Party Name</label>
            <input type="text" name="partyName" value={formData.partyName} onChange={handleChange} placeholder="Full name" />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Area / locality" />
          </div>

          <div className="form-group">
            <label>City</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>District</label>
            <input type="text" name="district" value={formData.district} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>State</label>
            <input type="text" name="state" value={formData.state} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Pin Code</label>
            <input type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} placeholder="PIN code" />
          </div>

          <div className="form-group">
            <label>Status</label>
            <input type="text" name="status" value={formData.status} readOnly />
          </div>

        </div>

        <div className="action-buttons">
          <button className="draft-btn">Save as Draft</button>
          <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Submit"}
          </button>
          <button className="cancel-btn" onClick={() => navigate("/sales-party-master", { replace: true })}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreateSalesParty;