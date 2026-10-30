import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/PartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const ItemTaxClass = () => {
  const navigate = useNavigate();
  const [data,         setData]         = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchCode,   setSearchCode]   = useState("");
  const [searchDesc,   setSearchDesc]   = useState("");
  const [status,       setStatus]       = useState("");

  /* Inline edit */
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({ itemTaxClassCode: "", description: "", status: "" });

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/item-tax-classes`);
      setData(res.data);
      setFilteredData(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSearch = () => {
    let f = [...data];
    if (searchCode) f = f.filter((r) => r.itemTaxClassCode?.toLowerCase().includes(searchCode.toLowerCase()));
    if (searchDesc) f = f.filter((r) => r.description?.toLowerCase().includes(searchDesc.toLowerCase()));
    if (status)     f = f.filter((r) => r.status === status);
    setFilteredData(f);
  };

  const handleReset = () => {
    setSearchCode(""); setSearchDesc(""); setStatus("");
    setFilteredData(data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Item Tax Class?")) return;
    try { await axios.delete(`${API_URL}/api/item-tax-class/${id}`); fetchAll(); }
    catch (err) { console.log(err); }
  };

  const handleEdit = (row) => {
    setEditId(row._id);
    setEditData({ itemTaxClassCode: row.itemTaxClassCode || "", description: row.description || "", status: row.status || "Active" });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/item-tax-class/${id}`, editData);
      setEditId(null);
      fetchAll();
    } catch (err) { console.log(err); }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Item Tax Class</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-item-tax-class")}>Create ▼</button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">
          <div className="form-group">
            <label>Tax Class Code</label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search code…"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={searchDesc}
              onChange={(e) => setSearchDesc(e.target.value)}
              placeholder="Search description…"
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">- Select -</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="button-group">
          <button className="search-btn" onClick={handleSearch}>Search</button>
          <button className="reset-btn"  onClick={handleReset}>Reset</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>S No</th>
                <th>Tax Class Code</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <tr key={row._id}>
                    <td>{idx + 1}</td>
                    <td>
                      {editId === row._id ? (
                        <input
                          value={editData.itemTaxClassCode}
                          onChange={(e) => setEditData({ ...editData, itemTaxClassCode: e.target.value })}
                        />
                      ) : row.itemTaxClassCode}
                    </td>
                    <td>
                      {editId === row._id ? (
                        <input
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        />
                      ) : row.description || "—"}
                    </td>
                    <td>
                      {editId === row._id ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      ) : row.status}
                    </td>
                    <td>
                      {editId === row._id ? (
                        <button className="save-btn" onClick={() => handleUpdate(row._id)}>Save</button>
                      ) : (
                        <button className="edit-btn" onClick={() => handleEdit(row)}>Edit</button>
                      )}
                      <button className="delete-btn" onClick={() => handleDelete(row._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="no-data">No Data Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemTaxClass;