import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/CreateParty.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

/* ── Generic Typeahead ─────────────────────────────────────────────── */
const TypeAhead = ({ value, onChange, onSelect, suggestions, show, setShow, placeholder, inputRef }) => (
  <div style={{ position: "relative" }} ref={inputRef}>
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

const ITEM_TYPE_OPTIONS = [
  "Raw Material",
  "Semi Finished",
  "Finished Goods",
  "Consumables",
  "Packing Material",
  "Scrap",
  "Service",
];

const CreateItem = () => {
  const navigate = useNavigate();

  /* ── Master data ────────────────────────────────────────────────── */
  const [allCategoryOptions, setAllCategoryOptions] = useState([]); // all active categories from DB
  const [allGroupOptions,    setAllGroupOptions]    = useState([]); // all active item-groups from DB
  const [uomOptions,         setUomOptions]         = useState([]);
  const [itemClassOptions,   setItemClassOptions]   = useState([]); // Item Class list
  const [itemTaxClassOptions, setItemTaxClassOptions] = useState([]); // Item Tax Class list
  const [uomDetails,         setUomDetails]         = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  /* ── Form state ─────────────────────────────────────────────────── */
  const [formData, setFormData] = useState({
    itemCode:     "",
    itemName:     "",
    itemTypes:    "",   // Raw Material, Finished Goods, etc.
    category:     "",   // filtered by itemTypes
    itemGroup:    "",   // filtered by category
    date:         "",   // date after item group
    uom:          "",
    hsn:          "",
    gstPercent:   "",
    itemClass:    "",   // from ItemClass master
    itemTaxClass: "",   // from ItemTaxClass master
    grade:        "",
    size:         "",
    rateDiff:     "",
    referenceItem: "",  // formerly fromItem
    status:       "Active",
  });

  /* ── Category typeahead state ───────────────────────────────────── */
  const [catInput,    setCatInput]    = useState("");
  const [catSug,      setCatSug]      = useState([]);
  const [showCatSug,  setShowCatSug]  = useState(false);
  const catRef = useRef(null);

  /* ── Category options filtered by selected itemTypes ────────────── */
  const [filteredCatOpts, setFilteredCatOpts] = useState([]);

  /* ── Group dropdown (filtered by selected category) ─────────────── */
  const [filteredGroups, setFilteredGroups] = useState([]);

  /* ── Fetch all master data on mount ─────────────────────────────── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
      const [catRes, groupRes, uomRes, classRes, itemRes, taxClassRes] = await Promise.all([
        axios.get(`${API_URL}/api/item-categories`),
        axios.get(`${API_URL}/api/item-group`),
        axios.get(`${API_URL}/api/uoms`),
        axios.get(`${API_URL}/api/item-classes`),
        axios.get(`${API_URL}/api/items`),
        axios.get(`${API_URL}/api/item-tax-classes`),
      ]);
        setAllCategoryOptions(catRes.data.filter((c) => c.status !== "Inactive"));
        setAllGroupOptions(groupRes.data.filter((g) => g.status !== "Inactive"));
        setUomOptions(uomRes.data.filter((u) => u.status !== "Inactive"));
        setItemClassOptions(classRes.data.filter((c) => c.status !== "Inactive"));
        setItemOptions(itemRes.data);
        setItemTaxClassOptions(taxClassRes.data.filter((t) => t.status !== "Inactive"));
      } catch (err) {
        console.log("Error loading master data:", err);
      }
    };
    fetchAll();
  }, []);

  /* Close typeahead on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setShowCatSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── When itemTypes changes → filter categories ─────────────────── */
  const handleItemTypesChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, itemTypes: val, category: "", itemGroup: "" }));
    setCatInput("");
    setFilteredGroups([]);

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

  /* ── Category typeahead handlers ────────────────────────────────── */
  const handleCatInput = (val) => {
    setCatInput(val);
    setFormData((prev) => ({ ...prev, category: "", itemGroup: "" }));
    setFilteredGroups([]);

    if (val.trim()) {
      const lower = val.toLowerCase();
      const matches = filteredCatOpts.filter((n) => n?.toLowerCase().includes(lower));
      setCatSug(matches);
      setShowCatSug(matches.length > 0);
    } else {
      setCatSug([]);
      setShowCatSug(false);
    }
  };

  const handleCatSelect = (catName) => {
    setCatInput(catName);
    setShowCatSug(false);

    const groups = allGroupOptions
      .filter((g) => g.itemTypes?.toLowerCase() === catName.toLowerCase())
      .map((g) => g.itemGroup)
      .filter(Boolean);
    setFilteredGroups([...new Set(groups)].sort());
    setFormData((prev) => ({ ...prev, category: catName, itemGroup: "" }));
  };

  /* ── Generic change ─────────────────────────────────────────────── */
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  /* ── Submit ─────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!formData.itemCode.trim() || !formData.itemName.trim())
      return alert("Item Code and Item Name are required.");
    if (!formData.itemTypes)
      return alert("Item Types is required.");
    if (!formData.category)
      return alert("Category is required.");
    if (!formData.uom)
      return alert("UOM is required.");

    try {
      const res = await axios.post(`${API_URL}/api/create-item`, { ...formData, uomDetails });
      alert(res.data.message);
      setFormData({
        itemCode: "", itemName: "", itemTypes: "", category: "",
        itemGroup: "", date: "", uom: "", hsn: "", gstPercent: "",
        itemClass: "", itemTaxClass: "", grade: "", size: "",
        rateDiff: "", referenceItem: "", status: "Active",
      });
      setCatInput("");
      setFilteredGroups([]);
      setFilteredCatOpts([]);
      setUomDetails([]);
    } catch (err) {
      console.log(err);
      alert("Error Saving Item");
    }
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="create-page">
      <ModuleNavbar />

      <div className="create-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1>Item Master</h1>
      </div>

      <div className="create-container">
        <div className="create-title">Create Item</div>

        <div className="create-grid">

          {/* ITEM CODE */}
          <div className="form-group">
            <label>* Item Code</label>
            <input
              type="text"
              name="itemCode"
              value={formData.itemCode}
              onChange={handleChange}
              placeholder="e.g. ITEM001"
            />
          </div>

          {/* ITEM NAME */}
          <div className="form-group">
            <label>* Item Name</label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              placeholder="Full item name"
            />
          </div>

          {/* ITEM TYPES — step 1 */}
          <div className="form-group">
            <label>* Item Types</label>
            <select
              name="itemTypes"
              value={formData.itemTypes}
              onChange={handleItemTypesChange}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: formData.itemTypes ? "1.5px solid #1976d2" : "1px solid #ccc",
                background: formData.itemTypes ? "#e8f4fd" : "#fff",
                color: formData.itemTypes ? "#1976d2" : "#555",
                fontWeight: formData.itemTypes ? "600" : "400",
                cursor: "pointer",
                outline: "none",
                transition: "border 0.2s, background 0.2s",
              }}
            >
              <option value="">— Select Type —</option>
              {ITEM_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* CATEGORY — filtered by itemTypes, step 2 */}
          <div className="form-group">
            <label>* Category</label>
            <TypeAhead
              value={catInput}
              onChange={handleCatInput}
              onSelect={handleCatSelect}
              suggestions={catSug.length > 0 ? catSug : filteredCatOpts}
              show={showCatSug || (!!formData.itemTypes && filteredCatOpts.length > 0 && !formData.category)}
              setShow={setShowCatSug}
              placeholder={
                !formData.itemTypes
                  ? "Select Item Type first…"
                  : filteredCatOpts.length === 0
                  ? "No categories for this type"
                  : "Type or click to pick category…"
              }
              inputRef={catRef}
            />
            {formData.category && (
              <span style={{ fontSize: "11px", color: "#2e7d32", marginTop: "4px", display: "block" }}>
                ✓ {formData.category}
              </span>
            )}
            {formData.itemTypes && filteredCatOpts.length === 0 && (
              <span style={{ fontSize: "11px", color: "#e55", marginTop: "4px", display: "block" }}>
                No categories found for "{formData.itemTypes}". Add in Masters → Item Category.
              </span>
            )}
          </div>

          {/* ITEM GROUP — filtered by category, step 3 */}
          <div className="form-group">
            <label>Item Group</label>
            <select
              name="itemGroup"
              value={formData.itemGroup}
              onChange={handleChange}
              disabled={!formData.category}
            >
              <option value="">
                {!formData.category
                  ? "Select Category first"
                  : filteredGroups.length > 0
                  ? "— Select Group —"
                  : "No groups for this category"}
              </option>
              {filteredGroups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            {formData.category && filteredGroups.length === 0 && (
              <span style={{ fontSize: "11px", color: "#e55", marginTop: "4px", display: "block" }}>
                Add groups in Masters → Item Group.
              </span>
            )}
          </div>

          {/* DATE — after Item Group */}
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          {/* HSN */}
          <div className="form-group">
            <label>HSN</label>
            <input
              type="text"
              name="hsn"
              value={formData.hsn}
              onChange={handleChange}
              placeholder="e.g. 72141090"
            />
          </div>

          {/* UOM */}
          <div className="form-group">
            <label>* UOM</label>
            <select
              name="uom"
              value={formData.uom}
              onChange={(e) => {
                const selectedUom = e.target.value;
                setFormData({ ...formData, uom: selectedUom });
                setUomDetails([
                  { bUom: selectedUom, bQty: 1, wUom: selectedUom, wQty: 1, isBuom: true },
                ]);
              }}
            >
              <option value="">- Select -</option>
              {uomOptions.length > 0 ? (
                uomOptions.map((u) => (
                  <option key={u._id} value={u.uomName}>
                    {u.uomName}
                  </option>
                ))
              ) : (
                <option disabled>No UOMs found — add in UOM Master</option>
              )}
            </select>
            {uomOptions.length === 0 && (
              <span style={{ fontSize: "11px", color: "#e55", marginTop: "4px", display: "block" }}>
                Go to Masters → UOM Master and create UOMs first.
              </span>
            )}
          </div>

          {/* GST % */}
          <div className="form-group">
            <label>GST %</label>
            <input
              type="number"
              name="gstPercent"
              value={formData.gstPercent}
              onChange={handleChange}
              placeholder="e.g. 18"
            />
          </div>

          {/* ITEM CLASS — from ItemClass master */}
          <div className="form-group">
            <label>Item Class</label>
            <select
              name="itemClass"
              value={formData.itemClass}
              onChange={handleChange}
            >
              <option value="">— Select Class —</option>
              {itemClassOptions.length > 0 ? (
                itemClassOptions.map((c) => (
                  <option key={c._id} value={c.className}>{c.className}</option>
                ))
              ) : (
                <option disabled>No classes found — add in Masters → Item Class</option>
              )}
            </select>
            {itemClassOptions.length === 0 && (
              <span style={{ fontSize: "11px", color: "#e55", marginTop: "4px", display: "block" }}>
                Go to Masters → Item Class and create classes first.
              </span>
            )}
          </div>

          {/* ITEM TAX CLASS — from ItemTaxClass master */}
          <div className="form-group">
            <label>Item Tax Class</label>
            <select
              name="itemTaxClass"
              value={formData.itemTaxClass}
              onChange={handleChange}
            >
              <option value="">— Select Tax Class —</option>
              {itemTaxClassOptions.length > 0 ? (
                itemTaxClassOptions.map((t) => (
                  <option key={t._id} value={t.itemTaxClassCode}>
                    {t.itemTaxClassCode} — {t.description}
                  </option>
                ))
              ) : (
                <option disabled>No tax classes found — add in Masters → Item Tax Class</option>
              )}
            </select>
            {itemTaxClassOptions.length === 0 && (
              <span style={{ fontSize: "11px", color: "#e55", marginTop: "4px", display: "block" }}>
                Go to Masters → Item Tax Class and create tax classes first.
              </span>
            )}
          </div>

          {/* GRADE */}
          <div className="form-group">
            <label>Grade</label>
            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              placeholder="e.g. Fe500"
            />
          </div>

          {/* SIZE */}
          <div className="form-group">
            <label>Size</label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleChange}
              placeholder="e.g. 12mm"
            />
          </div>
          {/* RATE DIFF */}
          <div className="form-group">
            <label>Rate Diff</label>
            <input
              type="number"
              name="rateDiff"
              value={formData.rateDiff}
              onChange={handleChange}
              placeholder="Enter Rate Difference"
            />
          </div>

          {/* REFERENCE ITEM — shows item code only */}
          <div className="form-group">
            <label>Reference Item</label>
            <select
              name="referenceItem"
              value={formData.referenceItem}
              onChange={handleChange}
            >
              <option value="">— None —</option>
              {itemOptions.map((item) => (
                <option key={item._id} value={item.itemCode}>
                  {item.itemCode}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="action-buttons">
          <button className="draft-btn">Save as Draft</button>
          <button className="submit-btn" onClick={handleSubmit}>Submit</button>
          <button className="cancel-btn" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreateItem;