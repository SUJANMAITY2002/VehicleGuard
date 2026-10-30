import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateItemClass = () => {
  const navigate = useNavigate();

  const today = new Date().toISOString().substring(0, 10);

  const [formData, setFormData] = useState({
    className:   "",
    description: "",
    date:        today,
    status:      "Active",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.className.trim())
      return alert("Class Name is required.");

    try {
      const res = await axios.post(`${API_URL}/api/create-item-class`, formData);
      alert(res.data.message);
      setFormData({ className: "", description: "", date: today, status: "Active" });
    } catch (err) {
      console.log(err);
      alert("Error Saving Item Class");
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Item Class</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Item Class</div>

        <div className="create-grid">

          {/* CLASS NAME */}
          <div className="form-group">
            <label>* Class Name</label>
            <input
              type="text"
              name="className"
              value={formData.className}
              onChange={handleChange}
              placeholder="e.g. Grade-A, Premium, Standard"
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

          {/* DATE */}
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
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

export default CreateItemClass;