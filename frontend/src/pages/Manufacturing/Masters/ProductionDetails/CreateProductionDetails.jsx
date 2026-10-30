import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateProductionDetails = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    grade: "",
    size: "",
    thickness: "",
    width: "",
    length: "",
    status: "Active",
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/create-production-details`, formData);
      alert(res.data.message);
    } catch (err) { console.log(err); alert("Error Saving Production Details"); }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />
      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Production Details</h1>
      </div>
      <div className="create-container">
        <div className="create-title">Create Production Details</div>
        <div className="create-grid">

          <div className="form-group">
            <label>Grade</label>
            <input type="text" name="grade" value={formData.grade} onChange={handleChange} placeholder="e.g. Fe500" />
          </div>

          <div className="form-group">
            <label>Size</label>
            <input type="text" name="size" value={formData.size} onChange={handleChange} placeholder="e.g. 8, 10, 12..." />
          </div>

          <div className="form-group">
            <label>Thickness</label>
            <input type="text" name="thickness" value={formData.thickness} onChange={handleChange} placeholder="e.g. 5mm" />
          </div>

          <div className="form-group">
            <label>Width</label>
            <input type="text" name="width" value={formData.width} onChange={handleChange} placeholder="e.g. 100mm" />
          </div>

          <div className="form-group">
            <label>Length</label>
            <input type="text" name="length" value={formData.length} onChange={handleChange} placeholder="e.g. 12m" />
          </div>

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

export default CreateProductionDetails;