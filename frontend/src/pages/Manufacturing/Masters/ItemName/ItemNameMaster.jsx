import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/PartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import UploadModal from "../../../../components/UploadModal/UploadModal";

/* Fields the bulk-upload modal maps Excel/CSV columns to.
   Mirrors ITEM_FIELDS in ItemMaster.jsx */
const ITEM_NAME_FIELDS = [
  { key: "itemType", label: "Item Type", required: false },
  { key: "itemCode", label: "Item Code", required: true },
  { key: "itemName", label: "Item Name", required: true },
  { key: "date",     label: "Date",      required: false },
  { key: "status",   label: "Status",    required: false, default: "Active" },
];

const ItemNameMaster = () => {
  const navigate = useNavigate();

  const [items,        setItems]        = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [uploadOpen,   setUploadOpen]   = useState(false);
  const [itemTypeOptions, setItemTypeOptions] = useState([]);

  /* Search filter state */
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("");
  const [status,   setStatus]   = useState("");

  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({
    itemType: "", itemCode: "", itemName: "", date: "", status: "",
  });

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/item-names`);
      setItems(res.data);
      setFilteredData(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [itemRes, typeRes] = await Promise.all([
          axios.get(`${API_URL}/api/item-names`),
          axios.get(`${API_URL}/api/sales-item-types`),
        ]);
        setItems(itemRes.data);
        setFilteredData(itemRes.data);
        setItemTypeOptions(typeRes.data);
      } catch (err) { console.log(err); }
    };
    fetchAll();
  }, []);

  /* ── Search & Reset ───────────────────────────────────────────────── */
  const handleSearch = () => {
    let f = [...items];
    if (itemCode) f = f.filter((i) => i.itemCode?.toLowerCase().includes(itemCode.toLowerCase()));
    if (itemName) f = f.filter((i) => i.itemName?.toLowerCase().includes(itemName.toLowerCase()));
    if (itemType) f = f.filter((i) => i.itemType === itemType);
    if (status)   f = f.filter((i) => i.status === status);
    setFilteredData(f);
  };

  const handleReset = () => {
    setItemCode(""); setItemName(""); setItemType(""); setStatus("");
    setFilteredData(items);
  };

  /* ── CRUD ─────────────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try { await axios.delete(`${API_URL}/api/item-name/${id}`); fetchItems(); }
    catch (err) { console.log(err); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      itemType: item.itemType || "",
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      date:     item.date ? item.date.substring(0, 10) : "",
      status:   item.status,
    });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/item-name/${id}`, editData);
      setEditId(null);
      fetchItems();
    } catch (err) { console.log(err); }
  };

  const handleCancelEdit = () => setEditId(null);

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Item Name Master</h1>
        </div>
        <div className="topbar-actions">
          <button className="upload-btn" onClick={() => setUploadOpen(true)}>⬆ Upload</button>
          <button className="create-btn" onClick={() => navigate("/create-item-name")}>Create ▼</button>
        </div>
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={fetchItems}
        entityType="item-name"
        fields={ITEM_NAME_FIELDS}
        bulkEndpoint="/api/bulk-create-item-names"
      />

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">

          {/* Item Code */}
          <div className="form-group">
            <label>Item Code</label>
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="Search code…"
            />
          </div>

          {/* Item Name */}
          <div className="form-group">
            <label>Item Name</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Search name…"
            />
          </div>

          {/* Item Type */}
          <div className="form-group">
            <label>Item Type</label>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
              <option value="">- All Types -</option>
              {itemTypeOptions.map((t) => (
                <option key={t._id} value={t.itemType}>{t.itemType}</option>
              ))}
            </select>
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

        {/* ── TABLE ──────────────────────────────────────────────────── */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>S No</th>
                <th>Item Type</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item._id} className={editId === item._id ? "editing-row" : ""}>
                    <td>{index + 1}</td>

                    {/* ITEM TYPE */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.itemType}
                          onChange={(e) => setEditData({ ...editData, itemType: e.target.value })}
                        >
                          <option value="">— Select —</option>
                          {itemTypeOptions.map((t) => (
                            <option key={t._id} value={t.itemType}>{t.itemType}</option>
                          ))}
                        </select>
                      ) : item.itemType || "—"}
                    </td>

                    {/* ITEM CODE */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.itemCode}
                          onChange={(e) => setEditData({ ...editData, itemCode: e.target.value })}
                        />
                      ) : item.itemCode}
                    </td>

                    {/* ITEM NAME */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.itemName}
                          onChange={(e) => setEditData({ ...editData, itemName: e.target.value })}
                        />
                      ) : item.itemName}
                    </td>

                    {/* DATE */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="date"
                          value={editData.date}
                          onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                        />
                      ) : item.date
                        ? new Date(item.date).toLocaleDateString()
                        : "—"}
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
                    <td className="action-cell">
                      {editId === item._id ? (
                        <>
                          <button className="save-btn" onClick={() => handleUpdate(item._id)}>Save</button>
                          <button className="cancel-edit-btn" onClick={handleCancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                      )}
                      <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">No Data Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemNameMaster;