import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateDirectGRN.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const GIN_API = `${API_URL}/api/goods-inward-note`;
const GRN_API = `${API_URL}/api/direct-grn`;
const DOC_API = `${API_URL}/api/document-sequence`;
const today   = new Date().toISOString().split("T")[0];

/* ── blank item ── */
const blankItem = (sNo) => ({
  sNo, insertBags: "", itemRate: "", transactionNo: "",
  partyName: "", broker: "", itemCode: "", itemName: "",
  uom: "", salesThrough: "", _checked: false,
});

/* ── blank form (header) ── */
const defaultForm = () => ({
  grnNo:               "",
  status:              "Open",
  grnDate:             today,
  grnDescription:      "",
  grnType:             "F and A Impact",
  transactionCategory: "",
  site:                "Factory Office-GYPMART INDIA",
  accountingSite:      "Factory Office",
  vendorCode:          "",
  vendorName:          "",
  vendorAddress:       "",
  acCode:              "",
  currency:            "",
  exchangeRate:        "",
  challanInvoiceNo:    "",
  challanDate:         today,
  deliveryMode:        "BY AIR-BY AIR",
  creditTerms:         "",
  manufacturerCode:    "",
  manufacturerName:    "",
  manufacturerAddress: "",
  vehicleNo:           "",
  billDate:            today,
  ewayDate:            today,
  deliveryTerm:        "",
  remarks:             "",
  comments:            "",
  linkedGinNo:         "",
});

const CreateDirectGRN = () => {

  const navigate = useNavigate();

  /* ── form state ── */
  const [form,    setForm]    = useState(defaultForm());
  const [items,   setItems]   = useState([blankItem(1)]);
  const [loading, setLoading] = useState(false);
  const [insertCount, setInsertCount] = useState(1);

  /* ── GIN fetch state ── */
  const [ginList,     setGinList]     = useState([]);
  const [ginLoading,  setGinLoading]  = useState(false);
  const [ginSearched, setGinSearched] = useState(false);
  const [ginFilters,  setGinFilters]  = useState({
    ginNumber: "", vendorCode: "", vendorName: "", vehicleNo: "",
    transactionCategory: "", status: "", site: "",
  });
  const [selectedGinId, setSelectedGinId] = useState(null);

  /* ── transaction codes ── */
  const [txCodes, setTxCodes] = useState([]);

  /* ── auto-generate GRN No on mount + fetch tx codes ── */
  useEffect(() => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    setForm((p) => ({ ...p, grnNo: `DGRN/26-27/${rand}` }));

    axios.get(DOC_API)
      .then((res) => setTxCodes(res.data.map((d) => d.generatedCode).filter(Boolean)))
      .catch(() => {});
  }, []);

  /* ══════════════════════════════════
     GIN SEARCH
  ══════════════════════════════════ */
  const handleGinFilterChange = (e) => {
    const { name, value } = e.target;
    setGinFilters((p) => ({ ...p, [name]: value }));
  };

  const handleGinSearch = async () => {
    setGinLoading(true);
    setGinSearched(true);
    try {
      const params = new URLSearchParams();
      Object.entries(ginFilters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res  = await axios.get(`${GIN_API}?${params.toString()}`);
      setGinList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch GIN records");
    } finally {
      setGinLoading(false);
    }
  };

  const handleGinReset = () => {
    setGinFilters({ ginNumber:"", vendorCode:"", vendorName:"", vehicleNo:"",
      transactionCategory:"", status:"", site:"" });
    setGinList([]);
    setGinSearched(false);
    setSelectedGinId(null);
  };

  /* ── select a GIN row → auto-fill form ── */
  const handleSelectGin = (gin) => {
    setSelectedGinId(gin._id);
    setForm((p) => ({
      ...p,
      linkedGinNo:         gin.ginNo               || p.linkedGinNo,
      grnDate:             gin.ginDate              || p.grnDate,
      transactionCategory: gin.transactionCategory  || p.transactionCategory,
      site:                gin.site                 || p.site,
      vendorCode:          gin.vendorCode           || p.vendorCode,
      vendorName:          gin.vendorName           || p.vendorName,
      vendorAddress:       gin.manufacturerAddress  || p.vendorAddress,
      challanInvoiceNo:    gin.challanInvoiceNo     || p.challanInvoiceNo,
      challanDate:         gin.challanDate          || p.challanDate,
      deliveryMode:        gin.deliveryMode         || p.deliveryMode,
      manufacturerCode:    gin.manufacturerCode     || p.manufacturerCode,
      manufacturerName:    gin.manufacturerName     || p.manufacturerName,
      manufacturerAddress: gin.manufacturerAddress  || p.manufacturerAddress,
      vehicleNo:           gin.vehicleNo            || p.vehicleNo,
      billDate:            gin.billDate             || p.billDate,
      ewayDate:            gin.ewayDate             || p.ewayDate,
      remarks:             gin.remarks              || p.remarks,
      comments:            gin.comments             || p.comments,
    }));

    /* Pre-fill items from GIN if it has items */
    if (Array.isArray(gin.items) && gin.items.length > 0) {
      setItems(gin.items.map((it, i) => ({ ...it, sNo: i + 1, _checked: false })));
    }
  };

  /* ══════════════════════════════════
     FORM HANDLERS
  ══════════════════════════════════ */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  /* ── items ── */
  const handleItemChange = (idx, field, value) =>
    setItems((prev) => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });

  const handleItemCheck = (idx, checked) =>
    setItems((prev) => { const n = [...prev]; n[idx] = { ...n[idx], _checked: checked }; return n; });

  const handleInsertRows = () => {
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));
    setItems((prev) => {
      const start = prev.length + 1;
      return [...prev, ...Array.from({ length: count }, (_, i) => blankItem(start + i))];
    });
  };

  const handleDeleteChecked = () =>
    setItems((prev) => prev.filter((r) => !r._checked).map((r, i) => ({ ...r, sNo: i + 1 })));

  const anyChecked = items.some((r) => r._checked);

  /* ── SAVE ── */
  const handleSave = async (asDraft = false) => {
    if (!form.grnDate)         { alert("GRN Date is required");            return; }
    if (!form.vendorCode)      { alert("Vendor Code is required");         return; }
    if (!form.challanInvoiceNo){ alert("Challan/Invoice No is required");  return; }

    const cleanItems = items
      .filter(({ sNo, _checked, ...rest }) => Object.values(rest).some((v) => v !== ""))
      .map(({ _checked, ...r })            => r);

    const payload = {
      ...form,
      status: asDraft ? "Draft" : form.status,
      items:  cleanItems,
    };

    try {
      setLoading(true);
      const res = await axios.post(GRN_API, payload);
      if (res.data.success) {
        alert(asDraft ? "Saved as Draft" : "Direct GRN Saved Successfully");
        navigate("/direct-grn");
      }
    } catch (err) {
      console.error(err);
      alert("Save Failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <div className="cdgrn-page">

      <ModuleNavbar />

      {/* ── PAGE HEADER ── */}
      <div className="cdgrn-page-header">
        <button className="cdgrn-back-btn" onClick={() => navigate("/direct-grn")}>←</button>
        <h2>Direct GRN</h2>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 1 — FETCH GIN
          Search GIN records and pick one to auto-fill
      ══════════════════════════════════════════ */}
      <div className="cdgrn-card">
        <div className="cdgrn-section-label">Fetch GIN Data (optional — select a record to auto-fill)</div>

        <div className="cdgrn-gin-grid">

          <div className="cdgrn-fg">
            <label>GIN Number</label>
            <input type="text" name="ginNumber" value={ginFilters.ginNumber}
              onChange={handleGinFilterChange} placeholder="GIN/26-27/..." />
          </div>

          <div className="cdgrn-fg">
            <label>Vendor Code</label>
            <input type="text" name="vendorCode" value={ginFilters.vendorCode}
              onChange={handleGinFilterChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Vendor Name</label>
            <input type="text" name="vendorName" value={ginFilters.vendorName}
              onChange={handleGinFilterChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Vehicle No</label>
            <input type="text" name="vehicleNo" value={ginFilters.vehicleNo}
              onChange={handleGinFilterChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Transaction Category</label>
            <select name="transactionCategory" value={ginFilters.transactionCategory}
              onChange={handleGinFilterChange}>
              <option value="">-- All --</option>
              <option>Purchase</option>
              <option>Sales</option>
            </select>
          </div>

          <div className="cdgrn-fg">
            <label>Status</label>
            <select name="status" value={ginFilters.status} onChange={handleGinFilterChange}>
              <option value="">-- All --</option>
              <option>Open</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="cdgrn-fg">
            <label>Site</label>
            <select name="site" value={ginFilters.site} onChange={handleGinFilterChange}>
              <option value="">-- All --</option>
              <option>Factory Office-GYPMART INDIA</option>
            </select>
          </div>

        </div>

        <div className="cdgrn-gin-actions">
          <button className="cdgrn-reset-btn" onClick={handleGinReset}>Reset</button>
          <button className="cdgrn-search-btn" onClick={handleGinSearch}>
            {ginLoading ? "Searching..." : "Search GIN"}
          </button>
        </div>

        {/* GIN results */}
        {ginSearched && (
          <div className="cdgrn-gin-results">
            {ginLoading && <div className="cdgrn-placeholder">Loading GIN records...</div>}

            {!ginLoading && ginList.length === 0 && (
              <div className="cdgrn-placeholder">No GIN records found</div>
            )}

            {!ginLoading && ginList.length > 0 && (
              <>
                <div className="cdgrn-gin-hint">
                  Click a row to auto-fill the GRN form below
                </div>
                <div className="cdgrn-gin-table-wrap">
                  <table className="cdgrn-gin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>GIN No</th>
                        <th>GIN Date</th>
                        <th>Vehicle Entry</th>
                        <th>Vendor Code</th>
                        <th>Vendor Name</th>
                        <th>Vehicle No</th>
                        <th>Transaction Category</th>
                        <th>Challan/Invoice No</th>
                        <th>Challan Date</th>
                        <th>GIN Type</th>
                        <th>Delivery Mode</th>
                        <th>Status</th>
                        <th>Site</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ginList.map((gin, idx) => (
                        <tr
                          key={gin._id}
                          className={`cdgrn-gin-row ${selectedGinId === gin._id ? "cdgrn-gin-selected" : ""}`}
                          onClick={() => handleSelectGin(gin)}
                          title="Click to auto-fill GRN form"
                        >
                          <td>{idx + 1}</td>
                          <td><strong>{gin.ginNo || "-"}</strong></td>
                          <td>{gin.ginDate || "-"}</td>
                          <td>
                            <span className={`cdgrn-entry-badge ${(gin.vehicleEntry || "").toLowerCase()}`}>
                              {gin.vehicleEntry || "-"}
                            </span>
                          </td>
                          <td>{gin.vendorCode || "-"}</td>
                          <td>{gin.vendorName || "-"}</td>
                          <td>{gin.vehicleNo  || "-"}</td>
                          <td>{gin.transactionCategory || "-"}</td>
                          <td>{gin.challanInvoiceNo    || "-"}</td>
                          <td>{gin.challanDate         || "-"}</td>
                          <td>{gin.ginType             || "-"}</td>
                          <td>{gin.deliveryMode        || "-"}</td>
                          <td>
                            <span className={`cdgrn-status-badge ${(gin.status || "").toLowerCase()}`}>
                              {gin.status || "-"}
                            </span>
                          </td>
                          <td>{gin.site    || "-"}</td>
                          <td>{gin.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — GRN FORM  (matches screenshot)
      ══════════════════════════════════════════ */}
      <div className="cdgrn-card">

        {form.linkedGinNo && (
          <div className="cdgrn-linked-banner">
            ✓ Linked to GIN: <strong>{form.linkedGinNo}</strong>
          </div>
        )}

        {/* ROW 1: GRN No + Status */}
        <div className="cdgrn-top-row">
          <div className="cdgrn-fg cdgrn-fg-auto">
            <label>Direct GRN No.  ⊕</label>
            <input value={form.grnNo} readOnly className="cdgrn-readonly" />
          </div>
          <div className="cdgrn-fg">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Open</option>
              <option>Closed</option>
              <option>Draft</option>
            </select>
          </div>
        </div>

        {/* MAIN GRID — 4 columns, matches screenshot layout */}
        <div className="cdgrn-main-grid">

          {/* Col 1 */}
          <div className="cdgrn-fg">
            <label>Direct GRN Date *</label>
            <input type="date" name="grnDate" value={form.grnDate} onChange={handleChange} className="cdgrn-highlight" />
          </div>

          <div className="cdgrn-fg">
            <label>Direct GRN Description</label>
            <input type="text" name="grnDescription" value={form.grnDescription} onChange={handleChange} placeholder="Enter description" />
          </div>

          <div className="cdgrn-fg">
            <label>Direct GRN Type *</label>
            <select name="grnType" value={form.grnType} onChange={handleChange}>
              <option>F and A Impact</option>
              <option>Domestic</option>
              <option>International</option>
              <option>No Impact</option>
            </select>
          </div>

          <div className="cdgrn-fg">
            <label>Transaction Category</label>
            <select name="transactionCategory" value={form.transactionCategory} onChange={handleChange}>
              <option value="">--Select--</option>
              {txCodes.map((c, i) => <option key={i}>{c}</option>)}
              <option>Purchase</option>
              <option>Sales</option>
            </select>
          </div>

          {/* Col 2 */}
          <div className="cdgrn-fg">
            <label>Site *</label>
            <select name="site" value={form.site} onChange={handleChange}>
              <option>Factory Office-GYPMART INDIA</option>
            </select>
          </div>

          <div className="cdgrn-fg">
            <label>Vendor Code *</label>
            <input type="text" name="vendorCode" value={form.vendorCode} onChange={handleChange} placeholder="🔍" />
          </div>

          <div className="cdgrn-fg">
            <label>Vendor Name *</label>
            <input type="text" name="vendorName" value={form.vendorName} onChange={handleChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Vendor Address</label>
            <input type="text" name="vendorAddress" value={form.vendorAddress} onChange={handleChange} />
          </div>

          {/* Col 3 */}
          <div className="cdgrn-fg">
            <label>Accounting Site</label>
            <select name="accountingSite" value={form.accountingSite} onChange={handleChange}>
              <option>Factory Office</option>
              <option>Factory Office-GYPMART INDIA</option>
            </select>
          </div>

          <div className="cdgrn-fg">
            <label>A/c Code *</label>
            <input type="text" name="acCode" value={form.acCode} onChange={handleChange} placeholder="🔍" />
          </div>

          <div className="cdgrn-fg">
            <label>Currency</label>
            <select name="currency" value={form.currency} onChange={handleChange}>
              <option value="">-- Select --</option>
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
            </select>
          </div>

          <div className="cdgrn-fg">
            <label>Exchange Rate</label>
            <input type="number" name="exchangeRate" value={form.exchangeRate} onChange={handleChange} placeholder="1.00" />
          </div>

          {/* Col 4 */}
          <div className="cdgrn-fg">
            <label>Challan/Invoice No *</label>
            <input type="text" name="challanInvoiceNo" value={form.challanInvoiceNo} onChange={handleChange} className="cdgrn-highlight" />
          </div>

          <div className="cdgrn-fg">
            <label>Challan Date *</label>
            <input type="date" name="challanDate" value={form.challanDate} onChange={handleChange} className="cdgrn-highlight" />
          </div>

          <div className="cdgrn-fg">
            <label>Delivery Mode</label>
            <select name="deliveryMode" value={form.deliveryMode} onChange={handleChange}>
              <option>BY AIR-BY AIR</option>
              <option>By Road</option>
              <option>By Train</option>
              <option>By Air</option>
              <option>By Sea</option>
            </select>
          </div>

          <div className="cdgrn-fg">
            <label>Credit Terms</label>
            <select name="creditTerms" value={form.creditTerms} onChange={handleChange}>
              <option value="">--Select--</option>
              <option>Net 30</option>
              <option>Net 60</option>
              <option>Net 90</option>
              <option>Immediate</option>
            </select>
          </div>

          {/* Row 2 of grid */}
          <div className="cdgrn-fg">
            <label>Manufacturer Code</label>
            <input type="text" name="manufacturerCode" value={form.manufacturerCode} onChange={handleChange} placeholder="🔍" />
          </div>

          <div className="cdgrn-fg">
            <label>Manufacturer Name</label>
            <input type="text" name="manufacturerName" value={form.manufacturerName} onChange={handleChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Manufacturer Address</label>
            <input type="text" name="manufacturerAddress" value={form.manufacturerAddress} onChange={handleChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Vehicle No</label>
            <input type="text" name="vehicleNo" value={form.vehicleNo} onChange={handleChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Bill Date</label>
            <input type="date" name="billDate" value={form.billDate} onChange={handleChange} />
          </div>

          <div className="cdgrn-fg">
            <label>E-Way Date</label>
            <input type="date" name="ewayDate" value={form.ewayDate} onChange={handleChange} />
          </div>

          <div className="cdgrn-fg">
            <label>Delivery Term</label>
            <input type="text" name="deliveryTerm" value={form.deliveryTerm} onChange={handleChange} placeholder="📎" />
          </div>

        </div>

        {/* Remarks / Comments */}
        <div className="cdgrn-textarea-row">
          <div className="cdgrn-fg">
            <label>Remarks</label>
            <textarea rows="3" name="remarks" value={form.remarks} onChange={handleChange} />
          </div>
          <div className="cdgrn-fg">
            <label>Comments</label>
            <textarea rows="3" name="comments" value={form.comments} onChange={handleChange} />
          </div>
        </div>

      </div>
      {/* end header card */}

      {/* ══════════════════════════════════════════
          SECTION 3 — ITEMS GRID  (matches screenshot)
      ══════════════════════════════════════════ */}
      <div className="cdgrn-card">

        <div className="cdgrn-items-header">
          <span className="cdgrn-items-title">* Items</span>
          {anyChecked && (
            <button className="cdgrn-del-rows-btn" onClick={handleDeleteChecked}>Delete Selected</button>
          )}
        </div>

        <div className="cdgrn-items-table-wrap">
          <table className="cdgrn-items-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>✏</th>
                <th>Del</th>
                <th>Item Rate</th>
                <th>Transaction No</th>
                <th>Party Name</th>
                <th>Broker</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>UOM</th>
                <th>Sales Through</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <tr key={idx} className={row._checked ? "cdgrn-row-checked" : ""}>

                  <td className="cdgrn-sno">{row.sNo}</td>

                  {/* pencil icon / insert bags */}
                  <td>
                    <input
                      className="cdgrn-item-input"
                      value={row.insertBags}
                      onChange={(e) => handleItemChange(idx, "insertBags", e.target.value)}
                      placeholder="Bags"
                    />
                  </td>

                  {/* delete checkbox */}
                  <td className="cdgrn-check-cell">
                    <input
                      type="checkbox"
                      checked={row._checked}
                      onChange={(e) => handleItemCheck(idx, e.target.checked)}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      className="cdgrn-item-input cdgrn-item-num"
                      value={row.itemRate}
                      onChange={(e) => handleItemChange(idx, "itemRate", e.target.value)}
                      placeholder="0.00"
                    />
                  </td>

                  <td>
                    <input
                      className="cdgrn-item-input"
                      value={row.transactionNo}
                      onChange={(e) => handleItemChange(idx, "transactionNo", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      className="cdgrn-item-input cdgrn-item-wide"
                      value={row.partyName}
                      onChange={(e) => handleItemChange(idx, "partyName", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      className="cdgrn-item-input"
                      value={row.broker}
                      onChange={(e) => handleItemChange(idx, "broker", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      className="cdgrn-item-input"
                      value={row.itemCode}
                      onChange={(e) => handleItemChange(idx, "itemCode", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      className="cdgrn-item-input cdgrn-item-wide"
                      value={row.itemName}
                      onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      className="cdgrn-item-input cdgrn-item-sm"
                      value={row.uom}
                      onChange={(e) => handleItemChange(idx, "uom", e.target.value)}
                      placeholder="MT"
                    />
                  </td>

                  <td>
                    <input
                      className="cdgrn-item-input"
                      value={row.salesThrough}
                      onChange={(e) => handleItemChange(idx, "salesThrough", e.target.value)}
                    />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Insert row bar */}
        <div className="cdgrn-insert-bar">
          <input
            type="number" min="1" max="50"
            className="cdgrn-insert-count"
            value={insertCount}
            onChange={(e) => setInsertCount(e.target.value)}
          />
          <button className="cdgrn-insert-btn" onClick={handleInsertRows}>
            Insert Row
          </button>
        </div>

      </div>
      {/* end items card */}

      {/* ── ACTION BUTTONS ── */}
      <div className="cdgrn-form-actions">
        <button
          className="cdgrn-draft-btn"
          onClick={() => handleSave(true)}
          disabled={loading}
        >
          Save as Draft
        </button>
        <button
          className="cdgrn-submit-btn"
          onClick={() => handleSave(false)}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
        <button
          className="cdgrn-cancel-btn"
          onClick={() => navigate("/direct-grn")}
          disabled={loading}
        >
          Cancel
        </button>
      </div>

    </div>
  );
};

export default CreateDirectGRN;