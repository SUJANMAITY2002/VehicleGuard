import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./CreateTransaction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import { MODULE_BUSINESS_MAP, MODULES } from "../../../../module/moduleBusinessMap";

const CreateTransaction = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    module: "",
    businessEntity: "",
    transactionCategoryCode: "",
    categoryDescription: "",
    status: "Open",
    rounding: "",
    roundingAccount: "",
    remark1: "",
    remark2: "",
    workflowComments: "",
  });

  /* Business entities cascade from selected module */
  const businessEntities = formData.module
    ? MODULE_BUSINESS_MAP[formData.module] || []
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "module") {
      /* Reset businessEntity when module changes */
      setFormData({ ...formData, module: value, businessEntity: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    if (!formData.module || !formData.businessEntity) {
      return alert("Module and Business Entity are required.");
    }
    try {
      const res = await axios.post(`${API_URL}/api/create-transaction`, formData);
      alert(res.data.message);
    } catch (err) {
      console.log(err);
      alert("Error Saving Transaction");
    }
  };

  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Transaction Category</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Transaction Category</div>

        <div className="create-grid">

          {/* MODULE */}
          <div className="form-group">
            <label>* Module</label>
            <select name="module" value={formData.module} onChange={handleChange}>
              <option value="">- Select Module -</option>
              {MODULES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* BUSINESS ENTITY — cascades from Module */}
          <div className="form-group">
            <label>* Business Entity</label>
            <select
              name="businessEntity"
              value={formData.businessEntity}
              onChange={handleChange}
              disabled={!formData.module}
            >
              <option value="">
                {formData.module ? "- Select Business Entity -" : "- Select Module first -"}
              </option>
              {businessEntities.map((be) => (
                <option key={be} value={be}>{be}</option>
              ))}
            </select>
          </div>

          {/* TRANSACTION CODE */}
          <div className="form-group">
            <label>* Transaction Category Code</label>
            <input
              type="text"
              name="transactionCategoryCode"
              value={formData.transactionCategoryCode}
              onChange={handleChange}
            />
          </div>

          {/* DESCRIPTION */}
          <div className="form-group">
            <label>* Category Description</label>
            <input
              type="text"
              name="categoryDescription"
              value={formData.categoryDescription}
              onChange={handleChange}
            />
          </div>

          {/* STATUS */}
          <div className="form-group">
            <label>Status</label>
            <input type="text" name="status" value={formData.status} readOnly />
          </div>

          {/* ROUNDING */}
          {/* <div className="form-group">
            <label>Rounding</label>
            <select name="rounding" value={formData.rounding} onChange={handleChange}>
              <option value="">- Select -</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div> */}

          {/* ROUNDING ACCOUNT */}
          {/* <div className="form-group">
            <label>Rounding Account</label>
            <input
              type="text"
              name="roundingAccount"
              value={formData.roundingAccount}
              onChange={handleChange}
            />
          </div> */}

          {/* REMARK 1 */}
          {/* <div className="form-group textarea-group">
            <label>Remark 1</label>
            <textarea
              name="remark1"
              value={formData.remark1}
              onChange={handleChange}
            />
          </div> */}

          {/* REMARK 2 */}
          {/* <div className="form-group textarea-group">
            <label>Remark 2</label>
            <textarea
              name="remark2"
              value={formData.remark2}
              onChange={handleChange}
            />
          </div> */}

          {/* WORKFLOW COMMENTS */}
          {/* <div className="form-group full-width">
            <label>Workflow Comments</label>
            <textarea
              className="big-textarea"
              name="workflowComments"
              value={formData.workflowComments}
              onChange={handleChange}
            />
          </div> */}

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

export default CreateTransaction;