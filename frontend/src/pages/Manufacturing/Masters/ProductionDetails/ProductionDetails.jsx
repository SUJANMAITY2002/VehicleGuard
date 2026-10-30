import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const ProductionDetails = () => {
  const navigate = useNavigate();
  const [data, setData]         = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [grade, setGrade]       = useState("");
  const [size, setSize]         = useState("");
  const [status, setStatus]     = useState("");
  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState({ grade: "", size: "", thickness: "", width: "", length: "", status: "" });

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/production-details`);
      setData(res.data); setFiltered(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = () => {
    let f = [...data];
    if (grade)  f = f.filter((i) => i.grade?.toLowerCase().includes(grade.toLowerCase()));
    if (size)   f = f.filter((i) => i.size?.toLowerCase().includes(size.toLowerCase()));
    if (status) f = f.filter((i) => i.status === status);
    setFiltered(f);
  };

  const handleReset = () => { setGrade(""); setSize(""); setStatus(""); setFiltered(data); };

  const handleDelete = async (id) => {
    try { await axios.delete(`${API_URL}/api/production-details/${id}`); fetchData(); }
    catch (err) { console.log(err); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({ grade: item.grade, size: item.size, thickness: item.thickness, width: item.width, length: item.length, status: item.status });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/production-details/${id}`, editData);
      setEditId(null); fetchData();
    } catch (err) { console.log(err); }
  };

  const FIELDS = ["grade", "size", "thickness", "width", "length"];

  return (
    <div className="transaction-page">
      <ModuleNavbar />
      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Production Details</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-production-details")}>Create ▼</button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>
        <div className="search-grid">
          <div className="form-group">
            <label>Grade</label>
            <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Size</label>
            <input type="text" value={size} onChange={(e) => setSize(e.target.value)} />
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
          <button className="reset-btn" onClick={handleReset}>Reset</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>S No</th><th>Grade</th><th>Size</th><th>Thickness</th><th>Width</th><th>Length</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((item, i) => (
                <tr key={item._id}>
                  <td>{i + 1}</td>
                  {FIELDS.map((field) => (
                    <td key={field}>
                      {editId === item._id ? (
                        <input type="text" value={editData[field]}
                          onChange={(e) => setEditData({ ...editData, [field]: e.target.value })} />
                      ) : item[field]}
                    </td>
                  ))}
                  <td>
                    {editId === item._id ? (
                      <select value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                        <option>Active</option><option>Inactive</option>
                      </select>
                    ) : item.status}
                  </td>
                  <td>
                    {editId === item._id ? (
                      <button className="save-btn" onClick={() => handleUpdate(item._id)}>Save</button>
                    ) : (
                      <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                    )}
                    <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
                  </td>
                </tr>
              )) : <tr><td colSpan="8" className="no-data">No Data Found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductionDetails;