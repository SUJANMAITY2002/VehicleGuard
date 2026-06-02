import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Createoutwardweighment.css";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";

const GIN_API = "/api/goods-inward-note";
const WEIGHMENT_API = "/api/weighment";

const blankGinFilters = {
  ginNumber: "",
  vendorCode: "",
  vehicleNo: "",
  poCpoNo: "",
  transactionCategory: "",
  status: "",
  fromDate: "",
  toDate: "",
};

const CreateOutwardWeighment = () => {
  const navigate = useNavigate();

  const [ginFilters, setGinFilters] = useState(blankGinFilters);
  const [ginResults, setGinResults] = useState([]);
  const [ginSearched, setGinSearched] = useState(false);
  const [ginLoading, setGinLoading] = useState(false);

  const handleGinFilterChange = (e) => {
    setGinFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleGinSearch = async () => {
    setGinLoading(true);
    setGinSearched(true);

    try {
      const params = new URLSearchParams();
      params.append("vehicleEntry", "Outward");

      Object.entries(ginFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

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

  const openWeighmentDetail = async (e, gin) => {
    e.stopPropagation();

    const ginNo = gin?.ginNo;
    if (!ginNo) {
      alert("GIN number not found");
      return;
    }

    try {
      const res = await axios.get(WEIGHMENT_API, {
        params: {
          inwardOutwardNoteNo: ginNo,
          transactionType: "Outward",
        },
      });

      const weighments = res.data?.data || [];
      const match =
        weighments.find((w) => w.inwardOutwardNoteNo === ginNo) ||
        weighments[0];

      if (!match?._id) {
        alert("No weighment record found for this GIN number");
        return;
      }

      navigate(`/weighment-detail/${match._id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to open weighment details");
    }
  };

  return (
    <div className="ciw-page">
      <ModuleNavbar />

      <div className="ciw-page-header">
        <button
          className="ciw-back-btn"
          onClick={() => navigate("/weighment-search")}
        >
          ←
        </button>
        <h2>Create Outward Weighment</h2>
        <span className="ciw-badge outward">Outward</span>
      </div>

      <div className="ciw-card">
        <div className="ciw-section-title">Search Outward GIN Records</div>

        <div className="ciw-search-grid">
          <div className="ciw-field">
            <label>GIN Number</label>
            <input
              type="text"
              name="ginNumber"
              value={ginFilters.ginNumber}
              onChange={handleGinFilterChange}
              placeholder="GIN/26-27/..."
            />
          </div>

          <div className="ciw-field">
            <label>Vendor Code</label>
            <input
              type="text"
              name="vendorCode"
              value={ginFilters.vendorCode}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>Vehicle No</label>
            <input
              type="text"
              name="vehicleNo"
              value={ginFilters.vehicleNo}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>PO/CPO No</label>
            <input
              type="text"
              name="poCpoNo"
              value={ginFilters.poCpoNo}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>Transaction Category</label>
            <select
              name="transactionCategory"
              value={ginFilters.transactionCategory}
              onChange={handleGinFilterChange}
            >
              <option value="">-- Select --</option>
              <option>Purchase</option>
              <option>Sales</option>
            </select>
          </div>

          <div className="ciw-field">
            <label>Status</label>
            <select
              name="status"
              value={ginFilters.status}
              onChange={handleGinFilterChange}
            >
              <option value="">-- Select --</option>
              <option>Open</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="ciw-field">
            <label>From Date</label>
            <input
              type="date"
              name="fromDate"
              value={ginFilters.fromDate}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>To Date</label>
            <input
              type="date"
              name="toDate"
              value={ginFilters.toDate}
              onChange={handleGinFilterChange}
            />
          </div>
        </div>

        <div className="ciw-search-actions">
          <button className="ciw-reset-btn" onClick={handleGinReset}>
            Reset
          </button>
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
                {ginResults.length} record(s) - click GIN No to open weighment details
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
                    <th>Vendor Code</th>
                    <th>Vendor Name</th>
                    <th>Manufacturer Name</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Remarks</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {ginResults.map((row, idx) => (
                    <tr key={row._id || idx}>
                      <td>{idx + 1}</td>

                      <td>
                        <button
                          className="ciw-gin-no-link"
                          onClick={(e) => openWeighmentDetail(e, row)}
                          title="Click to view weighment details"
                        >
                          {row.ginNo || "-"}
                        </button>
                      </td>

                      <td>{row.ginDate || "-"}</td>

                      <td>
                        <span
                          className={`ciw-entry-badge ${(
                            row.vehicleEntry || ""
                          ).toLowerCase()}`}
                        >
                          {row.vehicleEntry || "-"}
                        </span>
                      </td>

                      <td>{row.vehicleNo || "-"}</td>
                      <td>{row.poCpoNo || "-"}</td>
                      <td>{row.transactionCategory || "-"}</td>
                      <td>{row.vendorCode || "-"}</td>
                      <td>{row.vendorName || "-"}</td>
                      <td>{row.manufacturerName || "-"}</td>
                      <td>{row.billNo || "-"}</td>
                      <td>{row.billDate || "-"}</td>
                      <td>{row.remarks || "-"}</td>

                      <td>
                        <span
                          className={`ciw-status-badge ${(
                            row.status || ""
                          ).toLowerCase()}`}
                        >
                          {row.status || "-"}
                        </span>
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