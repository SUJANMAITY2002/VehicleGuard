import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateInwardWeighment.css";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";

const GIN_API = "http://localhost:5000/api/goods-inward-note";
const WEIGHMENT_API = "http://localhost:5000/api/weighment";
const today = new Date().toISOString().split("T")[0];

const genWeighmentNo = () =>
  `WM/IN/26-27/${Math.floor(100000 + Math.random() * 900000)}`;

const blankForm = () => ({
  weighmentNo: genWeighmentNo(),
  transactionCategory: "",
  status: "Open",
  inwardOutwardNoteNo: "",
  vehicleNo: "",
  site: "Factory Office-GYPMART INDIA",
  transactionType: "Inward",
  partyName: "",
  transporterName: "",
  weighmentInDate: today,
  weighmentInTime: "",
  weighmentDate: today,
  weighmentOutDate: today,
  weighmentOutTime: "",
  firstWeight: "",
  secondWeight: "",
  netWeight: "",
  supplierInvoiceNo: "",
  supplierInvoiceDate: today,
  transitDate: "",
  billNo: "",
  billDate: today,
  totalDispatchWeight: "",
  remarks: "",
  bulkWeigh: false,
});

const ginToForm = (gin) => ({
  inwardOutwardNoteNo: gin.ginNo || "",
  vehicleNo: gin.vehicleNo || "",
  vendorCode: gin.vendorCode || "",
  vendorName: gin.vendorName || "",
  partyName: gin.vendorName || "",
  poCpoNo: gin.poCpoNo || "",
  manufacturerName: gin.manufacturerName || "",
  site: gin.site || "",
  transactionCategory: gin.transactionCategory || "",
  supplierInvoiceNo: gin.challanInvoiceNo || "",
  supplierInvoiceDate: gin.challanDate || today,
  billDate: gin.billDate || today,
  ewayDate: gin.ewayDate || today,
  remarks: gin.remarks || "",
  weighmentDate: gin.ginDate || today,
});

const blankItem = (sNo, inherit = "") => ({
  sNo,
  firstWeight:  inherit,
  secondWeight: "",
  netWeight:    "",
  weightInput:  "",          // weighbridge input field
  remarks:      "",
  firstLocked:  !!inherit,   // if pre-filled, it's locked
  secondLocked: false,
  _checked:     false,
});

const DEFAULT_ROWS = 4;

const CreateInwardWeighment = () => {
  const navigate = useNavigate();

  const [ginFilters, setGinFilters] = useState({
    ginNumber: "",
    vendorCode: "",
    vehicleNo: "",
    poCpoNo: "",
    transactionCategory: "",
    status: "",
    fromDate: "",
    toDate: "",
  });

  const [ginResults, setGinResults] = useState([]);
  const [ginSearched, setGinSearched] = useState(false);
  const [ginLoading, setGinLoading] = useState(false);
  const [selectedGinId, setSelectedGinId] = useState(null);
  const [editGinId, setEditGinId] = useState(null);
  const [editGinRow, setEditGinRow] = useState({});

  const [form, setForm] = useState(blankForm());
  const [items, setItems] = useState(
    Array.from({ length: DEFAULT_ROWS }, (_, i) => blankItem(i + 1))
  );
  const [insertCount, setInsertCount] = useState(5);
  const [saving, setSaving] = useState(false);

  const handleGinFilterChange = (e) => {
    setGinFilters((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleGinSearch = async () => {
    setGinLoading(true);
    setGinSearched(true);
    setEditGinId(null);

    try {
      const params = new URLSearchParams();
      params.append("vehicleEntry", "Inward");

      Object.entries(ginFilters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });

      const res = await axios.get(`${GIN_API}?${params.toString()}`);
      setGinResults(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch GIN records");
    } finally {
      setGinLoading(false);
    }
  };

  const handleGinReset = () => {
    setGinFilters({
      ginNumber: "",
      vendorCode: "",
      vehicleNo: "",
      poCpoNo: "",
      transactionCategory: "",
      status: "",
      fromDate: "",
      toDate: "",
    });
    setGinResults([]);
    setGinSearched(false);
    setSelectedGinId(null);
    setForm(blankForm());
  };

  const openWeighmentDetail = async (e, gin) => {
    e.stopPropagation();

    if (editGinId) return;

    const ginNo = gin?.ginNo;
    if (!ginNo) {
      alert("GIN number not found");
      return;
    }

    try {
      const res = await axios.get(WEIGHMENT_API, {
        params: {
          inwardOutwardNoteNo: ginNo,
          transactionType: "Inward",
        },
      });

      const weighments = res.data?.data || [];
      const match =
        weighments.find((w) => w.inwardOutwardNoteNo === ginNo) ||
        weighments[0];

      if (!match?._id) {
        alert("No weighment record found for this GIN number");
        return;
      }

      navigate(`/weighment-detail/${match._id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to open weighment details");
    }
  };

  const handleSelectGin = (gin) => {
    if (editGinId) return;
    setSelectedGinId(gin._id);
    setForm((prev) => ({ ...prev, ...ginToForm(gin) }));
  };

  const startGinEdit = (e, row) => {
    e.stopPropagation();
    setEditGinId(row._id);
    setEditGinRow({ ...row });
  };

  const cancelGinEdit = (e) => {
    e.stopPropagation();
    setEditGinId(null);
    setEditGinRow({});
  };

  const handleGinEditChange = (e) => {
    setEditGinRow((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const saveGinEdit = async (e) => {
    e.stopPropagation();

    try {
      const res = await axios.put(`${GIN_API}/${editGinId}`, editGinRow);
      const updated = res.data.data;

      setGinResults((prev) =>
        prev.map((r) => (r._id === editGinId ? updated : r))
      );

      if (selectedGinId === editGinId) {
        setForm((prev) => ({ ...prev, ...ginToForm(updated) }));
      }

      setEditGinId(null);
      setEditGinRow({});
    } catch (err) {
      console.error(err);
      alert("GIN update failed");
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updated = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
    };

    if (name === "firstWeight" || name === "secondWeight") {
      const f =
        parseFloat(name === "firstWeight" ? value : form.firstWeight || 0) || 0;
      const s =
        parseFloat(name === "secondWeight" ? value : form.secondWeight || 0) ||
        0;
      updated.netWeight = f > 0 && s > 0 ? String(Math.abs(f - s)) : "";
    }

    setForm(updated);
  };

  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[rowIdx], [field]: value };

      if (field === "firstWeight" || field === "secondWeight") {
        const f =
          parseFloat(field === "firstWeight" ? value : row.firstWeight || 0) ||
          0;
        const s =
          parseFloat(
            field === "secondWeight" ? value : row.secondWeight || 0
          ) || 0;
        row.netWeight = f > 0 && s > 0 ? String(Math.abs(f - s)) : "";
      }

      next[rowIdx] = row;
      return next;
    });
  };

  const handleItemCheck = (rowIdx, checked) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], _checked: checked };
      return next;
    });
  };

  const handleDeleteChecked = () => {
    setItems((prev) =>
      prev
        .filter((r) => !r._checked)
        .map((r, i) => ({ ...r, sNo: i + 1 }))
    );
  };

  const handleInsertRows = () => {
    const count = Math.max(1, Math.min(50, Number(insertCount) || 1));

    setItems((prev) => {
      const startSNo = prev.length + 1;
      return [
        ...prev,
        ...Array.from({ length: count }, (_, i) => blankItem(startSNo + i)),
      ];
    });
  };

  const handleRowFocus = (rowIdx) => {
    if (rowIdx === 0) return;

    setItems((prev) => {
      const prevRow = prev[rowIdx - 1];
      if (!prevRow.secondWeight) return prev;

      const next   = [...prev];
      const curRow = { ...next[rowIdx] };

      if (!curRow.firstLocked && !curRow.firstWeight) {
        curRow.firstWeight = prevRow.secondWeight;
        curRow.firstLocked = true;
        const f = parseFloat(prevRow.secondWeight) || 0;
        const s = parseFloat(curRow.secondWeight || 0) || 0;
        curRow.netWeight = s > 0 ? String(Math.abs(f - s)) : "";
      }

      next[rowIdx] = curRow;
      return next;
    });
  };

  /* ── Item row: Get Weight (single slot — sets secondWeight, then locks) ── */
  const getItemWeight = (rowIdx) => {
    setItems((prev) => {
      const next = [...prev];
      const row  = { ...next[rowIdx] };

      if (row.secondLocked) {
        alert("Second weight already recorded for this row.");
        return prev;
      }

      const value = parseFloat(row.weightInput);
      if (!value) { alert("Enter a weight value first"); return prev; }

      const first = parseFloat(row.firstWeight || 0) || 0;
      row.secondWeight = String(value);
      row.netWeight    = String(Math.abs(first - value));
      row.secondLocked = true;
      row.weightInput  = "";

      next[rowIdx] = row;
      return next;
    });
  };

  const anyChecked = items.some((r) => r._checked);

  const handleSubmit = async () => {
    if (!form.vehicleNo.trim()) {
      alert("Vehicle Number is required");
      return;
    }

    setSaving(true);

    try {
      const cleanItems = items
        .filter((r) => {
          const { sNo, _checked, weightInput, firstLocked, secondLocked, ...rest } = r;
          return Object.values(rest).some((v) => v !== "");
        })
        .map(({ _checked, weightInput, firstLocked, secondLocked, ...r }) => r);

      const payload = {
        ...form,
        transactionType: "Inward",
        items: cleanItems,
      };

      const res = await axios.post(WEIGHMENT_API, payload);
      alert(res.data.message || "Weighment Saved");
      navigate("/weighment-search");
    } catch (err) {
      console.error(err);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const ginCell = (field, type = "text") => (
    <input
      type={type}
      name={field}
      value={editGinRow[field] ?? ""}
      onChange={handleGinEditChange}
      onClick={(e) => e.stopPropagation()}
      className="ciw-inline-input"
    />
  );

  const ginSelCell = (field, opts) => (
    <select
      name={field}
      value={editGinRow[field] ?? ""}
      onChange={handleGinEditChange}
      onClick={(e) => e.stopPropagation()}
      className="ciw-inline-input"
    >
      {opts.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );

  return (
    <div className="ciw-page">
      <ModuleNavbar />

      <div className="ciw-page-header">
        <button
          className="ciw-back-btn"
          onClick={() => navigate("/weighment-search")}
        >
          ←
        </button>
        <h2>Create Inward Weighment</h2>
        <span className="ciw-badge inward">Inward</span>
      </div>

      <div className="ciw-card">
        <div className="ciw-section-title">Search Inward GIN Records</div>

        <div className="ciw-search-grid">
          <div className="ciw-field">
            <label>GIN Number</label>
            <input
              type="text"
              name="ginNumber"
              value={ginFilters.ginNumber}
              onChange={handleGinFilterChange}
              placeholder="GIN/26-27/..."
            />
          </div>

          <div className="ciw-field">
            <label>Vendor Code</label>
            <input
              type="text"
              name="vendorCode"
              value={ginFilters.vendorCode}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>Vehicle No</label>
            <input
              type="text"
              name="vehicleNo"
              value={ginFilters.vehicleNo}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>PO/CPO No</label>
            <input
              type="text"
              name="poCpoNo"
              value={ginFilters.poCpoNo}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>Transaction Category</label>
            <select
              name="transactionCategory"
              value={ginFilters.transactionCategory}
              onChange={handleGinFilterChange}
            >
              <option value="">-- Select --</option>
              <option>Purchase</option>
              <option>Sales</option>
            </select>
          </div>

          <div className="ciw-field">
            <label>Status</label>
            <select
              name="status"
              value={ginFilters.status}
              onChange={handleGinFilterChange}
            >
              <option value="">-- Select --</option>
              <option>Open</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="ciw-field">
            <label>From Date</label>
            <input
              type="date"
              name="fromDate"
              value={ginFilters.fromDate}
              onChange={handleGinFilterChange}
            />
          </div>

          <div className="ciw-field">
            <label>To Date</label>
            <input
              type="date"
              name="toDate"
              value={ginFilters.toDate}
              onChange={handleGinFilterChange}
            />
          </div>
        </div>

        <div className="ciw-search-actions">
          <button className="ciw-reset-btn" onClick={handleGinReset}>
            Reset
          </button>
          <button className="ciw-search-btn" onClick={handleGinSearch}>
            {ginLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {ginSearched && (
        <div className="ciw-card ciw-results-card">
          <div className="ciw-section-title">
            Inward GIN Records
            {ginResults.length > 0 && (
              <span className="ciw-count">
                {ginResults.length} record(s) - click a row to auto-fill the
                form below
              </span>
            )}
          </div>

          {ginLoading && <div className="ciw-placeholder">Loading...</div>}

          {!ginLoading && ginResults.length === 0 && (
            <div className="ciw-placeholder">No Inward GIN records found</div>
          )}

          {!ginLoading && ginResults.length > 0 && (
            <div className="ciw-table-wrap">
              <table className="ciw-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>GIN No</th>
                    <th>GIN Date</th>
                    <th>Vehicle Entry</th>
                    <th>Vehicle No</th>
                    <th>PO/CPO No</th>
                    <th>Transaction Category</th>
                    <th>Vendor Code</th>
                    <th>Vendor Name</th>
                    <th>Manufacturer Name</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Remarks</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {ginResults.map((row, idx) => {
                    const isEditing = editGinId === row._id;
                    const isSelected = selectedGinId === row._id;

                    return (
                      <tr
                        key={row._id}
                        className={`${isEditing ? "editing-row" : ""} ${
                          isSelected ? "selected-row" : ""
                        }`}
                        onClick={() => handleSelectGin(row)}
                        title={isEditing ? "" : "Click to auto-fill form"}
                      >
                        <td>{idx + 1}</td>

                        <td>
                          <button
                            className="ciw-gin-no-link"
                            onClick={(e) => openWeighmentDetail(e, row)}
                          >
                            {row.ginNo || "-"}
                          </button>
                        </td>

                        <td>
                          {isEditing
                            ? ginCell("ginDate", "date")
                            : row.ginDate || "-"}
                        </td>

                        <td>
                          <span
                            className={`ciw-entry-badge ${(
                              row.vehicleEntry || ""
                            ).toLowerCase()}`}
                          >
                            {row.vehicleEntry || "-"}
                          </span>
                        </td>

                        <td>
                          {isEditing ? ginCell("vehicleNo") : row.vehicleNo || "-"}
                        </td>

                        <td>
                          {isEditing ? ginCell("poCpoNo") : row.poCpoNo || "-"}
                        </td>

                        <td>
                          {isEditing
                            ? ginCell("transactionCategory")
                            : row.transactionCategory || "-"}
                        </td>

                        <td>
                          {isEditing
                            ? ginCell("vendorCode")
                            : row.vendorCode || "-"}
                        </td>

                        <td>
                          {isEditing
                            ? ginCell("vendorName")
                            : row.vendorName || "-"}
                        </td>

                        <td>
                          {isEditing
                            ? ginCell("manufacturerName")
                            : row.manufacturerName || "-"}
                        </td>

                        <td>{isEditing ? ginCell("billNo") : row.billNo || "-"}</td>

                        <td>
                          {isEditing
                            ? ginCell("billDate", "date")
                            : row.billDate || "-"}
                        </td>

                        <td>
                          {isEditing ? ginCell("remarks") : row.remarks || "-"}
                        </td>

                        <td>
                          {isEditing ? (
                            ginSelCell("status", ["Open", "Closed"])
                          ) : (
                            <span
                              className={`ciw-status-badge ${(
                                row.status || ""
                              ).toLowerCase()}`}
                            >
                              {row.status || "-"}
                            </span>
                          )}
                        </td>

                        <td
                          className="ciw-action-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isEditing ? (
                            <>
                              <button
                                className="ciw-save-row-btn"
                                onClick={saveGinEdit}
                              >
                                Save
                              </button>
                              <button
                                className="ciw-cancel-row-btn"
                                onClick={cancelGinEdit}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="ciw-edit-row-btn"
                              onClick={(e) => startGinEdit(e, row)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="ciw-card">
        <div className="ciw-section-title">
          Weighment Entry - Inward
          {selectedGinId && (
            <span className="ciw-prefilled-note">
              ✓ Auto-filled from selected GIN
            </span>
          )}
        </div>

        <div className="ciw-form-grid">
          <div className="ciw-field">
            <label>Weighment No</label>
            <input
              name="weighmentNo"
              value={form.weighmentNo}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Transaction Category *</label>
            <select
              name="transactionCategory"
              value={form.transactionCategory}
              onChange={handleFormChange}
            >
              <option value="">Select</option>
              <option>Purchase</option>
              <option>Sales</option>
            </select>
          </div>

          <div className="ciw-field">
            <label>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
            >
              <option>Open</option>
              <option>Closed</option>
            </select>
          </div>

          <div className="ciw-field">
            <label>Transaction Type</label>
            <input value="Inward" readOnly className="ciw-readonly" />
          </div>

          <div className="ciw-field">
            <label>Inward/Outward Note No</label>
            <input
              name="inwardOutwardNoteNo"
              value={form.inwardOutwardNoteNo}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Vehicle No *</label>
            <input
              name="vehicleNo"
              value={form.vehicleNo}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Party Name</label>
            <input
              name="partyName"
              value={form.partyName}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Transporter Name</label>
            <input
              name="transporterName"
              value={form.transporterName}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Site</label>
            <input name="site" value={form.site} onChange={handleFormChange} />
          </div>

          <div className="ciw-field">
            <label>Weighment Date</label>
            <input
              type="date"
              name="weighmentDate"
              value={form.weighmentDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Weighment In Date</label>
            <input
              type="date"
              name="weighmentInDate"
              value={form.weighmentInDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Weighment In Time</label>
            <input
              type="time"
              name="weighmentInTime"
              value={form.weighmentInTime}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Weighment Out Date</label>
            <input
              type="date"
              name="weighmentOutDate"
              value={form.weighmentOutDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Weighment Out Time</label>
            <input
              type="time"
              name="weighmentOutTime"
              value={form.weighmentOutTime}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>First Weight (MT)</label>
            <input
              type="number"
              step="0.001"
              name="firstWeight"
              value={form.firstWeight}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Second Weight (MT)</label>
            <input
              type="number"
              step="0.001"
              name="secondWeight"
              value={form.secondWeight}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Net Weight (MT)</label>
            <input
              name="netWeight"
              value={form.netWeight}
              readOnly
              className="ciw-readonly"
            />
          </div>

          <div className="ciw-field">
            <label>Supplier Invoice No</label>
            <input
              name="supplierInvoiceNo"
              value={form.supplierInvoiceNo}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Supplier Invoice Date</label>
            <input
              type="date"
              name="supplierInvoiceDate"
              value={form.supplierInvoiceDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Bill No</label>
            <input
              name="billNo"
              value={form.billNo}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Bill Date</label>
            <input
              type="date"
              name="billDate"
              value={form.billDate}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Total Dispatch Weight</label>
            <input
              name="totalDispatchWeight"
              value={form.totalDispatchWeight}
              onChange={handleFormChange}
            />
          </div>

          <div className="ciw-field">
            <label>Transit Date</label>
            <input
              type="date"
              name="transitDate"
              value={form.transitDate}
              onChange={handleFormChange}
            />
          </div>
        </div>

        <div className="ciw-textarea-row">
          <div className="ciw-field">
            <label>Remarks</label>
            <textarea
              rows="3"
              name="remarks"
              value={form.remarks}
              onChange={handleFormChange}
            />
          </div>
        </div>

        <div className="ciw-checkbox-row">
          <label className="ciw-checkbox-label">
            <input
              type="checkbox"
              name="bulkWeigh"
              checked={form.bulkWeigh}
              onChange={handleFormChange}
            />
            Bulk Weigh
          </label>
        </div>

        <div className="cw-items-section" style={{ margin: "18px 0 0" }}>
          <div className="cw-items-header">
            <span className="cw-items-title">* Items</span>
            {anyChecked && (
              <button className="cw-del-rows-btn" onClick={handleDeleteChecked}>
                Delete Selected
              </button>
            )}
          </div>

          <div className="cw-items-table-wrap">
            <table className="cw-items-table">
              <thead>
                <tr>
                  <th>S No</th>
                  <th>Del</th>
                  <th>First Weight (MT)</th>
                  <th>Second Weight (MT)</th>
                  <th>Net Weight (MT)</th>
                  <th>Weight Input (MT)</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {items.map((row, idx) => (
                  <tr
                    key={idx}
                    className={row._checked ? "cw-row-checked" : ""}
                    onFocus={() => handleRowFocus(idx)}
                  >
                    {/* S No */}
                    <td className="cw-sno">{row.sNo}</td>

                    {/* Delete checkbox */}
                    <td className="cw-check-cell">
                      <input
                        type="checkbox"
                        checked={!!row._checked}
                        onChange={(e) => handleItemCheck(idx, e.target.checked)}
                      />
                    </td>

                    {/* First Weight — read-only, auto-inherited from previous row's second weight */}
                    <td>
                      <div className="cw-item-wt-cell">
                        <input
                          className={`cw-item-input cw-wt-input${row.firstLocked ? " cw-locked" : " cw-wt-yellow"}`}
                          value={row.firstWeight}
                          readOnly
                          placeholder="← auto"
                        />
                        {row.firstLocked && <span className="cw-lock-icon-sm">🔒</span>}
                      </div>
                    </td>

                    {/* Second Weight — set via Get Wt, read-only after locked */}
                    <td>
                      <div className="cw-item-wt-cell">
                        <input
                          className={`cw-item-input cw-wt-input${row.secondLocked ? " cw-locked" : " cw-wt-yellow"}`}
                          value={row.secondWeight}
                          readOnly
                          placeholder="—"
                        />
                        {row.secondLocked && <span className="cw-lock-icon-sm">🔒</span>}
                      </div>
                    </td>

                    {/* Net Weight — always read-only, auto-calculated */}
                    <td>
                      <input
                        className="cw-item-input cw-net-wt-input"
                        value={row.netWeight}
                        readOnly
                        placeholder="—"
                      />
                    </td>

                    {/* Weight Input + Get Wt button */}
                    <td>
                      <div className="cw-item-get-wrap">
                        <input
                          type="number"
                          step="0.001"
                          className="cw-item-input cw-wb-item-input"
                          value={row.weightInput}
                          onChange={(e) => handleItemChange(idx, "weightInput", e.target.value)}
                          disabled={row.secondLocked}
                          placeholder={row.secondLocked ? "✓" : "0.000"}
                        />
                        <button
                          type="button"
                          className={`cw-get-wt-row-btn${row.secondLocked ? " cw-get-done" : ""}`}
                          onClick={() => getItemWeight(idx)}
                          disabled={row.secondLocked}
                        >
                          {row.secondLocked ? "✓" : "Get Wt"}
                        </button>
                      </div>
                    </td>

                    {/* Remarks */}
                    <td>
                      <input
                        className="cw-item-input cw-remarks-input"
                        value={row.remarks}
                        onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cw-insert-row-bar">
            <input
              type="number"
              min="1"
              max="50"
              className="cw-insert-count"
              value={insertCount}
              onChange={(e) => setInsertCount(e.target.value)}
            />
            <button className="cw-insert-row-btn" onClick={handleInsertRows}>
              Insert Row
            </button>
          </div>
        </div>

        <div className="ciw-form-actions">
          <button
            className="ciw-cancel-btn"
            onClick={() => navigate("/weighment-search")}
            disabled={saving}
          >
            Cancel
          </button>

          <button className="ciw-draft-btn" disabled={saving}>
            Save as Draft
          </button>

          <button
            className="ciw-save-btn"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInwardWeighment;