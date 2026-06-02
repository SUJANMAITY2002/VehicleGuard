import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateWeighment.css";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";

const WEIGHMENT_API = "/api/weighment";
const today = new Date().toISOString().split("T")[0];

const blankItem = (sNo) => ({
  sNo,
  firstWeight: "",
  secondWeight: "",
  netWeight: "",
  remarks: "",
  _checked: false,
});

const DEFAULT_ROWS = 4;

const CreateWeighment = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    weighmentNo: "",
    transactionCategory: "",
    status: "Open",
    inwardOutwardNoteNo: "",
    vehicleNo: "",
    site: "Factory Office-GYPMART INDIA",
    transactionType: "",
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
    currentWeight: "",

    supplierInvoiceNo: "",
    supplierInvoiceDate: today,
    transitDate: "",
    billNo: "",
    billDate: today,
    totalDispatchWeight: "",
    remarks: "",
    bulkWeigh: false,
  });

  const [items, setItems] = useState(
    Array.from({ length: DEFAULT_ROWS }, (_, i) => blankItem(i + 1))
  );
  const [insertCount, setInsertCount] = useState(5);
  const [activeRowIdx, setActiveRowIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleItemCheck = (rowIdx, checked) => {
    const previousRow = rowIdx > 0 ? items[rowIdx - 1] : null;
    const currentRow = items[rowIdx];

    const inheritWeight =
      rowIdx === 0
        ? currentRow?.firstWeight || ""
        : previousRow?.secondWeight || currentRow?.firstWeight || "";

    setItems((prev) =>
      prev.map((row, idx) => {
        if (idx === rowIdx) {
          return {
            ...row,
            firstWeight:
              checked && inheritWeight && !row.firstWeight
                ? inheritWeight
                : row.firstWeight,
            _checked: checked,
          };
        }

        return {
          ...row,
          _checked: false,
        };
      })
    );

    if (checked) {
      setActiveRowIdx(rowIdx);

      setFormData((prev) => ({
        ...prev,
        firstWeight: inheritWeight,
        secondWeight: "",
        netWeight: "",
        currentWeight: "",
      }));
    } else {
      setActiveRowIdx(null);
    }
  };

  const getWeight = () => {
    const weight = parseFloat(formData.currentWeight);

    if (!weight) {
      alert("Enter a weight value first");
      return;
    }

    if (!formData.firstWeight) {
      setFormData((prev) => ({
        ...prev,
        firstWeight: String(weight),
        currentWeight: "",
      }));

      if (activeRowIdx !== null) {
        setItems((prev) => {
          const next = [...prev];
          next[activeRowIdx] = {
            ...next[activeRowIdx],
            firstWeight: String(weight),
          };
          return next;
        });
      }

      return;
    }

    if (!formData.secondWeight) {
      const first = parseFloat(formData.firstWeight) || 0;
      const net = Math.abs(first - weight);

      setFormData((prev) => ({
        ...prev,
        secondWeight: String(weight),
        netWeight: String(net),
        currentWeight: "",
      }));

      if (activeRowIdx !== null) {
        setItems((prev) => {
          const next = [...prev];
          const row = { ...next[activeRowIdx] };

          row.secondWeight = String(weight);
          row.netWeight = String(net);
          row._checked = false;

          next[activeRowIdx] = row;
          return next;
        });

        setActiveRowIdx(null);
      }

      return;
    }

    alert("First and Second Weight already recorded");
  };

  const handleRowFocus = (rowIdx) => {
    setItems((prev) => {
      const next = [...prev];

      if (rowIdx === 0) return next;

      const previous = next[rowIdx - 1];

      if (previous.secondWeight && !next[rowIdx].firstWeight) {
        next[rowIdx] = {
          ...next[rowIdx],
          firstWeight: previous.secondWeight,
        };
      }

      return next;
    });
  };

  const handleItemChange = (rowIdx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        [field]: value,
      };
      return next;
    });
  };

  const handleDeleteChecked = () => {
    setItems((prev) =>
      prev
        .filter((row) => !row._checked)
        .map((row, idx) => ({ ...row, sNo: idx + 1 }))
    );

    setActiveRowIdx(null);
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

  const anyChecked = items.some((row) => row._checked);

  const handleSubmit = async (asDraft = false) => {
    if (!formData.vehicleNo.trim()) {
      alert("Vehicle Number is Required");
      return;
    }

    setSaving(true);

    try {
      const { currentWeight, ...mainForm } = formData;

      const cleanItems = items
        .filter((row) => {
          const { sNo, _checked, ...rest } = row;
          return Object.values(rest).some((value) => value !== "");
        })
        .map(({ _checked, ...row }) => row);

      const payload = {
        ...mainForm,
        status: asDraft ? "Draft" : mainForm.status,
        items: cleanItems,
      };

      const res = await axios.post(WEIGHMENT_API, payload);

      alert(res.data.message || "Weighment Saved");
      navigate("/weighment");
    } catch (err) {
      console.error(err);
      alert("Save Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/weighment");

  const weightButtonText = !formData.firstWeight
    ? "Get Weight (-> 1st)"
    : !formData.secondWeight
    ? "Get Weight (-> 2nd)"
    : "Completed";

  const weightHint = !formData.firstWeight
    ? " - will set First Weight"
    : !formData.secondWeight
    ? " - will set Second Weight"
    : " - completed";

  const weightDisabled = !!formData.firstWeight && !!formData.secondWeight;

  return (
    <div className="cw-page">
      <ModuleNavbar />

      <div className="cw-header">
        <button className="cw-back-btn" onClick={handleCancel}>
          ←
        </button>
        <h2>Create Weighment</h2>
      </div>

      <div className="cw-form">
        <div className="cw-group">
          <label>Weighment No</label>
          <input
            name="weighmentNo"
            value={formData.weighmentNo}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Transaction Category *</label>
          <select
            name="transactionCategory"
            value={formData.transactionCategory}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option>Purchase</option>
            <option>Sales</option>
          </select>
        </div>

        <div className="cw-group">
          <label>Status</label>
          <select name="status" value={formData.status} onChange={handleChange}>
            <option>Open</option>
            <option>Closed</option>
            <option>Draft</option>
          </select>
        </div>

        <div className="cw-group">
          <label>Transaction Type</label>
          <select
            name="transactionType"
            value={formData.transactionType}
            onChange={handleChange}
          >
            <option value="">Select</option>
            <option>Inward</option>
            <option>Outward</option>
          </select>
        </div>

        <div className="cw-group">
          <label>Inward/Outward Note No</label>
          <input
            name="inwardOutwardNoteNo"
            value={formData.inwardOutwardNoteNo}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Vehicle No *</label>
          <input
            name="vehicleNo"
            value={formData.vehicleNo}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Party Name</label>
          <input
            name="partyName"
            value={formData.partyName}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Transporter Name</label>
          <input
            name="transporterName"
            value={formData.transporterName}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Site</label>
          <input name="site" value={formData.site} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Weighment Date</label>
          <input
            type="date"
            name="weighmentDate"
            value={formData.weighmentDate}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Weighment In Date</label>
          <input
            type="date"
            name="weighmentInDate"
            value={formData.weighmentInDate}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Weighment In Time</label>
          <input
            type="time"
            name="weighmentInTime"
            value={formData.weighmentInTime}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Weighment Out Date</label>
          <input
            type="date"
            name="weighmentOutDate"
            value={formData.weighmentOutDate}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Weighment Out Time</label>
          <input
            type="time"
            name="weighmentOutTime"
            value={formData.weighmentOutTime}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Supplier Invoice No</label>
          <input
            name="supplierInvoiceNo"
            value={formData.supplierInvoiceNo}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Supplier Invoice Date</label>
          <input
            type="date"
            name="supplierInvoiceDate"
            value={formData.supplierInvoiceDate}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Bill No</label>
          <input name="billNo" value={formData.billNo} onChange={handleChange} />
        </div>

        <div className="cw-group">
          <label>Bill Date</label>
          <input
            type="date"
            name="billDate"
            value={formData.billDate}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Total Dispatch Weight</label>
          <input
            name="totalDispatchWeight"
            value={formData.totalDispatchWeight}
            onChange={handleChange}
          />
        </div>

        <div className="cw-group">
          <label>Transit Date</label>
          <input
            type="date"
            name="transitDate"
            value={formData.transitDate}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="cw-weight-bar">
        <div className="cw-wbar-group">
          <label className="cw-wbar-label">First Weight (MT)</label>
          <input
            className="cw-wbar-input cw-wt-yellow"
            value={formData.firstWeight}
            readOnly
            placeholder="-"
          />
        </div>

        <div className="cw-wbar-group">
          <label className="cw-wbar-label">Second Weight (MT)</label>
          <input
            className="cw-wbar-input cw-wt-yellow"
            value={formData.secondWeight}
            readOnly
            placeholder="-"
          />
        </div>

        <div className="cw-wbar-group">
          <label className="cw-wbar-label">Net Weight (MT)</label>
          <input
            className="cw-wbar-input cw-net-green"
            value={formData.netWeight}
            readOnly
            placeholder="-"
          />
        </div>

        <div className="cw-wbar-group cw-wbar-getweight">
          <label className="cw-wbar-label">
            Weight (In MT)
            <span className="cw-wbar-hint">{weightHint}</span>
          </label>

          <div className="cw-get-weight-wrap">
            <input
              type="number"
              step="0.001"
              name="currentWeight"
              value={formData.currentWeight}
              onChange={handleChange}
              disabled={weightDisabled}
              placeholder="Enter value"
              className="cw-wb-input"
            />

            <button
              type="button"
              className="cw-get-btn"
              onClick={getWeight}
              disabled={weightDisabled}
            >
              {weightButtonText}
            </button>
          </div>
        </div>
      </div>

      {activeRowIdx !== null && (
        <div className="cw-active-row-hint">
          Row {activeRowIdx + 1} selected - enter weight above and click Get Weight
        </div>
      )}

      <div className="cw-full-width">
        <div className="cw-group">
          <label>Remarks</label>
          <textarea
            rows="3"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="cw-checkbox">
        <input
          type="checkbox"
          name="bulkWeigh"
          checked={formData.bulkWeigh}
          onChange={handleChange}
        />
        <span>Bulk Weigh</span>
      </div>

      <div className="cw-items-section">
        <div className="cw-items-header">
          <span className="cw-items-title">* Items</span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {activeRowIdx !== null && (
              <span className="cw-active-badge">Row {activeRowIdx + 1} active</span>
            )}

            {anyChecked && (
              <button className="cw-del-rows-btn" onClick={handleDeleteChecked}>
                Delete Selected
              </button>
            )}
          </div>
        </div>

        <div className="cw-items-table-wrap">
          <table className="cw-items-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>Del / Active</th>
                <th>First Weight (MT)</th>
                <th>Second Weight (MT)</th>
                <th>Net Weight (MT)</th>
                <th>Remarks</th>
              </tr>
            </thead>

            <tbody>
              {items.map((row, idx) => {
                const isActive = activeRowIdx === idx;
                const hasFirst = !!row.firstWeight;
                const hasSecond = !!row.secondWeight;
                const hasNet = !!row.netWeight;

                return (
                  <tr
                    key={idx}
                    className={`${row._checked ? "cw-row-checked" : ""} ${
                      isActive ? "cw-row-active" : ""
                    }`}
                    onFocus={() => handleRowFocus(idx)}
                  >
                    <td className="cw-sno">{row.sNo}</td>

                    <td className="cw-check-cell">
                      <input
                        type="checkbox"
                        checked={!!row._checked}
                        onChange={(e) => handleItemCheck(idx, e.target.checked)}
                      />
                    </td>

                    <td>
                      <input
                        className={`cw-item-input cw-wt-input cw-item-yellow ${
                          hasFirst ? "cw-wt-filled" : ""
                        }`}
                        value={row.firstWeight}
                        readOnly
                        placeholder="← auto"
                      />
                    </td>

                    <td>
                      <input
                        className={`cw-item-input cw-wt-input cw-item-yellow ${
                          hasSecond ? "cw-wt-filled" : ""
                        }`}
                        value={row.secondWeight}
                        readOnly
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <input
                        className={`cw-item-input cw-net-wt-input cw-item-green ${
                          hasNet ? "cw-net-filled" : ""
                        }`}
                        value={row.netWeight}
                        readOnly
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <input
                        className="cw-item-input cw-remarks-input"
                        value={row.remarks}
                        onChange={(e) =>
                          handleItemChange(idx, "remarks", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="cw-insert-row-bar">
          <span className="cw-insert-label">Rows to add:</span>
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

      <div className="cw-buttons">
        <button
          className="submit-btn"
          onClick={() => handleSubmit(false)}
          disabled={saving}
        >
          {saving ? "Submitting..." : "Submit"}
        </button>

        <button
          className="draft-btn"
          onClick={() => handleSubmit(true)}
          disabled={saving}
        >
          Save as Draft
        </button>

        <button className="cancel-btn" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CreateWeighment;