import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/PartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import UploadModal from "../../../../components/UploadModal/UploadModal";

const ITEM_TYPE_OPTIONS = [
  "Raw Material",
  "Semi Finished",
  "Finished Goods",
  "Consumables",
  "Packing Material",
  "Scrap",
  "Service",
];

const ITEM_FIELDS = [
  { key: "itemCode",      label: "Item Code",      required: true  },
  { key: "itemName",      label: "Item Name",      required: true  },
  { key: "itemTypes",     label: "Item Types",     required: false },
  { key: "category",      label: "Category",       required: false },
  { key: "itemGroup",     label: "Item Group",     required: false },
  { key: "date",          label: "Date",           required: false },
  { key: "uom",           label: "UOM",            required: false },
  { key: "hsn",           label: "HSN",            required: false },
  { key: "gstPercent",    label: "GST %",          required: false },
  { key: "itemClass",     label: "Item Class",     required: false },
  { key: "itemTaxClass",  label: "Item Tax Class", required: false },
  { key: "grade",         label: "Grade",          required: false },
  { key: "size",          label: "Size",           required: false },
  { key: "rateDiff",      label: "Rate Diff",      required: false },
  { key: "referenceItem", label: "Reference Item", required: false },
  { key: "status",        label: "Status",         required: false, default: "Active" },
];

/* ── Generic Typeahead ──────────────────────────────────────────────── */
const TypeAhead = ({ value, onChange, onSelect, suggestions, show, setShow, placeholder, inputRef }) => (
  <div style={{ position: "relative" }} ref={inputRef}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => value && suggestions.length > 0 && setShow(true)}
      placeholder={placeholder}
      autoComplete="off"
      style={{ width: "100%", boxSizing: "border-box" }}
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

const ItemMaster = () => {
  const navigate = useNavigate();

  /* ── Data ─────────────────────────────────────────────────────────── */
  const [items,        setItems]        = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [uploadOpen,   setUploadOpen]   = useState(false);

  /* Master lookups */
  const [allCategoryOptions,  setAllCategoryOptions]  = useState([]);
  const [allGroupOptions,     setAllGroupOptions]     = useState([]);
  const [itemClassOptions,    setItemClassOptions]    = useState([]);
  const [itemTaxClassOptions, setItemTaxClassOptions] = useState([]);

  /* ── Search filter state ──────────────────────────────────────────── */
  const [itemCode,      setItemCode]      = useState("");
  const [itemName,      setItemName]      = useState("");
  const [searchType,    setSearchType]    = useState(""); // itemTypes filter
  const [searchClass,   setSearchClass]   = useState(""); // itemClass filter
  const [status,        setStatus]        = useState("");

  /* Category typeahead */
  const [catInput,        setCatInput]        = useState("");
  const [catSug,          setCatSug]          = useState([]);
  const [showCatSug,      setShowCatSug]      = useState(false);
  const [selectedCat,     setSelectedCat]     = useState("");
  const [filteredCatOpts, setFilteredCatOpts] = useState([]);
  const catRef = useRef(null);

  /* Item Group — dropdown filtered by selectedCat */
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [itemGroup,      setItemGroup]      = useState("");

  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({
    itemCode: "", itemName: "", itemTypes: "", category: "",
    itemGroup: "", date: "", uom: "", hsn: "", gstPercent: "",
    itemClass: "", itemTaxClass: "", grade: "", size: "", rateDiff: "",
    referenceItem: "", status: "",
  });

  /* ── Fetch ────────────────────────────────────────────────────────── */
  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/items`);
      setItems(res.data);
      setFilteredData(res.data);
    } catch (error) { console.log(error); }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [itemRes, catRes, groupRes, classRes, taxClassRes] = await Promise.all([
          axios.get(`${API_URL}/api/items`),
          axios.get(`${API_URL}/api/item-categories`),
          axios.get(`${API_URL}/api/item-group`),
          axios.get(`${API_URL}/api/item-classes`),
          axios.get(`${API_URL}/api/item-tax-classes`),
        ]);
        setItems(itemRes.data);
        setFilteredData(itemRes.data);
        setAllCategoryOptions(catRes.data.filter((c) => c.status !== "Inactive"));
        setAllGroupOptions(groupRes.data.filter((g) => g.status !== "Inactive"));
        setItemClassOptions(classRes.data.filter((c) => c.status !== "Inactive"));
        setItemTaxClassOptions(taxClassRes.data.filter((t) => t.status !== "Inactive"));
      } catch (err) { console.log(err); }
    };
    fetchAll();
  }, []);

  /* Close typeaheads on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setShowCatSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Item type change → filter categories ─────────────────────────── */
  const handleSearchTypeChange = (val) => {
    setSearchType(val);
    setCatInput(""); setSelectedCat(""); setItemGroup(""); setFilteredGroups([]);
    if (val) {
      const cats = allCategoryOptions
        .filter((c) => c.itemTypes === val)
        .map((c) => c.categoryName)
        .filter(Boolean);
      setFilteredCatOpts([...new Set(cats)].sort());
    } else {
      setFilteredCatOpts([]);
    }
  };

  /* ── Category typeahead ───────────────────────────────────────────── */
  const handleCatInput = (val) => {
    setCatInput(val); setSelectedCat(""); setItemGroup(""); setFilteredGroups([]);
    if (val.trim()) {
      const lower = val.toLowerCase();
      const pool  = searchType ? filteredCatOpts : allCategoryOptions.map((c) => c.categoryName);
      const matches = pool.filter((n) => n?.toLowerCase().includes(lower));
      setCatSug(matches); setShowCatSug(matches.length > 0);
    } else {
      setCatSug([]); setShowCatSug(false);
    }
  };

  const handleCatSelect = (catName) => {
    setCatInput(catName); setSelectedCat(catName); setShowCatSug(false); setItemGroup("");
    const groups = allGroupOptions
      .filter((g) => g.itemTypes?.toLowerCase() === catName.toLowerCase())
      .map((g) => g.itemGroup).filter(Boolean);
    setFilteredGroups([...new Set(groups)].sort());
  };

  /* ── Search & Reset ───────────────────────────────────────────────── */
  const handleSearch = () => {
    setShowCatSug(false);
    let f = [...items];
    if (itemCode)    f = f.filter((i) => i.itemCode?.toLowerCase().includes(itemCode.toLowerCase()));
    if (itemName)    f = f.filter((i) => i.itemName?.toLowerCase().includes(itemName.toLowerCase()));
    if (searchType)  f = f.filter((i) => i.itemTypes === searchType);
    if (selectedCat) f = f.filter((i) => i.category?.toLowerCase() === selectedCat.toLowerCase());
    if (itemGroup)   f = f.filter((i) => i.itemGroup?.toLowerCase() === itemGroup.toLowerCase());
    if (searchClass) f = f.filter((i) => i.itemClass === searchClass);
    if (status)      f = f.filter((i) => i.status === status);
    setFilteredData(f);
  };

  const handleReset = () => {
    setItemCode(""); setItemName(""); setSearchType(""); setSearchClass(""); setStatus("");
    setCatInput(""); setSelectedCat(""); setCatSug([]); setFilteredCatOpts([]);
    setItemGroup(""); setFilteredGroups([]);
    setShowCatSug(false);
    setFilteredData(items);
  };

  /* ── CRUD ─────────────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try { await axios.delete(`${API_URL}/api/item/${id}`); fetchItems(); }
    catch (error) { console.log(error); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      itemCode:      item.itemCode      || "",
      itemName:      item.itemName      || "",
      itemTypes:     item.itemTypes     || "",
      category:      item.category      || "",
      itemGroup:     item.itemGroup     || "",
      date:          item.date ? item.date.substring(0, 10) : "",
      uom:           item.uom           || "",
      hsn:           item.hsn           || "",
      gstPercent:    item.gstPercent    || "",
      itemClass:     item.itemClass     || "",
      itemTaxClass:  item.itemTaxClass  || "",
      grade:         item.grade         || "",
      size:          item.size          || "",
      rateDiff:      item.rateDiff      || "",
      referenceItem: item.referenceItem || "",
      status:        item.status,
    });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/item/${id}`, editData);
      setEditId(null);
      fetchItems();
    } catch (error) { console.log(error); }
  };

  const handleCancelEdit = () => setEditId(null);

  const TEXT_FIELDS = [
    "itemCode", "itemName", "itemTypes", "category",
    "itemGroup", "uom", "hsn", "gstPercent",
    "itemClass", "grade", "size", "rateDiff",
  ];

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Item Master</h1>
        </div>
        <div className="topbar-actions">
          <button className="upload-btn" onClick={() => setUploadOpen(true)}>⬆ Upload</button>
          <button className="create-btn" onClick={() => navigate("/create-item")}>Create ▼</button>
        </div>
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={fetchItems}
        entityType="item"
        fields={ITEM_FIELDS}
        bulkEndpoint="/api/bulk-create-items"
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

          {/* Item Types — step 1 filter */}
          <div className="form-group">
            <label>Item Types</label>
            <select
              value={searchType}
              onChange={(e) => handleSearchTypeChange(e.target.value)}
            >
              <option value="">- All Types -</option>
              {ITEM_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Category — typeahead, filtered by item type ─────────── */}
          <div className="form-group">
            <label>Category</label>
            <TypeAhead
              value={catInput}
              onChange={handleCatInput}
              onSelect={handleCatSelect}
              suggestions={catSug}
              show={showCatSug}
              setShow={setShowCatSug}
              placeholder="Type to search category…"
              inputRef={catRef}
            />
            {selectedCat && (
              <span style={{ fontSize: "11px", color: "#2e7d32", marginTop: "3px", display: "block" }}>
                ✓ {selectedCat}
              </span>
            )}
          </div>

          {/* Item Group — filtered dropdown ──────────────────────── */}
          <div className="form-group">
            <label>Item Group</label>
            <select
              value={itemGroup}
              onChange={(e) => setItemGroup(e.target.value)}
              disabled={!selectedCat}
            >
              <option value="">
                {selectedCat
                  ? filteredGroups.length > 0 ? "- All Groups -" : "No groups"
                  : "Select Category first"}
              </option>
              {filteredGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Item Class */}
          <div className="form-group">
            <label>Item Class</label>
            <select
              value={searchClass}
              onChange={(e) => setSearchClass(e.target.value)}
            >
              <option value="">- All Classes -</option>
              {itemClassOptions.map((c) => (
                <option key={c._id} value={c.className}>{c.className}</option>
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
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Item Types</th>
                <th>Category</th>
                <th>Item Group</th>
                <th>UOM</th>
                <th>HSN</th>
                <th>GST %</th>
                <th>Item Class</th>
                <th>Grade</th>
                <th>Size</th>
                <th>Rate Diff</th>
                <th>Date</th>
                <th>Item Tax Class</th>
                <th>Reference Item</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item._id} className={editId === item._id ? "editing-row" : ""}>
                    <td>{index + 1}</td>

                    {TEXT_FIELDS.map((field) => (
                      <td key={field}>
                        {editId === item._id ? (
                          <input
                            type={field === "gstPercent" ? "number" : "text"}
                            value={editData[field]}
                            onChange={(e) =>
                              setEditData({ ...editData, [field]: e.target.value })
                            }
                          />
                        ) : field === "itemCode" ? (
                          <span
                            style={{
                              color: "#1976d2",
                              cursor: "pointer",
                              textDecoration: "underline",
                              fontWeight: "600",
                            }}
                            onClick={() =>
                              navigate(`/item-detail/${item._id}`, { state: { item } })
                            }
                          >
                            {item.itemCode}
                          </span>
                        ) : (
                          item[field] || "—"
                        )}
                      </td>
                    ))}

                    {/* DATE — date input in edit mode */}
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

                    {/* ITEM TAX CLASS — select in edit mode */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.itemTaxClass}
                          onChange={(e) => setEditData({ ...editData, itemTaxClass: e.target.value })}
                        >
                          <option value="">— Select —</option>
                          {itemTaxClassOptions.map((t) => (
                            <option key={t._id} value={t.itemTaxClassCode}>
                              {t.itemTaxClassCode}
                            </option>
                          ))}
                        </select>
                      ) : item.itemTaxClass || "—"}
                    </td>

                    {/* REFERENCE ITEM — select showing itemCode only in edit mode */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.referenceItem}
                          onChange={(e) => setEditData({ ...editData, referenceItem: e.target.value })}
                        >
                          <option value="">— None —</option>
                          {items
                            .filter((i) => i._id !== item._id)
                            .map((i) => (
                              <option key={i._id} value={i.itemCode}>
                                {i.itemCode}
                              </option>
                            ))}
                        </select>
                      ) : item.referenceItem || "—"}
                    </td>

                    {/* STATUS */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.status}
                          onChange={(e) =>
                            setEditData({ ...editData, status: e.target.value })
                          }
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
                  <td colSpan="18" className="no-data">No Data Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemMaster;