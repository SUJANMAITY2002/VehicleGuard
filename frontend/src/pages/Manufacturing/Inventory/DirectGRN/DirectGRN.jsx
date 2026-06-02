import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DirectGRN.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

const API = "/api/direct-grn";

const EMPTY_FILTERS = {
  fromDate:            "",
  toDate:              "",
  grnNo:               "",
  status:              "",
  vendorCode:          "",
  vendorName:          "",
  vehicleNo:           "",
  site:                "",
  invoiceNo:           "",
  invoiceDate:         "",
  transactionCategory: "",
  deliveryMode:        "",
  grnType:             "",
};

const DirectGRN = () => {

  const navigate = useNavigate();

  const [filters,  setFilters]  = useState(EMPTY_FILTERS);
  const [results,  setResults]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});

  /* ── filter handlers ── */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setResults([]);
    setSearched(false);
    setEditId(null);
  };

  const handleApply = async () => {
    setLoading(true);
    setEditId(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res  = await fetch(`${API}?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  /* ── edit handlers ── */
  const startEdit  = (row) => { setEditId(row._id); setEditData({ ...row }); };
  const cancelEdit = ()    => { setEditId(null);    setEditData({}); };

  const handleUpdate = async () => {
    try {
      const res  = await fetch(`${API}/${editId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Update Failed"); return; }
      setResults((prev) => prev.map((r) => (r._id === editId ? data.data : r)));
      setEditId(null);
      alert("Updated Successfully");
    } catch (err) {
      console.error(err);
      alert("Update Failed");
    }
  };

  /* ── delete handler ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const res  = await fetch(`${API}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Delete Failed"); return; }
      setResults((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete Failed");
    }
  };

  /* ── tiny helpers ── */
  const ed  = (field)       => editData[field] || "";
  const set = (field) => (e) => setEditData((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="dgrn-page">

      <ModuleNavbar />

      {/* ── HEADER ── */}
      <div className="dgrn-header">
        <h2>Direct GRN</h2>
        <button
          className="dgrn-create-btn"
          onClick={() => navigate("/create-direct-grn")}
        >
          + Create
        </button>
      </div>

      <div className="dgrn-body">

        {/* ── FILTER PANEL ── */}
        <div className="dgrn-filter-panel">

          <div className="dgrn-filter-title">Search Filters</div>

          <div className="dgrn-filter-grid">

            <div className="dgrn-fg">
              <label>From Date</label>
              <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} />
            </div>

            <div className="dgrn-fg">
              <label>To Date</label>
              <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} />
            </div>

            <div className="dgrn-fg">
              <label>GRN No</label>
              <input type="text" name="grnNo" value={filters.grnNo} onChange={handleFilterChange} placeholder="DGRN/26-27/..." />
            </div>

            <div className="dgrn-fg">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All</option>
                <option>Open</option>
                <option>Closed</option>
                <option>Draft</option>
              </select>
            </div>

            <div className="dgrn-fg">
              <label>Vendor Code</label>
              <input type="text" name="vendorCode" value={filters.vendorCode} onChange={handleFilterChange} />
            </div>

            <div className="dgrn-fg">
              <label>Vendor Name</label>
              <input type="text" name="vendorName" value={filters.vendorName} onChange={handleFilterChange} />
            </div>

            <div className="dgrn-fg">
              <label>Vehicle No</label>
              <input type="text" name="vehicleNo" value={filters.vehicleNo} onChange={handleFilterChange} />
            </div>

            <div className="dgrn-fg">
              <label>Site</label>
              <select name="site" value={filters.site} onChange={handleFilterChange}>
                <option value="">Select</option>
                <option>Factory Office-GYPMART INDIA</option>
              </select>
            </div>

            <div className="dgrn-fg">
              <label>Invoice No</label>
              <input type="text" name="invoiceNo" value={filters.invoiceNo} onChange={handleFilterChange} />
            </div>

            <div className="dgrn-fg">
              <label>Invoice Date</label>
              <input type="date" name="invoiceDate" value={filters.invoiceDate} onChange={handleFilterChange} />
            </div>

            <div className="dgrn-fg">
              <label>Transaction Category</label>
              <select name="transactionCategory" value={filters.transactionCategory} onChange={handleFilterChange}>
                <option value="">Select</option>
                <option>Purchase</option>
                <option>Sales</option>
              </select>
            </div>

            <div className="dgrn-fg">
              <label>Delivery Mode</label>
              <select name="deliveryMode" value={filters.deliveryMode} onChange={handleFilterChange}>
                <option value="">Select</option>
                <option>BY AIR-BY AIR</option>
                <option>By Road</option>
                <option>By Train</option>
                <option>By Air</option>
                <option>By Sea</option>
              </select>
            </div>

            <div className="dgrn-fg">
              <label>GRN Type</label>
              <select name="grnType" value={filters.grnType} onChange={handleFilterChange}>
                <option value="">Select</option>
                <option>F and A Impact</option>
                <option>Domestic</option>
                <option>International</option>
                <option>No Impact</option>
              </select>
            </div>

          </div>

          <div className="dgrn-filter-actions">
            <button className="dgrn-reset-btn" onClick={handleReset}>Reset</button>
            <button className="dgrn-apply-btn" onClick={handleApply} disabled={loading}>
              {loading ? "Searching..." : "Apply"}
            </button>
          </div>

        </div>

        {/* ── RESULT AREA ── */}
        <div className="dgrn-result-area">

          {!searched && !loading && (
            <div className="dgrn-placeholder">Apply filters to display results</div>
          )}

          {loading && (
            <div className="dgrn-placeholder">Loading...</div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="dgrn-placeholder">No records found</div>
          )}

          {searched && !loading && results.length > 0 && (
            <div className="dgrn-table-wrap">
              <table className="dgrn-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GRN No</th>
                    <th>GRN Date</th>
                    <th>Status</th>
                    <th>GRN Type</th>
                    <th>Transaction Category</th>
                    <th>Vendor Code</th>
                    <th>Vendor Name</th>
                    <th>Site</th>
                    <th>Challan/Invoice No</th>
                    <th>Challan Date</th>
                    <th>Delivery Mode</th>
                    <th>Vehicle No</th>
                    <th>Mfr Code</th>
                    <th>Mfr Name</th>
                    <th>Bill Date</th>
                    <th>E-Way Date</th>
                    <th>Linked GIN No</th>
                    <th>Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => {
                    const isEditing = editId === row._id;
                    return (
                      <tr key={row._id || idx} className={isEditing ? "dgrn-editing-row" : ""}>

                        <td>{idx + 1}</td>

                        {/* GRN No — always read-only */}
                        <td><strong>{row.grnNo || "-"}</strong></td>

                        {/* GRN Date */}
                        <td>
                          {isEditing
                            ? <input type="date" className="dgrn-inline dgrn-inline-date" value={ed("grnDate")} onChange={set("grnDate")} />
                            : row.grnDate || "-"}
                        </td>

                        {/* Status */}
                        <td>
                          {isEditing
                            ? (
                              <select className="dgrn-inline" value={ed("status")} onChange={set("status")}>
                                <option>Open</option>
                                <option>Closed</option>
                                <option>Draft</option>
                              </select>
                            )
                            : <span className={`dgrn-badge ${(row.status||"").toLowerCase() === "open" ? "dgrn-badge-open" : "dgrn-badge-closed"}`}>{row.status || "-"}</span>}
                        </td>

                        {/* GRN Type */}
                        <td>
                          {isEditing
                            ? (
                              <select className="dgrn-inline" value={ed("grnType")} onChange={set("grnType")}>
                                <option>F and A Impact</option>
                                <option>Domestic</option>
                                <option>International</option>
                                <option>No Impact</option>
                              </select>
                            )
                            : row.grnType || "-"}
                        </td>

                        {/* Transaction Category */}
                        <td>
                          {isEditing
                            ? (
                              <select className="dgrn-inline" value={ed("transactionCategory")} onChange={set("transactionCategory")}>
                                <option value="">Select</option>
                                <option>Purchase</option>
                                <option>Sales</option>
                              </select>
                            )
                            : row.transactionCategory || "-"}
                        </td>

                        {/* Vendor Code */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline" value={ed("vendorCode")} onChange={set("vendorCode")} />
                            : row.vendorCode || "-"}
                        </td>

                        {/* Vendor Name */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline dgrn-inline-wide" value={ed("vendorName")} onChange={set("vendorName")} />
                            : row.vendorName || "-"}
                        </td>

                        {/* Site */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline" value={ed("site")} onChange={set("site")} />
                            : row.site || "-"}
                        </td>

                        {/* Challan/Invoice No */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline" value={ed("challanInvoiceNo")} onChange={set("challanInvoiceNo")} />
                            : row.challanInvoiceNo || "-"}
                        </td>

                        {/* Challan Date */}
                        <td>
                          {isEditing
                            ? <input type="date" className="dgrn-inline dgrn-inline-date" value={ed("challanDate")} onChange={set("challanDate")} />
                            : row.challanDate || "-"}
                        </td>

                        {/* Delivery Mode */}
                        <td>
                          {isEditing
                            ? (
                              <select className="dgrn-inline" value={ed("deliveryMode")} onChange={set("deliveryMode")}>
                                <option>BY AIR-BY AIR</option>
                                <option>By Road</option>
                                <option>By Train</option>
                                <option>By Air</option>
                                <option>By Sea</option>
                              </select>
                            )
                            : row.deliveryMode || "-"}
                        </td>

                        {/* Vehicle No */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline" value={ed("vehicleNo")} onChange={set("vehicleNo")} />
                            : row.vehicleNo || "-"}
                        </td>

                        {/* Manufacturer Code */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline" value={ed("manufacturerCode")} onChange={set("manufacturerCode")} />
                            : row.manufacturerCode || "-"}
                        </td>

                        {/* Manufacturer Name */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline dgrn-inline-wide" value={ed("manufacturerName")} onChange={set("manufacturerName")} />
                            : row.manufacturerName || "-"}
                        </td>

                        {/* Bill Date */}
                        <td>
                          {isEditing
                            ? <input type="date" className="dgrn-inline dgrn-inline-date" value={ed("billDate")} onChange={set("billDate")} />
                            : row.billDate || "-"}
                        </td>

                        {/* E-Way Date */}
                        <td>
                          {isEditing
                            ? <input type="date" className="dgrn-inline dgrn-inline-date" value={ed("ewayDate")} onChange={set("ewayDate")} />
                            : row.ewayDate || "-"}
                        </td>

                        {/* Linked GIN No — read-only in search, just display */}
                        <td>{row.linkedGinNo || "-"}</td>

                        {/* Remarks */}
                        <td>
                          {isEditing
                            ? <input className="dgrn-inline dgrn-inline-wide" value={ed("remarks")} onChange={set("remarks")} />
                            : row.remarks || "-"}
                        </td>

                        {/* Actions */}
                        <td className="dgrn-action-cell">
                          {isEditing ? (
                            <>
                              <button className="dgrn-save-btn"   onClick={handleUpdate}>Save</button>
                              <button className="dgrn-cancel-btn" onClick={cancelEdit}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="dgrn-edit-btn"   onClick={() => startEdit(row)}>Edit</button>
                              <button className="dgrn-delete-btn" onClick={() => handleDelete(row._id)}>Delete</button>
                            </>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default DirectGRN;