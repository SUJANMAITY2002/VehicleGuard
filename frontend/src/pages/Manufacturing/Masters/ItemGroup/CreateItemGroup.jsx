import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateItemGroup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemGroup:   "",
    itemTypes:   "",      // stores the chosen category name
    description: "",
    status:      "Active",
  });

  /* all active categories from DB */
  const [categoryOptions, setCategoryOptions] = useState([]);

  /* type-ahead for category field */
  const [catInput,   setCatInput]   = useState("");
  const [catSug,     setCatSug]     = useState([]);
  const [showCatSug, setShowCatSug] = useState(false);
  const catRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/item-categories`);
        setCategoryOptions(res.data.filter((c) => c.status === "Active"));
      } catch (err) {
        console.log("Error loading categories:", err);
      }
    };
    fetchCategories();
  }, []);

  /* close suggestion on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setShowCatSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCatInput = (val) => {
    setCatInput(val);
    setFormData({ ...formData, itemTypes: val });
    if (val.trim()) {
      const lower = val.toLowerCase();
      const matches = categoryOptions
        .map((c) => c.categoryName)
        .filter((n) => n?.toLowerCase().includes(lower));
      setCatSug(matches);
      setShowCatSug(matches.length > 0);
    } else {
      setCatSug([]);
      setShowCatSug(false);
    }
  };

  const handleCatSelect = (name) => {
    setCatInput(name);
    setFormData({ ...formData, itemTypes: name });
    setShowCatSug(false);
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!formData.itemTypes.trim()) return alert("Item Category is required.");
    if (!formData.itemGroup.trim()) return alert("Item Group is required.");

    try {
      const res = await axios.post(`${API_URL}/api/create-item-group`, formData);
      alert(res.data.message);
      setFormData({ itemGroup: "", itemTypes: "", description: "", status: "Active" });
      setCatInput("");
    } catch (err) {
      console.log(err);
      alert("Error Saving Item Group");
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ←
        </button>
        <h1>Item Group</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Item Group</div>

        <div className="create-grid">

          {/* ITEM CATEGORY — live type-ahead */}
          <div className="form-group" style={{ position: "relative" }} ref={catRef}>
            <label>* Item Category</label>
            <input
              type="text"
              value={catInput}
              onChange={(e) => handleCatInput(e.target.value)}
              onFocus={() => catInput && catSug.length > 0 && setShowCatSug(true)}
              placeholder="Type category name…"
              autoComplete="off"
            />
            {showCatSug && (
              <ul className="suggestion-list">
                {catSug.map((s) => (
                  <li key={s} onClick={() => handleCatSelect(s)}>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ITEM GROUP */}
          <div className="form-group">
            <label>* Item Group</label>
            <input
              type="text"
              name="itemGroup"
              value={formData.itemGroup}
              onChange={handleChange}
              placeholder="e.g. 8mm, 10mm, 16mm"
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

          {/* STATUS */}
          <div className="form-group">
            <label>Status</label>
            <input type="text" name="status" value={formData.status} readOnly />
          </div>

        </div>

        <div className="action-buttons">
          <button className="draft-btn">Save as Draft</button>
          <button className="submit-btn" onClick={handleSubmit}>Submit</button>
          <button className="cancel-btn" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateItemGroup;