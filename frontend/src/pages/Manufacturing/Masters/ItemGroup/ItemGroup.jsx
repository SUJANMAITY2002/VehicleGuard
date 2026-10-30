import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const TypeAhead = ({ value, onChange, onSelect, suggestions, show, setShow, placeholder, refProp }) => (
  <div style={{ position: "relative" }} ref={refProp}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => value && suggestions.length > 0 && setShow(true)}
      placeholder={placeholder}
      autoComplete="off"
    />
    {show && suggestions.length > 0 && (
      <ul className="suggestion-list">
        {suggestions.map((s) => (
          <li key={s} onMouseDown={() => onSelect(s)}>{s}</li>
        ))}
      </ul>
    )}
  </div>
);

const ItemGroup = () => {
  const navigate = useNavigate();

  const [data,     setData]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [status,   setStatus]   = useState("");
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({ itemGroup: "", itemTypes: "", description: "", status: "" });

  const [searchGroup, setSearchGroup] = useState("");
  const [searchTypes, setSearchTypes] = useState("");
  const [groupSug,     setGroupSug]     = useState([]);
  const [typesSug,     setTypesSug]     = useState([]);
  const [showGroupSug, setShowGroupSug] = useState(false);
  const [showTypesSug, setShowTypesSug] = useState(false);

  const groupRef = useRef(null);
  const typesRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/item-group`);
      setData(res.data);
      setFiltered(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) setShowGroupSug(false);
      if (typesRef.current && !typesRef.current.contains(e.target)) setShowTypesSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const makeSug = (field, val) =>
    val.trim()
      ? [...new Set(data.map((d) => d[field]).filter((n) => n?.toLowerCase().includes(val.toLowerCase())))].sort()
      : [];

  const handleGroupInput = (val) => { setSearchGroup(val); setGroupSug(makeSug("itemGroup", val)); setShowGroupSug(true); };
  const handleTypesInput = (val) => { setSearchTypes(val); setTypesSug(makeSug("itemTypes", val)); setShowTypesSug(true); };

  const handleSearch = () => {
    setShowGroupSug(false); setShowTypesSug(false);
    let f = [...data];
    if (searchGroup) f = f.filter((i) => i.itemGroup?.toLowerCase().includes(searchGroup.toLowerCase()));
    if (searchTypes) f = f.filter((i) => i.itemTypes?.toLowerCase().includes(searchTypes.toLowerCase()));
    if (status)      f = f.filter((i) => i.status === status);
    setFiltered(f);
  };

  const handleReset = () => {
    setSearchGroup(""); setSearchTypes(""); setStatus("");
    setGroupSug([]); setTypesSug([]);
    setShowGroupSug(false); setShowTypesSug(false);
    setFiltered(data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item group?")) return;
    try { await axios.delete(`${API_URL}/api/item-group/${id}`); fetchData(); }
    catch (err) { console.log(err); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({ itemGroup: item.itemGroup || "", itemTypes: item.itemTypes || "", description: item.description || "", status: item.status });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/item-group/${id}`, editData);
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
          <h1>Item Group</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-item-group")}>Create ▼</button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">
          <div className="form-group">
            <label>Item Group</label>
            <TypeAhead value={searchGroup} onChange={handleGroupInput}
              onSelect={(s) => { setSearchGroup(s); setShowGroupSug(false); }}
              suggestions={groupSug} show={showGroupSug} setShow={setShowGroupSug}
              placeholder="Type to search…" refProp={groupRef} />
          </div>

          <div className="form-group">
            <label>Item Category</label>
            <TypeAhead value={searchTypes} onChange={handleTypesInput}
              onSelect={(s) => { setSearchTypes(s); setShowTypesSug(false); }}
              suggestions={typesSug} show={showTypesSug} setShow={setShowTypesSug}
              placeholder="Type to search…" refProp={typesRef} />
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
              <col style={{ width: "22%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>S No</th>
                <th>Item Category</th>
                <th>Item Group</th>
                <th>Description</th>
                <th>Status</th>
                <th className="action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item, i) => (
                  <tr key={item._id}>
                    <td>{i + 1}</td>
                    <td title={item.itemTypes}>
                      {editId === item._id ? (
                        <input type="text" value={editData.itemTypes}
                          onChange={(e) => setEditData({ ...editData, itemTypes: e.target.value })} />
                      ) : item.itemTypes}
                    </td>
                    <td title={item.itemGroup}>
                      {editId === item._id ? (
                        <input type="text" value={editData.itemGroup}
                          onChange={(e) => setEditData({ ...editData, itemGroup: e.target.value })} />
                      ) : item.itemGroup}
                    </td>
                    <td title={item.description}>
                      {editId === item._id ? (
                        <input type="text" value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
                      ) : item.description}
                    </td>
                    <td>
                      {editId === item._id ? (
                        <select value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      ) : item.status}
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
                <tr><td colSpan="6" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemGroup;