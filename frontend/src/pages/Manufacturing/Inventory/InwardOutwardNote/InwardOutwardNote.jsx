import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./InwardOutwardNote.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const GIN_API = `${API_URL}/api/goods-inward-note`;

const blankFilters = {
  fromDate:"", toDate:"", vendorCode:"", status:"", vendorName:"",
  itemType:"", itemCategoryCode:"", transactionCategory:"", itemName:"",
  poCpoNo:"", itemGroup:"", itemCode:"", ginDescription:"", ginNumber:"",
  ginType:"", site:"", challanInvoiceNo:"", challanDate:"",
};

const InwardOutwardNote = () => {
  const navigate = useNavigate();

  const [filters,  setFilters]  = useState(blankFilters);
  const [results,  setResults]  = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => { fetchData(blankFilters); }, []);

  const fetchData = async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res  = await fetch(`${GIN_API}?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setResults([]); }
    finally { setLoading(false); setSearched(true); }
  };

  const handleChange = (e) => setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleApply  = () => fetchData(filters);
  const handleReset  = () => { setFilters(blankFilters); fetchData(blankFilters); };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await fetch(`${GIN_API}/${id}`, { method: "DELETE" });
      setResults((p) => p.filter((r) => r._id !== id));
    } catch { alert("Delete Failed"); }
  };

  const handleUpdate = async () => {
    try {
      const res  = await fetch(`${GIN_API}/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); return; }
      setResults((p) => p.map((r) => (r._id === editId ? data.data : r)));
      setEditId(null);
      alert("Updated Successfully");
    } catch { alert("Update Failed"); }
  };

  const ed = (field, type = "text") => (
    <input type={type} value={editData[field] || ""}
      onChange={(e) => setEditData((p) => ({ ...p, [field]: e.target.value }))}
      className="gin-inline-input" />
  );
  const edSel = (field, options) => (
    <select value={editData[field] || ""}
      onChange={(e) => setEditData((p) => ({ ...p, [field]: e.target.value }))}
      className="gin-inline-input">
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  const COLS = [
    "#","GIN No","GIN Date","PO/CPO No","Transaction Category","GIN Description",
    "GIN Type","Delivery Mode","Vendor Code","Vendor Name","Manufacturer Code",
    "Manufacturer Name","Manufacturer Address","Vehicle Entry","Vehicle No",
    "Challan/Invoice No","Challan Date","Bill Date","E-Way Date","Site","Status",
    "Remarks","Comments","Actions",
  ];

  const renderRow = (row, index) => {
    const isEdit = editId === row._id;
    return (
      <tr key={row._id || index} className={isEdit ? "gin-editing-row" : ""}>
        <td>{index + 1}</td>

        {/* ── GIN No — HYPERLINK ── */}
        <td>
          {isEdit ? (
            <strong>{row.ginNo || "-"}</strong>
          ) : (
            <button
              className="gin-no-link"
              onClick={() => navigate(`/gin-detail/${row._id}`)}
              title="Click to view full details"
            >
              {row.ginNo || "-"}
            </button>
          )}
        </td>

        <td>{isEdit ? ed("ginDate","date")                                     : row.ginDate || "-"}</td>
        <td>{isEdit ? ed("poCpoNo")                                            : row.poCpoNo || "-"}</td>
        <td>{isEdit ? ed("transactionCategory")                                : row.transactionCategory || "-"}</td>
        <td>{isEdit ? ed("ginDescription")                                     : row.ginDescription || "-"}</td>
        <td>{isEdit ? edSel("ginType",["Domestic","International"])            : row.ginType || "-"}</td>
        <td>{isEdit ? edSel("deliveryMode",["By Road","By Train","By Air","By Sea"]) : row.deliveryMode || "-"}</td>
        <td>{isEdit ? ed("vendorCode")                                         : row.vendorCode || "-"}</td>
        <td>{isEdit ? ed("vendorName")                                         : row.vendorName || "-"}</td>
        <td>{isEdit ? ed("manufacturerCode")                                   : row.manufacturerCode || "-"}</td>
        <td>{isEdit ? ed("manufacturerName")                                   : row.manufacturerName || "-"}</td>
        <td>{isEdit ? ed("manufacturerAddress")                                : row.manufacturerAddress || "-"}</td>

        <td>
          {isEdit ? edSel("vehicleEntry",["Inward","Outward"]) : (
            <span className={`gin-entry-badge ${(row.vehicleEntry||"").toLowerCase()}`}>
              {row.vehicleEntry || "-"}
            </span>
          )}
        </td>

        <td>{isEdit ? ed("vehicleNo")          : row.vehicleNo || "-"}</td>
        <td>{isEdit ? ed("challanInvoiceNo")   : row.challanInvoiceNo || "-"}</td>
        <td>{isEdit ? ed("challanDate","date") : row.challanDate || "-"}</td>
        <td>{isEdit ? ed("billDate","date")    : row.billDate || "-"}</td>
        <td>{isEdit ? ed("ewayDate","date")    : row.ewayDate || "-"}</td>
        <td>{isEdit ? ed("site")               : row.site || "-"}</td>

        <td>
          {isEdit ? edSel("status",["Open","Closed"]) : (
            <span className={`gin-status-badge ${(row.status||"").toLowerCase()}`}>
              {row.status || "-"}
            </span>
          )}
        </td>

        <td>{isEdit ? ed("remarks")  : row.remarks  || "-"}</td>
        <td>{isEdit ? ed("comments") : row.comments || "-"}</td>

        <td className="gin-action-cell">
          {isEdit ? (
            <>
              <button className="save-btn"        onClick={handleUpdate}>Save</button>
              <button className="cancel-edit-btn" onClick={() => setEditId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="edit-btn"   onClick={() => { setEditId(row._id); setEditData({ ...row }); }}>Edit</button>
              <button className="delete-btn" onClick={() => handleDelete(row._id)}>Delete</button>
            </>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="gin-search-page">
      <ModuleNavbar />

      <div className="gin-search-header">
        <h2>Inward Outward Note</h2>
        <button className="create-btn" onClick={() => navigate("/create-goods-inward-note")}>+ Create</button>
      </div>

      <div className="gin-body">

        <div className="filter-panel">
          <div className="filter-section-title">Search Filters</div>
          <div className="filter-grid">
            <div className="filter-group"><label>From Date</label>
              <input type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} /></div>
            <div className="filter-group"><label>To Date</label>
              <input type="date" name="toDate" value={filters.toDate} onChange={handleChange} /></div>
            <div className="filter-group"><label>GIN Number</label>
              <input type="text" name="ginNumber" value={filters.ginNumber} onChange={handleChange} /></div>
            <div className="filter-group"><label>Status</label>
              <select name="status" value={filters.status} onChange={handleChange}>
                <option value="">All</option><option>Open</option><option>Closed</option>
              </select></div>
            <div className="filter-group"><label>Vendor Code</label>
              <input type="text" name="vendorCode" value={filters.vendorCode} onChange={handleChange} /></div>
            <div className="filter-group"><label>Vendor Name</label>
              <input type="text" name="vendorName" value={filters.vendorName} onChange={handleChange} /></div>
            <div className="filter-group"><label>PO/CPO No</label>
              <input type="text" name="poCpoNo" value={filters.poCpoNo} onChange={handleChange} /></div>
            <div className="filter-group"><label>Transaction Category</label>
              <input type="text" name="transactionCategory" value={filters.transactionCategory} onChange={handleChange} /></div>
            <div className="filter-group"><label>GIN Type</label>
              <select name="ginType" value={filters.ginType} onChange={handleChange}>
                <option value="">All</option><option>Domestic</option><option>International</option>
              </select></div>
            <div className="filter-group"><label>GIN Description</label>
              <input type="text" name="ginDescription" value={filters.ginDescription} onChange={handleChange} /></div>
            <div className="filter-group"><label>Challan Invoice No</label>
              <input type="text" name="challanInvoiceNo" value={filters.challanInvoiceNo} onChange={handleChange} /></div>
            <div className="filter-group"><label>Site</label>
              <select name="site" value={filters.site} onChange={handleChange}>
                <option value="">All</option><option>Factory Office-GYPMART INDIA</option>
              </select></div>
            <div className="filter-group"><label>Item Type</label>
              <select name="itemType" value={filters.itemType} onChange={handleChange}>
                <option value="">Select</option><option>Raw Material</option><option>Finished Goods</option>
              </select></div>
            <div className="filter-group"><label>Item Category</label>
              <input type="text" name="itemCategoryCode" value={filters.itemCategoryCode} onChange={handleChange} /></div>
            <div className="filter-group"><label>Item Name</label>
              <input type="text" name="itemName" value={filters.itemName} onChange={handleChange} /></div>
            <div className="filter-group"><label>Item Code</label>
              <input type="text" name="itemCode" value={filters.itemCode} onChange={handleChange} /></div>
          </div>
          <div className="filter-actions">
            <button className="reset-btn" onClick={handleReset}>Reset</button>
            <button className="apply-btn" onClick={handleApply}>{loading ? "Searching..." : "Apply"}</button>
          </div>
        </div>

        <div className="result-area">
          {loading && <div className="result-placeholder">Loading...</div>}
          {!loading && searched && (
            results.length === 0
              ? <div className="result-placeholder">No records found</div>
              : (
                <div className="result-table-wrap">
                  <table className="gin-table">
                    <thead><tr>{COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>{results.map((row, i) => renderRow(row, i))}</tbody>
                  </table>
                </div>
              )
          )}
        </div>

      </div>
    </div>
  );
};

export default InwardOutwardNote;