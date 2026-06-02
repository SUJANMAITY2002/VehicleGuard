import React, { useState } from "react";
import axios from "axios";
import "./CreateTransaction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const CreateTransaction = () => {

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

  /* HANDLE CHANGE */
  const handleChange = (e) => {

    setFormData({

      ...formData,

      [e.target.name]: e.target.value,

    });

  };

  /* SAVE */
  const handleSubmit = async () => {

    try {

      const response = await axios.post(
        `${API_URL}/api/create-transaction`,
        formData
      );

      alert(response.data.message);

    } catch (error) {

      console.log(error);

      alert("Error Saving Transaction");

    }

  };

  return (
    <div className="create-page">

      <ModuleNavbar />

      {/* HEADER */}
      <div className="create-header">

        <h1>Transaction Category</h1>

      </div>

      {/* MAIN */}
      <div className="create-container">

        <div className="create-title">
          Create Transaction Category
        </div>

        <div className="create-grid">

          {/* MODULE */}
          <div className="form-group">

            <label>* Module</label>

            <select
              name="module"
              value={formData.module}
              onChange={handleChange}
            >

              <option value="">- Select -</option>

              <option>Home</option>

              <option>Procurement</option>

              <option>Sales</option>

              <option>Inventory</option>

              <option>Production</option>

              <option>Quality</option>

            </select>

          </div>

          {/* BUSINESS ENTITY */}
          <div className="form-group">

            <label>* Business Entity</label>

            <select
              name="businessEntity"
              value={formData.businessEntity}
              onChange={handleChange}
            >

              <option value="">- Select -</option>

              <option>Bar code Scan Commercial</option>

              <option>Bar code Scan SI Transfer</option>

              <option>Bar code Scan Sales Shipment</option>

              <option>Barcode Scan</option>

              <option>Batch Number Update</option>

              <option>Bin Transfer</option>

              <option>Demerging Item</option>

              <option>Direct GRN</option>

              <option>Direct GRN Reversal</option>

              <option>Document Upload</option>

              <option>DrillDownInventoryReports</option>

              <option>FG Revaluation</option>

              <option>Finished Good Costing</option>

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

            <input
              type="text"
              name="status"
              value={formData.status}
              readOnly
            />

          </div>

          {/* ROUNDING */}
          <div className="form-group">

            <label>Rounding</label>

            <select
              name="rounding"
              value={formData.rounding}
              onChange={handleChange}
            >

              <option value="">- Select -</option>

              <option>Yes</option>

              <option>No</option>

            </select>

          </div>

          {/* ROUNDING ACCOUNT */}
          <div className="form-group">

            <label>Rounding Account</label>

            <input
              type="text"
              name="roundingAccount"
              value={formData.roundingAccount}
              onChange={handleChange}
            />

          </div>

          {/* REMARK 1 */}
          <div className="form-group textarea-group">

            <label>Remark1</label>

            <textarea
              name="remark1"
              value={formData.remark1}
              onChange={handleChange}
            ></textarea>

          </div>

          {/* REMARK 2 */}
          <div className="form-group textarea-group">

            <label>Remark2</label>

            <textarea
              name="remark2"
              value={formData.remark2}
              onChange={handleChange}
            ></textarea>

          </div>

          {/* WORKFLOW */}
          <div className="form-group full-width">

            <label>Workflow Comments</label>

            <textarea
              className="big-textarea"
              name="workflowComments"
              value={formData.workflowComments}
              onChange={handleChange}
            ></textarea>

          </div>

        </div>

        {/* BUTTONS */}
        <div className="action-buttons">

          <button className="draft-btn">
            Save as Draft
          </button>

          <button
            className="submit-btn"
            onClick={handleSubmit}
          >
            Submit
          </button>

          <button className="cancel-btn">
            Cancel
          </button>

        </div>

      </div>

    </div>
  );
};

export default CreateTransaction;