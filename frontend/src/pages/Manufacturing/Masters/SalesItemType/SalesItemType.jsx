import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const SalesItemType = () => {
  const navigate = useNavigate();

  const [data,     setData]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({ itemTypeCode: "", itemType: "" });

  const [searchCode, setSearchCode] = useState("");
  const [searchType, setSearchType] = useState("");

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sales-item-types`);
      setData(res.data);
      setFiltered(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = () => {
    let f = [...data];
    if (searchCode) f = f.filter((i) => i.itemTypeCode?.toLowerCase().includes(searchCode.toLowerCase()));
    if (searchType) f = f.filter((i) => i.itemType?.toLowerCase().includes(searchType.toLowerCase()));
    setFiltered(f);
  };

  const handleReset = () => {
    setSearchCode(""); setSearchType("");
    setFiltered(data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sales item type?")) return;
    try { await axios.delete(`${API_URL}/api/sales-item-type/${id}`); fetchData(); }
    catch (err) { console.log(err); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({ itemTypeCode: item.itemTypeCode || "", itemType: item.itemType || "" });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/sales-item-type/${id}`, editData);
      setEditId(null);
      fetchData();
    } catch (err) { console.log(err); }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Sales Item Type</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-sales-item-type")}>Create ▼</button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">
          <div className="form-group">
            <label>Item Type Code</label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search code…"
            />
          </div>

          <div className="form-group">
            <label>Item Type</label>
            <input
              type="text"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              placeholder="Search type…"
            />
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
              <col style={{ width: "30%" }} />
              <col style={{ width: "40%" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>S No</th>
                <th>Item Type Code</th>
                <th>Item Type</th>
                <th className="action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item, i) => (
                  <tr key={item._id}>
                    <td>{i + 1}</td>
                    <td title={item.itemTypeCode}>
                      {editId === item._id ? (
                        <input type="text" value={editData.itemTypeCode}
                          onChange={(e) => setEditData({ ...editData, itemTypeCode: e.target.value })} />
                      ) : item.itemTypeCode}
                    </td>
                    <td title={item.itemType}>
                      {editId === item._id ? (
                        <input type="text" value={editData.itemType}
                          onChange={(e) => setEditData({ ...editData, itemType: e.target.value })} />
                      ) : item.itemType}
                    </td>
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
                <tr><td colSpan="4" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesItemType;