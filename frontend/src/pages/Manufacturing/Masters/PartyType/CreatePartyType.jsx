import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreatePartyType = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    partyType:   "",
    description: "",
    status:      "Active",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.partyType.trim()) return alert("Party Type name is required.");
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/create-party-type`, formData);
      alert(res.data.message);
      setFormData({ partyType: "", description: "", status: "Active" });
    } catch (err) {
      console.log(err);
      alert("Error Saving Party Type");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate("/party-type", { replace: true })}>←</button>
        <h1>Party Type</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Party Type</div>

        <div className="create-grid">

          <div className="form-group">
            <label>* Party Type</label>
            <input
              type="text"
              name="partyType"
              value={formData.partyType}
              onChange={handleChange}
              placeholder="e.g. Customer, Supplier, Transporter..."
            />
          </div>

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
          <button className="cancel-btn" onClick={() => navigate("/party-type", { replace: true })}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreatePartyType;