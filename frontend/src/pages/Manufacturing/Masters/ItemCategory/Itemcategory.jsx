import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const ITEM_TYPE_OPTIONS = [
  "Raw Material",
  "Semi Finished",
  "Finished Goods",
  "Consumables",
  "Packing Material",
  "Scrap",
  "Service",
];

/* Coloured badge for item type */
const TYPE_COLORS = {
  "Raw Material":     { bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
  "Semi Finished":    { bg: "#fce4ec", color: "#c62828", border: "#f48fb1" },
  "Finished Goods":   { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  "Consumables":      { bg: "#e3f2fd", color: "#1565c0", border: "#90caf9" },
  "Packing Material": { bg: "#f3e5f5", color: "#6a1b9a", border: "#ce93d8" },
  "Scrap":            { bg: "#efebe9", color: "#4e342e", border: "#bcaaa4" },
  "Service":          { bg: "#e0f7fa", color: "#006064", border: "#80deea" },
};

const TypeBadge = ({ value }) => {
  const c = TYPE_COLORS[value] || { bg: "#f5f5f5", color: "#555", border: "#ddd" };
  return (
    <span
      style={{
        display:      "inline-block",
        padding:      "2px 10px",
        borderRadius: "12px",
        fontSize:     "12px",
        fontWeight:   "600",
        background:   c.bg,
        color:        c.color,
        border:       `1px solid ${c.border}`,
        whiteSpace:   "nowrap",
      }}
    >
      {value}
    </span>
  );
};

const ItemCategory = () => {
  const navigate = useNavigate();

  const [data,     setData]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({
    itemCode: "", itemTypes: "", categoryName: "", description: "", status: "",
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSug,     setShowSug]     = useState(false);
  const sugRef = useRef(null);

  /* ── Fetch ── */
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/item-categories`);
      setData(res.data);
      setFiltered(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e) => {
      if (sugRef.current && !sugRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Search helpers ── */
  const handleSearchInput = (val) => {
    setSearch(val);
    if (val.trim()) {
      const lower = val.toLowerCase();
      const matches = [...new Set(
        data.map((d) => d.categoryName).filter((n) => n?.toLowerCase().includes(lower))
      )].sort();
      setSuggestions(matches);
      setShowSug(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSug(false);
    }
  };

  const handleSuggestionClick = (name) => { setSearch(name); setShowSug(false); };

  const handleSearch = () => {
    setShowSug(false);
    let f = [...data];
    if (search) f = f.filter((i) => i.categoryName?.toLowerCase().includes(search.toLowerCase()));
    if (status) f = f.filter((i) => i.status === status);
    setFiltered(f);
  };

  const handleReset = () => {
    setSearch(""); setStatus(""); setSuggestions([]); setShowSug(false);
    setFiltered(data);
  };

  /* ── CRUD ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try { await axios.delete(`${API_URL}/api/item-category/${id}`); fetchData(); }
    catch (err) { console.log(err); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      itemCode:     item.itemCode     || "",
      itemTypes:    item.itemTypes    || "",
      categoryName: item.categoryName || "",
      description:  item.description  || "",
      status:       item.status       || "Active",
    });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/item-category/${id}`, editData);
      setEditId(null);
      fetchData();
    } catch (err) { console.log(err); }
  };

  /* ── Render ── */
  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Item Category</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-item-category")}>Create ▼</button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">

          {/* Category Name typeahead */}
          <div className="form-group" style={{ position: "relative" }} ref={sugRef}>
            <label>Category Name</label>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => search && suggestions.length > 0 && setShowSug(true)}
              placeholder="Type to search…"
              autoComplete="off"
            />
            {showSug && (
              <ul className="suggestion-list">
                {suggestions.map((s) => (
                  <li key={s} onClick={() => handleSuggestionClick(s)}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Status */}
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
              <col style={{ width: "45px" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "110px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>S No</th>
                <th>Item Code</th>
                <th>Item Type</th>
                <th>Category Name</th>
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

                    {/* ITEM CODE */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.itemCode}
                          onChange={(e) => setEditData({ ...editData, itemCode: e.target.value })}
                        />
                      ) : (
                        item.itemCode
                      )}
                    </td>

                    {/* ITEM TYPE */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.itemTypes}
                          onChange={(e) => setEditData({ ...editData, itemTypes: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1.5px solid #1976d2",
                            background: "#e8f4fd",
                            color: "#1976d2",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">— Select —</option>
                          {ITEM_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        item.itemTypes ? <TypeBadge value={item.itemTypes} /> : "—"
                      )}
                    </td>

                    {/* CATEGORY NAME */}
                    <td title={item.categoryName}>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.categoryName}
                          onChange={(e) => setEditData({ ...editData, categoryName: e.target.value })}
                        />
                      ) : (
                        item.categoryName
                      )}
                    </td>

                    {/* DESCRIPTION */}
                    <td title={item.description}>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        />
                      ) : (
                        item.description
                      )}
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
                      ) : (
                        item.status
                      )}
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
                <tr><td colSpan="7" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemCategory;