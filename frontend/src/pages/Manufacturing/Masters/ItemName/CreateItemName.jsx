import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/CreateParty.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateItemName = () => {
  const navigate = useNavigate();

  const [itemTypeOptions, setItemTypeOptions] = useState([]);

  const [formData, setFormData] = useState({
    itemType: "",
    itemCode: "",
    itemName: "",
    date:     "",
    status:   "Active",
  });

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/sales-item-types`);
        setItemTypeOptions(res.data);
      } catch (err) {
        console.log("Error loading item types:", err);
      }
    };
    fetchTypes();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.itemType)          return alert("Item Type is required.");
    if (!formData.itemCode.trim())   return alert("Item Code is required.");
    if (!formData.itemName.trim())   return alert("Item Name is required.");

    try {
      const res = await axios.post(`${API_URL}/api/create-item-name`, formData);
      alert(res.data.message);
      setFormData({ itemType: "", itemCode: "", itemName: "", date: "", status: "Active" });
    } catch (err) {
      console.log(err);
      alert("Error Saving Item");
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Item Name Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Item Name</div>

        <div className="create-grid">

          {/* ITEM TYPE — from Sales Item Type master */}
          <div className="form-group">
            <label>* Item Type</label>
            <select
              name="itemType"
              value={formData.itemType}
              onChange={handleChange}
            >
              <option value="">— Select Item Type —</option>
              {itemTypeOptions.length > 0 ? (
                itemTypeOptions.map((t) => (
                  <option key={t._id} value={t.itemType}>{t.itemType}</option>
                ))
              ) : (
                <option disabled>No item types found — add in Masters → Sales Item Type</option>
              )}
            </select>
            {itemTypeOptions.length === 0 && (
              <span style={{ fontSize: "11px", color: "#e55", marginTop: "4px", display: "block" }}>
                Go to Masters → Sales Item Type and create one first.
              </span>
            )}
          </div>

          {/* ITEM CODE */}
          <div className="form-group">
            <label>* Item Code</label>
            <input
              type="text"
              name="itemCode"
              value={formData.itemCode}
              onChange={handleChange}
              placeholder="e.g. SI001"
            />
          </div>

          {/* ITEM NAME */}
          <div className="form-group">
            <label>* Item Name</label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              placeholder="Full item name"
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

export default CreateItemName;