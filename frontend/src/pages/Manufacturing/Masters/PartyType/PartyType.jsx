import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const PartyType = () => {
  const navigate = useNavigate();

  const [partyTypes,    setPartyTypes]    = useState([]);
  const [filteredData,  setFilteredData]  = useState([]);
  const [searchType,    setSearchType]    = useState("");
  const [status,        setStatus]        = useState("");
  const [suggestions,   setSuggestions]   = useState([]);
  const [showSug,       setShowSug]       = useState(false);
  const sugRef = useRef(null);

  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({ partyType: "", description: "", status: "" });

  const fetchPartyTypes = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/party-types`);
      setPartyTypes(res.data);
      setFilteredData(res.data);
    } catch (error) { console.log(error); }
  };

  useEffect(() => { fetchPartyTypes(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (sugRef.current && !sugRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTypeInput = (val) => {
    setSearchType(val);
    if (val.trim()) {
      const lower = val.toLowerCase();
      const matches = [...new Set(partyTypes.map((d) => d.partyType).filter((n) => n?.toLowerCase().includes(lower)))].sort();
      setSuggestions(matches);
      setShowSug(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSug(false);
    }
  };

  const handleSearch = () => {
    setShowSug(false);
    let filtered = [...partyTypes];
    if (searchType) filtered = filtered.filter((i) => i.partyType?.toLowerCase().includes(searchType.toLowerCase()));
    if (status)     filtered = filtered.filter((i) => i.status === status);
    setFilteredData(filtered);
  };

  const handleReset = () => {
    setSearchType(""); setStatus(""); setSuggestions([]); setShowSug(false);
    setFilteredData(partyTypes);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this party type?")) return;
    try { await axios.delete(`${API_URL}/api/party-type/${id}`); fetchPartyTypes(); }
    catch (error) { console.log(error); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({ partyType: item.partyType, description: item.description, status: item.status });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/party-type/${id}`, editData);
      setEditId(null);
      fetchPartyTypes();
    } catch (error) { console.log(error); }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Party Type</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-party-type")}>Create ▼</button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">

          {/* Party Type — live typeahead from API data */}
          <div className="form-group" style={{ position: "relative" }} ref={sugRef}>
            <label>Party Type</label>
            <input
              type="text"
              value={searchType}
              onChange={(e) => handleTypeInput(e.target.value)}
              onFocus={() => searchType && suggestions.length > 0 && setShowSug(true)}
              placeholder="Type to search…"
              autoComplete="off"
            />
            {showSug && (
              <ul className="suggestion-list">
                {suggestions.map((s) => (
                  <li key={s} onClick={() => { setSearchType(s); setShowSug(false); }}>{s}</li>
                ))}
              </ul>
            )}
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
              <col style={{ width: "38%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>S No</th>
                <th>Party Type</th>
                <th>Description</th>
                <th>Status</th>
                <th className="action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item._id}>
                    <td>{index + 1}</td>
                    <td title={item.partyType}>
                      {editId === item._id ? (
                        <input type="text" value={editData.partyType}
                          onChange={(e) => setEditData({ ...editData, partyType: e.target.value })} />
                      ) : item.partyType}
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
                <tr><td colSpan="5" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartyType;