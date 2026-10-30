import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const TYPE_OPTIONS = ["Charges", "Discount"];

const ChargesMaster = () => {
  const navigate = useNavigate();

  const [data, setData]         = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchCode, setSearchCode]     = useState("");
  const [searchType, setSearchType]     = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState({
    entityDate: "", type: "", code: "", details: "", addOrSubtract: "", status: "",
  });

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/charges-master`);
      setData(res.data);
      setFiltered(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = () => {
    let f = [...data];
    if (searchCode)   f = f.filter((i) => i.code?.toLowerCase().includes(searchCode.toLowerCase()));
    if (searchType)   f = f.filter((i) => i.type === searchType);
    if (searchStatus) f = f.filter((i) => i.status === searchStatus);
    setFiltered(f);
  };

  const handleReset = () => { setSearchCode(""); setSearchType(""); setSearchStatus(""); setFiltered(data); };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      entityDate:    item.entityDate ? item.entityDate.split("T")[0] : "",
      type:          item.type,
      code:          item.code,
      details:       item.details,
      addOrSubtract: item.addOrSubtract,
      status:        item.status,
    });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/charges-master/${id}`, editData);
      setEditId(null);
      fetchData();
    } catch (err) { console.error(err); alert("Error updating record"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`${API_URL}/api/charges-master/${id}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const set = (field) => (e) => setEditData({ ...editData, [field]: e.target.value });

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Charges / Discount Master</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-charges-master")}>Create ▼</button>
      </div>

      {/* SEARCH */}
      <div className="search-container">
        <div className="search-title">Search</div>
        <div className="search-grid">
          <div className="form-group">
            <label>Code</label>
            <input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder="Search code..." />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
              <option value="">- Select -</option>
              {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)}>
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

        {/* TABLE */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>S No</th>
                <th>Entity Date</th>
                <th>Type</th>
                <th>Code</th>
                <th>Details</th>
                <th>Addition / Subtraction</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((item, i) => (
                <tr key={item._id}>
                  <td>{i + 1}</td>

                  <td>
                    {editId === item._id
                      ? <input type="date" value={editData.entityDate} onChange={set("entityDate")} />
                      : item.entityDate ? new Date(item.entityDate).toLocaleDateString("en-IN") : "-"}
                  </td>

                  <td>
                    {editId === item._id
                      ? (
                        <select value={editData.type} onChange={set("type")}>
                          <option value="">- Select -</option>
                          {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      )
                      : item.type}
                  </td>

                  <td>
                    {editId === item._id
                      ? <input type="text" value={editData.code} onChange={set("code")} />
                      : item.code}
                  </td>

                  <td>
                    {editId === item._id
                      ? <input type="text" value={editData.details} onChange={set("details")} />
                      : item.details || "-"}
                  </td>

                  <td>
                    {editId === item._id
                      ? (
                        <select value={editData.addOrSubtract} onChange={set("addOrSubtract")}>
                          <option value="">- Select -</option>
                          <option value="Addition">Addition</option>
                          <option value="Subtraction">Subtraction</option>
                        </select>
                      )
                      : item.addOrSubtract}
                  </td>

                  <td>
                    {editId === item._id
                      ? (
                        <select value={editData.status} onChange={set("status")}>
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      )
                      : item.status}
                  </td>

                  <td>
                    {editId === item._id
                      ? <button className="save-btn" onClick={() => handleUpdate(item._id)}>Save</button>
                      : <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                    }
                    <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChargesMaster;