import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./ItemConversion.css";

const CreateItemConversionMaster = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    conversionTypeName: "",
    description:        "",
    status:             "Active",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.conversionTypeName.trim())
      return alert("Conversion Type Name is required.");
    try {
      const res = await axios.post(`${API_URL}/api/create-item-conversion-master`, formData);
      alert(res.data.message);
      setFormData({ conversionTypeName: "", description: "", status: "Active" });
    } catch (err) {
      console.error(err);
      alert("Error Saving Item Conversion Type");
    }
  };

  return (
    <div className="ic-page">
      <ModuleNavbar />

      <div className="ic-topbar">
        <div className="ic-topbar-left">
          <button className="ic-back-btn" onClick={() => navigate("/item-conversion-master", { replace: true })}>
            ←
          </button>
          <h1>Create Item Conversion Type</h1>
        </div>
      </div>

      <div className="ic-card">
        <div className="ic-card-title">Item Conversion Type</div>

        <div className="ic-form-grid">
          <div className="ic-field">
            <label>* Conversion Type Name</label>
            <input
              type="text"
              name="conversionTypeName"
              value={formData.conversionTypeName}
              onChange={handleChange}
              placeholder="e.g. Weight Conversion, Grade Split"
            />
          </div>

          <div className="ic-field">
            <label>Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
            />
          </div>

          <div className="ic-field">
            <label>Status</label>
            <input type="text" value={formData.status} readOnly className="ic-readonly" />
          </div>
        </div>

        <div className="ic-actions">
          <button className="ic-cancel-btn" onClick={() => navigate("/item-conversion-master", { replace: true })}>
            Cancel
          </button>
          <button className="ic-save-btn" onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateItemConversionMaster;