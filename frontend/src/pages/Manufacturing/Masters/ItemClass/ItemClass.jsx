import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const ItemClass = () => {
  const navigate = useNavigate();

  const [data,     setData]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");

  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({ className: "", description: "", date: "", status: "" });

  /* ── Fetch ── */
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/item-classes`);
      setData(res.data);
      setFiltered(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Search ── */
  const handleSearch = () => {
    let f = [...data];
    if (search) f = f.filter((i) => i.className?.toLowerCase().includes(search.toLowerCase()));
    if (status) f = f.filter((i) => i.status === status);
    setFiltered(f);
  };

  const handleReset = () => {
    setSearch(""); setStatus("");
    setFiltered(data);
  };

  /* ── CRUD ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item class?")) return;
    try { await axios.delete(`${API_URL}/api/item-class/${id}`); fetchData(); }
    catch (err) { console.log(err); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      className:   item.className   || "",
      description: item.description || "",
      date:        item.date ? item.date.substring(0, 10) : "",
      status:      item.status      || "Active",
    });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/item-class/${id}`, editData);
      setEditId(null);
      fetchData();
    } catch (err) { console.log(err); }
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Item Class</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-item-class")}>Create ▼</button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">

          <div className="form-group">
            <label>Class Name</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search…"
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
          <table style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "50px" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>S No</th>
                <th>Class Name</th>
                <th>Description</th>
                <th>Date</th>
                <th>Status</th>
                <th className="action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item, i) => (
                  <tr key={item._id}>
                    <td>{i + 1}</td>

                    {/* CLASS NAME */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.className}
                          onChange={(e) => setEditData({ ...editData, className: e.target.value })}
                        />
                      ) : item.className}
                    </td>

                    {/* DESCRIPTION */}
                    <td title={item.description}>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        />
                      ) : item.description}
                    </td>

                    {/* DATE */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="date"
                          value={editData.date}
                          onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                        />
                      ) : fmtDate(item.date)}
                    </td>

                    {/* STATUS */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      ) : item.status}
                    </td>

                    {/* ACTION */}
                    <td className="action-col">
                      {editId === item._id ? (
                        <button className="save-btn" onClick={() => handleUpdate(item._id)}>Save</button>
                      ) : (
                        <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                      )}
                      <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemClass;