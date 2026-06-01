import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Createoutwardweighment.css";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";

const GIN_API       = "http://localhost:5000/api/goods-inward-note";
const WEIGHMENT_API = "http://localhost:5000/api/weighment";
const today         = new Date().toISOString().split("T")[0];

const blankGinFilters = {
  ginNumber: "", vendorCode: "", vehicleNo: "", poCpoNo: "",
  transactionCategory: "", status: "", fromDate: "", toDate: "",
};

const genWeighmentNo = () =>
  `WM/OUT/26-27/${Math.floor(100000 + Math.random() * 900000)}`;

const CreateOutwardWeighment = () => {
  const navigate = useNavigate();

  const [ginFilters,  setGinFilters]  = useState(blankGinFilters);
  const [ginResults,  setGinResults]  = useState([]);
  const [ginSearched, setGinSearched] = useState(false);
  const [ginLoading,  setGinLoading]  = useState(false);

  const handleGinFilterChange = (e) =>
    setGinFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleGinSearch = async () => {
    setGinLoading(true);
    setGinSearched(true);
    try {
      const params = new URLSearchParams();
      params.append("vehicleEntry", "Outward");
      Object.entries(ginFilters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await axios.get(`${GIN_API}?${params.toString()}`);
      setGinResults(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch GIN records");
    } finally {
      setGinLoading(false);
    }
  };

  const handleGinReset = () => {
    setGinFilters(blankGinFilters);
    setGinResults([]);
    setGinSearched(false);
  };

  /* ─────────────────────────────────────────────────────────────
     Click GIN No:
     1. Check if a weighment already exists.
     2a. YES → open /weighment-detail/:id
     2b. NO  → create new weighment pre-filled from GIN, then open detail
  ───────────────────────────────────────────────────────────── */
  const openOrCreateWeighment = async (e, gin) => {
    e.stopPropagation();
    const ginNo = gin?.ginNo;
    if (!ginNo) { alert("GIN number not found"); return; }

    try {
      const searchRes  = await axios.get(WEIGHMENT_API, {
        params: { inwardOutwardNoteNo: ginNo, transactionType: "Outward" },
      });
      const weighments = searchRes.data?.data || [];
      const existing   = weighments.find((w) => w.inwardOutwardNoteNo === ginNo) || weighments[0];

      if (existing?._id) {
        navigate(`/weighment-detail/${existing._id}`);
        return;
      }

      /* Create new weighment pre-filled from GIN */
      const newWeighment = {
        weighmentNo:         genWeighmentNo(),
        transactionType:     "Outward",
        transactionCategory: gin.transactionCategory || "",
        status:              "Open",
        inwardOutwardNoteNo: gin.ginNo,
        vehicleNo:           gin.vehicleNo            || "",
        partyName:           gin.vendorName           || "",
        site:                gin.site                 || "Factory Office-GYPMART INDIA",
        supplierInvoiceNo:   gin.challanInvoiceNo     || "",
        supplierInvoiceDate: gin.challanDate          || today,
        billDate:            gin.billDate             || today,
        weighmentDate:       gin.ginDate              || today,
        weighmentInDate:     gin.ginDate              || today,
        weighmentOutDate:    gin.ginDate              || today,
        remarks:             gin.remarks              || "",
        vendorCode:          gin.vendorCode           || "",
        vendorName:          gin.vendorName           || "",
        poCpoNo:             gin.poCpoNo              || "",
        manufacturerName:    gin.manufacturerName     || "",
        manufacturerCode:    gin.manufacturerCode     || "",
        challanDate:         gin.challanDate          || "",
        ewayDate:            gin.ewayDate             || "",
        billNo:              gin.billNo               || "",
      };

      const createRes = await axios.post(WEIGHMENT_API, newWeighment);
      if (createRes.data?.success && createRes.data?.data?._id) {
        navigate(`/weighment-detail/${createRes.data.data._id}`);
      } else {
        alert("Failed to create weighment: " + (createRes.data?.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="ciw-page">
      <ModuleNavbar />

      <div className="ciw-page-header">
        <button className="ciw-back-btn" onClick={() => navigate("/weighment-search")}>←</button>
        <h2>Create Outward Weighment</h2>
        <span className="ciw-badge outward">Outward</span>
      </div>

      <div className="ciw-card">
        <div className="ciw-section-title">Search Outward GIN Records</div>
        <div className="ciw-search-grid">

          <div className="ciw-field"><label>GIN Number</label>
            <input type="text" name="ginNumber" value={ginFilters.ginNumber}
              onChange={handleGinFilterChange} placeholder="GIN/26-27/..." /></div>

          <div className="ciw-field"><label>Vendor Code</label>
            <input type="text" name="vendorCode" value={ginFilters.vendorCode}
              onChange={handleGinFilterChange} /></div>

          <div className="ciw-field"><label>Vehicle No</label>
            <input type="text" name="vehicleNo" value={ginFilters.vehicleNo}
              onChange={handleGinFilterChange} /></div>

          <div className="ciw-field"><label>PO/CPO No</label>
            <input type="text" name="poCpoNo" value={ginFilters.poCpoNo}
              onChange={handleGinFilterChange} /></div>

          <div className="ciw-field"><label>Transaction Category</label>
            <select name="transactionCategory" value={ginFilters.transactionCategory}
              onChange={handleGinFilterChange}>
              <option value="">-- Select --</option>
              <option>Purchase</option><option>Sales</option>
            </select></div>

          <div className="ciw-field"><label>Status</label>
            <select name="status" value={ginFilters.status} onChange={handleGinFilterChange}>
              <option value="">-- Select --</option>
              <option>Open</option><option>Closed</option>
            </select></div>

          <div className="ciw-field"><label>From Date</label>
            <input type="date" name="fromDate" value={ginFilters.fromDate}
              onChange={handleGinFilterChange} /></div>

          <div className="ciw-field"><label>To Date</label>
            <input type="date" name="toDate" value={ginFilters.toDate}
              onChange={handleGinFilterChange} /></div>

        </div>
        <div className="ciw-search-actions">
          <button className="ciw-reset-btn" onClick={handleGinReset}>Reset</button>
          <button className="ciw-search-btn" onClick={handleGinSearch}>
            {ginLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {ginSearched && (
        <div className="ciw-card ciw-results-card">
          <div className="ciw-section-title">
            Outward GIN Records
            {ginResults.length > 0 && (
              <span className="ciw-count">
                {ginResults.length} record(s) — click GIN No to open / create weighment
              </span>
            )}
          </div>

          {ginLoading && <div className="ciw-placeholder">Loading...</div>}
          {!ginLoading && ginResults.length === 0 && (
            <div className="ciw-placeholder">No Outward GIN records found</div>
          )}

          {!ginLoading && ginResults.length > 0 && (
            <div className="ciw-table-wrap">
              <table className="ciw-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GIN No</th>
                    <th>GIN Date</th>
                    <th>Vehicle Entry</th>
                    <th>Vehicle No</th>
                    <th>PO/CPO No</th>
                    <th>Transaction Category</th>
                    <th>GIN Type</th>
                    <th>Vendor Code</th>
                    <th>Vendor Name</th>
                    <th>Manufacturer Code</th>
                    <th>Manufacturer Name</th>
                    <th>Challan/Invoice No</th>
                    <th>Challan Date</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>E-Way Date</th>
                    <th>Remarks</th>
                    <th>Status</th>
                    <th>Linked Weighment</th>
                  </tr>
                </thead>
                <tbody>
                  {ginResults.map((row, idx) => (
                    <tr key={row._id || idx}>
                      <td>{idx + 1}</td>

                      <td>
                        <button
                          className="ciw-gin-no-link"
                          onClick={(e) => openOrCreateWeighment(e, row)}
                          title={row.weighmentNo
                            ? `Open weighment: ${row.weighmentNo}`
                            : "No weighment yet — click to create one"}
                        >
                          {row.ginNo || "-"}
                        </button>
                      </td>

                      <td>{row.ginDate            || "-"}</td>
                      <td>
                        <span className={`ciw-entry-badge ${(row.vehicleEntry||"").toLowerCase()}`}>
                          {row.vehicleEntry || "-"}
                        </span>
                      </td>
                      <td>{row.vehicleNo           || "-"}</td>
                      <td>{row.poCpoNo             || "-"}</td>
                      <td>{row.transactionCategory || "-"}</td>
                      <td>{row.ginType             || "-"}</td>
                      <td>{row.vendorCode          || "-"}</td>
                      <td>{row.vendorName          || "-"}</td>
                      <td>{row.manufacturerCode    || "-"}</td>
                      <td>{row.manufacturerName    || "-"}</td>
                      <td>{row.challanInvoiceNo    || "-"}</td>
                      <td>{row.challanDate         || "-"}</td>
                      <td>{row.billNo              || "-"}</td>
                      <td>{row.billDate            || "-"}</td>
                      <td>{row.ewayDate            || "-"}</td>
                      <td>{row.remarks             || "-"}</td>
                      <td>
                        <span className={`ciw-status-badge ${(row.status||"").toLowerCase()}`}>
                          {row.status || "-"}
                        </span>
                      </td>
                      <td>
                        {row.weighmentNo
                          ? <span className="ciw-wt-linked">✓ {row.weighmentNo}</span>
                          : <span className="ciw-wt-none">Not linked</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateOutwardWeighment;