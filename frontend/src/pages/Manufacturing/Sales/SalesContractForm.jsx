import React, { useState, useEffect } from "react";
import "./Sales.css";
// import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";


const SalesContractForm = () => {
  const [formData, setFormData] = useState({
    contractNo: `SC-${Date.now()}`,
    contractDate: "",
    customer: "",
    productType: "",
    contractQty: "",
    rate: "",
    paymentTerms: "",
    dueDays: "",
    dueDate: "",
    remarks: "",
  });

  const customers = [
    "ABC Industries",
    "XYZ Traders",
    "Global Chemicals",
    "Sunrise Pvt Ltd",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Auto Calculate Due Date
  useEffect(() => {
    if (formData.contractDate && formData.dueDays) {
      const date = new Date(formData.contractDate);
      date.setDate(date.getDate() + Number(formData.dueDays));

      const formattedDate = date.toISOString().split("T")[0];

      setFormData((prev) => ({
        ...prev,
        dueDate: formattedDate,
      }));
    }
  }, [formData.contractDate, formData.dueDays]);

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(formData);
    alert("Sales Contract Saved Successfully");
  };

  return (
    
    <div className="container">
      <h2>Sales Contract Form</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Contract No</label>
          <input
            type="text"
            value={formData.contractNo}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Contract Date</label>
          <input
            type="date"
            name="contractDate"
            value={formData.contractDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Customer / Party</label>
          <select
            name="customer"
            value={formData.customer}
            onChange={handleChange}
            required
          >
            <option value="">Select Customer</option>
            {customers.map((customer, index) => (
              <option key={index} value={customer}>
                {customer}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Product Type</label>
          <select
            name="productType"
            value={formData.productType}
            onChange={handleChange}
            required
          >
            <option value="">Select Product Type</option>
            <option value="TE">TE</option>
            <option value="UT">UT</option>
          </select>
        </div>

        <div className="form-group">
          <label>Contract Qty</label>
          <input
            type="number"
            name="contractQty"
            value={formData.contractQty}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Rate (₹)</label>
          <input
            type="number"
            name="rate"
            value={formData.rate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Payment Terms</label>
          <select
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            required
          >
            <option value="">Select Payment Terms</option>
            <option value="Prepaid">Prepaid</option>
            <option value="Postpaid">Postpaid</option>
          </select>
        </div>

        <div className="form-group">
          <label>Due Days</label>
          <input
            type="number"
            name="dueDays"
            value={formData.dueDays}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Due Date</label>
          <input
            type="date"
            value={formData.dueDate}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows="4"
          />
        </div>

        <button type="submit">Save Contract</button>
      </form>
    </div>
  );
};

export default SalesContractForm;