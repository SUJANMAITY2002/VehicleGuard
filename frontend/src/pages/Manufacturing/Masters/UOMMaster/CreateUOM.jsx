import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/CreateParty.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateUOM = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    uomName: "",
    status: "Active",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    if (!formData.uomName.trim()) {
      return alert("UOM Name is required");
    }

    try {
      const res = await axios.post(
        `${API_URL}/api/create-uom`,
        formData
      );

      alert(res.data.message);

      setFormData({
        uomName: "",
        status: "Active",
      });
    } catch (error) {
      console.log(error);
      alert("Error Saving UOM");
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <h1>UOM Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">
          Create UOM
        </div>

        <div className="create-grid">

          <div className="form-group">
            <label>* UOM Name</label>
            <input
              type="text"
              name="uomName"
              value={formData.uomName}
              onChange={handleChange}
              placeholder="KG, MT, PCS, BAG"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <input
              type="text"
              name="status"
              value={formData.status}
              readOnly
            />
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

export default CreateUOM;