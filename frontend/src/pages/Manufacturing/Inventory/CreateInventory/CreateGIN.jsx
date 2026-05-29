import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateGIN.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

const CreateGIN = () => {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  /* Transaction codes fetched from DocumentSequence */
  const [transactionCodes, setTransactionCodes] = useState([]);

  const [form, setForm] = useState({
    ginNo:               "",
    poCpoNo:             "",
    status:              "Open",
    site:                "Factory Office-GYPMART INDIA",
    ginDate:             "",
    ginDescription:      "",
    ginType:             "Domestic",
    deliveryMode:        "By Road",
    transactionCategory: "",
    vendorCode:          "",
    vendorName:          "",
    manufacturerAddress: "",
    vehicleEntry:        "Inward",
    manufacturerCode:    "",
    manufacturerName:    "",
    vehicleNo:           "",
    challanInvoiceNo:    "",
    challanDate:         "",
    billDate:            "",
    ewayDate:            "",
    remarks:             "",
    comments:            "",
  });

  /* ── AUTO GENERATE GIN No + default dates ── */
  useEffect(() => {
    const rand  = Math.floor(100000 + Math.random() * 900000);
    const today = new Date().toISOString().split("T")[0];
    setForm((p) => ({
      ...p,
      ginNo:       `GIN/26-27/${rand}`,
      ginDate:     today,
      challanDate: today,
      billDate:    today,
      ewayDate:    today,
    }));
  }, []);

  /* ── FETCH generated codes from DocumentSequence ── */
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res  = await axios.get("/api/document-sequence");
        const data = res.data;
        /* Each record has generatedCode — show that in dropdown */
        const codes = data
          .map((item) => item.generatedCode)
          .filter(Boolean);
        setTransactionCodes(codes);
      } catch (err) {
        console.error("Failed to fetch document sequences:", err);
      }
    };
    fetchCodes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  /* ── SAVE to backend ── */
  const handleSave = async () => {
    if (!form.ginDate) {
      alert("GIN Date is required");
      return;
    }
    if (!form.challanInvoiceNo) {
      alert("Challan/Invoice No is required");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post("/api/goods-inward-note", form);
      if (res.data.success) {
        alert("Goods Inward Note Saved Successfully");
        navigate("/goods-inward-note");
      }
    } catch (err) {
      console.error(err);
      alert("Save Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cgin-page">

      <ModuleNavbar />

      {/* ── HEADER ── */}
      <div className="cgin-header">
        <div className="cgin-header-left">
          <button
            className="cgin-back-btn"
            onClick={() => navigate("/goods-inward-note")}
          >
            ←
          </button>
          <h2>Create Goods Inward Note</h2>
        </div>
      </div>

      {/* ── FORM CARD ── */}
      <div className="cgin-card">

        <div className="cgin-section-title">GIN INFORMATION</div>

        <div className="cgin-grid">

          {/* ROW 1 */}
          <div className="cgin-field">
            <label>GIN No</label>
            <input type="text" value={form.ginNo} readOnly />
          </div>

          <div className="cgin-field">
            <label>PO/CPO No</label>
            <input
              type="text"
              name="poCpoNo"
              value={form.poCpoNo}
              onChange={handleChange}
              placeholder="Enter PO/CPO No"
            />
          </div>

          <div className="cgin-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Open</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Site</label>
            <select name="site" value={form.site} onChange={handleChange}>
              <option>Factory Office-GYPMART INDIA</option>
            </select>
          </div>

          {/* ROW 2 */}
          <div className="cgin-field">
            <label>GIN Date <span className="req">*</span></label>
            <input
              type="date"
              name="ginDate"
              value={form.ginDate}
              onChange={handleChange}
              className="inp-highlight"
            />
          </div>

          <div className="cgin-field">
            <label>GIN Description</label>
            <input
              type="text"
              name="ginDescription"
              value={form.ginDescription}
              onChange={handleChange}
              placeholder="Enter description"
            />
          </div>

          <div className="cgin-field">
            <label>GIN Type</label>
            <select name="ginType" value={form.ginType} onChange={handleChange}>
              <option>Domestic</option>
              <option>International</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Delivery Mode</label>
            <select name="deliveryMode" value={form.deliveryMode} onChange={handleChange}>
              <option>By Road</option>
              <option>By Train</option>
              <option>By Air</option>
              <option>By Sea</option>
            </select>
          </div>

          {/* ROW 3 */}
          <div className="cgin-field">
            <label>
              Transaction Category
              <span className="field-hint"> (Transaction Code)</span>
            </label>
            <select
              name="transactionCategory"
              value={form.transactionCategory}
              onChange={handleChange}
            >
              <option value="">-- Select Transaction Code --</option>
              {transactionCodes.map((code, i) => (
                <option key={i} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="cgin-field">
            <label>Vendor Code</label>
            <input
              type="text"
              name="vendorCode"
              value={form.vendorCode}
              onChange={handleChange}
              placeholder="e.g. CSM095"
            />
          </div>

          <div className="cgin-field">
            <label>Vendor Name</label>
            <input
              type="text"
              name="vendorName"
              value={form.vendorName}
              onChange={handleChange}
              placeholder="Enter vendor name"
            />
          </div>

          <div className="cgin-field">
            <label>Manufacturer Address</label>
            <input
              type="text"
              name="manufacturerAddress"
              value={form.manufacturerAddress}
              onChange={handleChange}
              placeholder="Enter address"
            />
          </div>

          {/* ROW 4 */}
          <div className="cgin-field">
            <label>Vehicle Entry</label>
            <select name="vehicleEntry" value={form.vehicleEntry} onChange={handleChange}>
              <option>Inward</option>
              <option>Outward</option>
            </select>
          </div>

          <div className="cgin-field">
            <label>Manufacturer Code</label>
            <input
              type="text"
              name="manufacturerCode"
              value={form.manufacturerCode}
              onChange={handleChange}
              placeholder="Enter manufacturer code"
            />
          </div>

          <div className="cgin-field">
            <label>Manufacturer Name</label>
            <input
              type="text"
              name="manufacturerName"
              value={form.manufacturerName}
              onChange={handleChange}
              placeholder="Enter manufacturer name"
            />
          </div>

          <div className="cgin-field">
            <label>Vehicle No</label>
            <input
              type="text"
              name="vehicleNo"
              value={form.vehicleNo}
              onChange={handleChange}
              placeholder="Enter vehicle no"
            />
          </div>

          {/* ROW 5 */}
          <div className="cgin-field">
            <label>Challan/Invoice No <span className="req">*</span></label>
            <input
              type="text"
              name="challanInvoiceNo"
              value={form.challanInvoiceNo}
              onChange={handleChange}
              placeholder="Enter challan/invoice no"
              className="inp-highlight"
            />
          </div>

          <div className="cgin-field">
            <label>Challan Date <span className="req">*</span></label>
            <input
              type="date"
              name="challanDate"
              value={form.challanDate}
              onChange={handleChange}
              className="inp-highlight"
            />
          </div>

          <div className="cgin-field">
            <label>Bill Date</label>
            <input
              type="date"
              name="billDate"
              value={form.billDate}
              onChange={handleChange}
            />
          </div>

          <div className="cgin-field">
            <label>E-Way Date</label>
            <input
              type="date"
              name="ewayDate"
              value={form.ewayDate}
              onChange={handleChange}
            />
          </div>

        </div>

        {/* ── REMARKS & COMMENTS ── */}
        <div className="cgin-full-width">
          <div className="cgin-field">
            <label>Remarks</label>
            <textarea
              rows="4"
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              placeholder="Enter remarks..."
            />
          </div>
          <div className="cgin-field">
            <label>Comments</label>
            <textarea
              rows="4"
              name="comments"
              value={form.comments}
              onChange={handleChange}
              placeholder="Enter comments..."
            />
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="cgin-actions">
          <button
            className="btn-cancel"
            onClick={() => navigate("/goods-inward-note")}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateGIN;
