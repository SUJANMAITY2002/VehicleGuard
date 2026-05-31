import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./WeighmentSearch.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

const API = "http://localhost:5000/api/weighment";

const blankFilters = {
  fromDate: "", toDate: "", weighmentNo: "", vehicleNo: "",
  inwardOutwardNoteNo: "", status: "", partyName: "", site: "",
  transactionType: "", transactionCategory: "", listReversal: false,
};

const WeighmentSearch = () => {
  const navigate = useNavigate();

  const [filters,        setFilters]        = useState(blankFilters);
  const [results,        setResults]        = useState([]);
  const [searched,       setSearched]       = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [editId,         setEditId]         = useState(null);
  const [editRow,        setEditRow]        = useState({});
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  useEffect(() => { fetchData(blankFilters); }, []);

  const fetchData = async (f) => {
    setLoading(true); setSearched(true);
    try {
      const params = {};
      Object.entries(f).forEach(([k, v]) => { if (v !== "" && v !== false) params[k] = v; });
      const res = await axios.get(API, { params });
      setResults(res.data.data || []);
    } catch (err) {
      console.error(err); alert("Failed to fetch records");
    } finally { setLoading(false); }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleApply = () => fetchData(filters);
  const handleReset = () => { setFilters(blankFilters); fetchData(blankFilters); };

  /* ── inline edit ── */
  const startEdit  = (row) => { setEditId(row._id); setEditRow({ ...row }); };
  const cancelEdit = ()    => { setEditId(null);    setEditRow({}); };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...editRow, [name]: value };
    if (name === "firstWeight" || name === "secondWeight") {
      const f = parseFloat(name === "firstWeight"  ? value : editRow.firstWeight  || 0) || 0;
      const s = parseFloat(name === "secondWeight" ? value : editRow.secondWeight || 0) || 0;
      updated.netWeight = String(Math.abs(f - s));
    }
    setEditRow(updated);
  };

  const saveEdit = async () => {
    if (!editRow.vehicleNo?.trim()) { alert("Vehicle Number is required"); return; }
    try {
      const res = await axios.put(`${API}/${editId}`, editRow);
      if (res.data.success) {
        setResults((prev) => prev.map((r) => (r._id === editId ? res.data.data : r)));
        setEditId(null); setEditRow({});
      } else { alert("Update failed: " + res.data.message); }
    } catch (err) { console.error(err); alert("Update failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      setResults((prev) => prev.filter((r) => r._id !== id));
    } catch (err) { console.error(err); alert("Delete failed"); }
  };

  /* ── open full WeighmentDetail page ── */
  const openDetail = (row) => navigate(`/weighment-detail/${row._id}`);

  /* ─── Column definitions ─── */
  const COLS = [
    { label: "#" },
    { label: "GIN No / Note No",        field: "inwardOutwardNoteNo", isLink: true },
    { label: "Weighment No",            field: "weighmentNo" },
    { label: "Vehicle No",              field: "vehicleNo" },
    { label: "Transaction Category",    field: "transactionCategory", type: "select", opts: ["", "Purchase", "Sales"] },
    { label: "Transaction Type",        field: "transactionType",     type: "select", opts: ["", "Inward", "Outward"] },
    { label: "Status",                  field: "status",              type: "select", opts: ["Open", "Closed"] },
    { label: "Party Name",              field: "partyName" },
    { label: "Weighment Date",          field: "weighmentDate",       type: "date" },
    { label: "First Weight (MT)",       field: "firstWeight" },
    { label: "Second Weight (MT)",      field: "secondWeight" },
    { label: "Net Weight (MT)",         field: "netWeight",           readOnly: true },
    { label: "Site",                    field: "site" },
    { label: "Transporter Name",        field: "transporterName" },
    { label: "Weighment In Date",       field: "weighmentInDate",     type: "date" },
    { label: "Weighment Out Date",      field: "weighmentOutDate",    type: "date" },
    { label: "Supplier Invoice No",     field: "supplierInvoiceNo" },
    { label: "Bill No",                 field: "billNo" },
    { label: "Actions" },
  ];

  const renderCell = (col, row) => {
    const isEditing = editId === row._id;
    const { field, type, opts, readOnly, isLink } = col;

    if (!isEditing) {
      const val = row[field] != null && row[field] !== "" ? row[field] : "-";

      /* ── GIN No → clickable hyperlink → WeighmentDetail ── */
      if (isLink) {
        return (
          <button className="ws-gin-link" onClick={() => openDetail(row)}
            title={`Open full details for ${val}`}>
            🔗 {val}
          </button>
        );
      }
      return val;
    }

    /* edit mode */
    if (readOnly || isLink)
      return <input value={editRow[field] ?? ""} readOnly className="ws-inline ws-readonly" />;

    if (type === "select")
      return (
        <select name={field} value={editRow[field] ?? ""} onChange={handleEditChange} className="ws-inline">
          {opts.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}
        </select>
      );

    return (
      <input type={type || "text"} name={field} value={editRow[field] ?? ""}
        onChange={handleEditChange}
        className={`ws-inline${type === "date" ? " ws-date" : ""}${
          field === "firstWeight" || field === "secondWeight" ? " ws-num" : ""}`} />
    );
  };

  return (
    <div className="weighment-page">
      <ModuleNavbar />

      {/* HEADER */}
      <div className="weighment-header">
        <h2>Weighment</h2>
        <div className="header-actions">
          <button className="old-btn">Access Old Screen</button>
          <div className="create-dropdown-wrap">
            <button className="create-btn" onClick={() => setShowCreateMenu((p) => !p)}>+ Create ▾</button>
            {showCreateMenu && (
              <div className="create-menu">
                <button className="create-menu-item" onClick={() => { setShowCreateMenu(false); navigate("/create-weighment"); }}>Create</button>
                <button className="create-menu-item" onClick={() => { setShowCreateMenu(false); navigate("/create-inward-weighment"); }}>Create Inward</button>
                <button className="create-menu-item" onClick={() => { setShowCreateMenu(false); navigate("/create-outward-weighment"); }}>Create Outward</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH PANEL */}
      <div className="search-panel">
        <div className="search-grid">

          <div className="field"><label>From Date</label>
            <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} /></div>

          <div className="field"><label>To Date</label>
            <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} /></div>

          <div className="field"><label>Weighment No</label>
            <input type="text" name="weighmentNo" value={filters.weighmentNo} onChange={handleFilterChange} /></div>

          <div className="field"><label>Vehicle No</label>
            <input type="text" name="vehicleNo" value={filters.vehicleNo} onChange={handleFilterChange} /></div>

          <div className="field"><label>GIN No / Note No</label>
            <input type="text" name="inwardOutwardNoteNo" value={filters.inwardOutwardNoteNo} onChange={handleFilterChange} placeholder="GIN/26-27/..." /></div>

          <div className="field"><label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All</option><option>Open</option><option>Closed</option>
            </select></div>

          <div className="field"><label>Party Name</label>
            <input type="text" name="partyName" value={filters.partyName} onChange={handleFilterChange} /></div>

          <div className="field"><label>Site</label>
            <select name="site" value={filters.site} onChange={handleFilterChange}>
              <option value="">All</option><option>Factory Office-GYPMART INDIA</option>
            </select></div>

          <div className="field"><label>Transaction Type</label>
            <select name="transactionType" value={filters.transactionType} onChange={handleFilterChange}>
              <option value="">All</option><option>Inward</option><option>Outward</option>
            </select></div>

          <div className="field"><label>Transaction Category</label>
            <select name="transactionCategory" value={filters.transactionCategory} onChange={handleFilterChange}>
              <option value="">All</option><option>Purchase</option><option>Sales</option>
            </select></div>

        </div>

        <div className="bottom-actions">
          <label className="checkbox-wrap">
            <input type="checkbox" name="listReversal" checked={filters.listReversal} onChange={handleFilterChange} />
            List Reversals
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="reset-btn" onClick={handleReset}>Reset</button>
            <button className="apply-btn" onClick={handleApply}>{loading ? "Searching..." : "Apply"}</button>
          </div>
        </div>
      </div>

      {/* RESULT TABLE */}
      <div className="result-area">

        {loading && <div className="placeholder">Loading...</div>}

        {!loading && searched && results.length === 0 && <div className="placeholder">No records found</div>}

        {!loading && searched && results.length > 0 && (
          <div className="result-table-wrap">
            <table className="result-table">
              <thead>
                <tr>{COLS.map((c) => <th key={c.label}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {results.map((row, idx) => {
                  const isEditing = editId === row._id;
                  return (
                    <tr key={row._id || idx} className={isEditing ? "editing-row" : ""}>
                      <td>{idx + 1}</td>
                      {COLS.slice(1, -1).map((col) => (
                        <td key={col.field}>{renderCell(col, row)}</td>
                      ))}
                      <td className="action-cell">
                        {isEditing ? (
                          <>
                            <button className="save-row-btn"   onClick={saveEdit}>Save</button>
                            <button className="cancel-row-btn" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="edit-row-btn"   onClick={() => startEdit(row)}>Edit</button>
                            <button className="delete-row-btn" onClick={() => handleDelete(row._id)}>Delete</button>
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
  );
};

export default WeighmentSearch;