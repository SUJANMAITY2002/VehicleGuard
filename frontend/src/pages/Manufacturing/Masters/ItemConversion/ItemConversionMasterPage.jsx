import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./ItemConversion.css";

const ItemConversionMasterPage = () => {
  const navigate = useNavigate();

  const [data,     setData]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({ conversionTypeName: "", description: "", status: "" });

  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const sugRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/item-conversion-masters`);
      setData(res.data);
      setFiltered(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (sugRef.current && !sugRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchInput = (val) => {
    setSearch(val);
    if (val.trim()) {
      const lower   = val.toLowerCase();
      const matches = [...new Set(
        data.map((d) => d.conversionTypeName).filter((n) => n?.toLowerCase().includes(lower))
      )].sort();
      setSuggestions(matches);
      setShowSug(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSug(false);
    }
  };

  const handleSearch = () => {
    setShowSug(false);
    let f = [...data];
    if (search) f = f.filter((i) => i.conversionTypeName?.toLowerCase().includes(search.toLowerCase()));
    if (status) f = f.filter((i) => i.status === status);
    setFiltered(f);
  };

  const handleReset = () => {
    setSearch(""); setStatus(""); setSuggestions([]); setShowSug(false);
    setFiltered(data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this conversion type?")) return;
    try { await axios.delete(`${API_URL}/api/item-conversion-master/${id}`); fetchData(); }
    catch (err) { console.error(err); }
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/item-conversion-master/${id}`, editData);
      setEditId(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="ic-page">
      <ModuleNavbar />

      <div className="ic-topbar">
        <div className="ic-topbar-left">
          <button className="ic-back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Item Conversion Type</h1>
        </div>
        <button className="ic-create-btn" onClick={() => navigate("/create-item-conversion-master")}>
          + Create
        </button>
      </div>

      <div className="ic-card">
        <div className="ic-card-title">Search</div>

        <div className="ic-form-grid">
          <div className="ic-field" style={{ position: "relative" }} ref={sugRef}>
            <label>Conversion Type Name</label>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => search && suggestions.length > 0 && setShowSug(true)}
              placeholder="Type to search…"
              autoComplete="off"
            />
            {showSug && (
              <ul className="ic-suggestion-list">
                {suggestions.map((s) => (
                  <li key={s} onClick={() => { setSearch(s); setShowSug(false); }}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="ic-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">- All -</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="ic-search-btns">
          <button className="ic-search-btn" onClick={handleSearch}>Search</button>
          <button className="ic-reset-btn"  onClick={handleReset}>Reset</button>
        </div>

        <div className="ic-table-wrap">
          <table className="ic-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>Conversion Type Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item, i) => (
                  <tr key={item._id}>
                    <td>{i + 1}</td>
                    <td>
                      {editId === item._id
                        ? <input value={editData.conversionTypeName}
                            onChange={(e) => setEditData({ ...editData, conversionTypeName: e.target.value })} />
                        : item.conversionTypeName}
                    </td>
                    <td>
                      {editId === item._id
                        ? <input value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
                        : item.description}
                    </td>
                    <td>
                      {editId === item._id
                        ? <select value={editData.status}
                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                            <option>Active</option>
                            <option>Inactive</option>
                          </select>
                        : item.status}
                    </td>
                    <td className="ic-action-cell">
                      {editId === item._id
                        ? <button className="ic-save-sm-btn" onClick={() => handleUpdate(item._id)}>Save</button>
                        : <button className="ic-edit-btn" onClick={() => { setEditId(item._id); setEditData({ conversionTypeName: item.conversionTypeName, description: item.description, status: item.status }); }}>Edit</button>
                      }
                      <button className="ic-del-btn" onClick={() => handleDelete(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="ic-no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemConversionMasterPage;