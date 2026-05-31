import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./WeighmentDetail.css";
import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";

const WEIGHMENT_API = "http://localhost:5000/api/weighment";

const blankItem = (sNo) => ({
  sNo,
  firstWeight: "",
  secondWeight: "",
  netWeight: "",
  remarks: "",
});

const WeighmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [insertCount, setInsertCount] = useState(5);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${WEIGHMENT_API}/${id}`);
        const data = res.data?.data || res.data;

        if (!data) {
          alert("Record not found");
          navigate(-1);
          return;
        }

        setForm({
          ...data,
          currentWeight: "",
        });

        const savedItems =
          Array.isArray(data.items) && data.items.length > 0
            ? data.items.map((it, i) => ({
                sNo: it.sNo || i + 1,
                firstWeight: it.firstWeight || "",
                secondWeight: it.secondWeight || "",
                netWeight: it.netWeight || "",
                remarks: it.remarks || "",
                _checked: false,
              }))
            : Array.from({ length: 4 }, (_, i) => blankItem(i + 1));

        setItems(savedItems);
      } catch (err) {
        console.error(err);
        alert("Failed to load weighment record");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const getWeight = () => {
    const weight = parseFloat(form.currentWeight);

    if (!weight) {
      alert("Enter Weight");
      return;
    }

    if (!form.firstWeight) {
      setForm((prev) => ({
        ...prev,
        firstWeight: String(weight),
        currentWeight: "",
      }));
      return;
    }

    if (!form.secondWeight) {
      const first = parseFloat(form.firstWeight);

      setForm((prev) => ({
        ...prev,
        secondWeight: String(weight),
        netWeight: String(Math.abs(first - weight)),
        currentWeight: "",
      }));
      return;
    }

    alert("First and Second Weight already recorded");
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

  const handleRowFocus = (rowIdx) => {
    setItems((prev) => {
      const next = [...prev];

      if (rowIdx === 0) {
        const upperWeight = form.secondWeight || form.firstWeight;

        if (upperWeight && !next[0].firstWeight) {
          next[0] = {
            ...next[0],
            firstWeight: upperWeight,
          };
        }

        return next;
      }

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

  const getItemWeight = (rowIdx) => {
    const value = parseFloat(form.currentWeight);

    if (!value) {
      alert("Enter Weight");
      return;
    }

    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[rowIdx] };

      if (!row.firstWeight) {
        if (rowIdx === 0) {
          row.firstWeight = form.secondWeight || form.firstWeight || "";
        } else if (next[rowIdx - 1]?.secondWeight) {
          row.firstWeight = next[rowIdx - 1].secondWeight;
        }
      }

      row.secondWeight = String(value);

      const first = parseFloat(row.firstWeight || 0);
      row.netWeight = String(Math.abs(first - value));

      next[rowIdx] = row;
      return next;
    });

    setForm((prev) => ({
      ...prev,
      currentWeight: "",
    }));
  };

  const handleItemCheck = (rowIdx, checked) => {
    setItems((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        _checked: checked,
      };
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

  const anyChecked = items.some((r) => r._checked);

  const handleSave = async (asDraft = false) => {
    if (!form.vehicleNo?.trim()) {
      alert("Vehicle Number is required");
      return;
    }

    setSaving(true);

    try {
      const { currentWeight, ...mainForm } = form;

      const cleanItems = items
        .filter((r) => {
          const { sNo, _checked, ...rest } = r;
          return Object.values(rest).some((v) => v !== "");
        })
        .map(({ _checked, ...r }) => r);

      const payload = {
        ...mainForm,
        status: asDraft ? "Draft" : mainForm.status,
        items: cleanItems,
      };

      const res = await axios.put(`${WEIGHMENT_API}/${id}`, payload);

      if (res.data.success) {
        alert(asDraft ? "Saved as Draft" : "Weighment Updated Successfully");
        navigate("/weighment-search");
      } else {
        alert(res.data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="wd-page">
        <ModuleNavbar />
        <div className="wd-loading">Loading weighment record...</div>
      </div>
    );
  }

  if (!form) return null;

  const typeClass = (form.transactionType || "").toLowerCase();

  const weightButtonText = !form.firstWeight
    ? "Get Weight (→ 1st)"
    : !form.secondWeight
    ? "Get Weight (→ 2nd)"
    : "Completed";

  const weightHint = !form.firstWeight
    ? " - will set First Weight"
    : !form.secondWeight
    ? " - will set Second Weight"
    : " - completed";

  return (
    <div className="wd-page">
      <ModuleNavbar />

      <div className="wd-page-header">
        <button className="wd-back-btn" onClick={() => navigate(-1)}>
          ←
        </button>

        <div className="wd-header-info">
          <h2>Weighment Detail</h2>
          <span className="wd-weighment-no">{form.weighmentNo || "-"}</span>
        </div>

        <div className="wd-header-badges">
          <span className={`wd-type-badge ${typeClass}`}>
            {form.transactionType || "-"}
          </span>
          <span className={`wd-status-badge ${(form.status || "").toLowerCase()}`}>
            {form.status || "Open"}
          </span>
        </div>
      </div>

      <div className="wd-card">
        <div className="wd-section-title">GIN / Note Reference</div>

        <div className="wd-ref-grid">
          <div className="wd-ref-field">
            <span className="wd-ref-label">GIN / Note No</span>
            <span className="wd-ref-value wd-ref-highlight">
              {form.inwardOutwardNoteNo || "-"}
            </span>
          </div>

          <div className="wd-ref-field">
            <span className="wd-ref-label">Vendor Code</span>
            <span className="wd-ref-value">{form.vendorCode || "-"}</span>
          </div>

          <div className="wd-ref-field">
            <span className="wd-ref-label">Vendor Name</span>
            <span className="wd-ref-value">{form.vendorName || "-"}</span>
          </div>

          <div className="wd-ref-field">
            <span className="wd-ref-label">PO/CPO No</span>
            <span className="wd-ref-value">{form.poCpoNo || "-"}</span>
          </div>

          <div className="wd-ref-field">
            <span className="wd-ref-label">Manufacturer Name</span>
            <span className="wd-ref-value">{form.manufacturerName || "-"}</span>
          </div>

          <div className="wd-ref-field">
            <span className="wd-ref-label">Challan Date</span>
            <span className="wd-ref-value">{form.challanDate || "-"}</span>
          </div>

          <div className="wd-ref-field">
            <span className="wd-ref-label">E-Way Date</span>
            <span className="wd-ref-value">{form.ewayDate || "-"}</span>
          </div>
        </div>
      </div>

      <div className="wd-card">
        <div className="wd-section-title">Weighment Information</div>

        <div className="wd-form-grid">
          <div className="wd-field">
            <label>Weighment No</label>
            <input
              name="weighmentNo"
              value={form.weighmentNo || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Transaction Category *</label>
            <select
              name="transactionCategory"
              value={form.transactionCategory || ""}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option>Purchase</option>
              <option>Sales</option>
            </select>
          </div>

          <div className="wd-field">
            <label>Status</label>
            <select
              name="status"
              value={form.status || "Open"}
              onChange={handleChange}
            >
              <option>Open</option>
              <option>Closed</option>
              <option>Draft</option>
            </select>
          </div>

          <div className="wd-field">
            <label>Transaction Type</label>
            <input value={form.transactionType || ""} readOnly className="wd-readonly" />
          </div>

          <div className="wd-field">
            <label>Inward/Outward Note No</label>
            <input
              name="inwardOutwardNoteNo"
              value={form.inwardOutwardNoteNo || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Vehicle No *</label>
            <input
              name="vehicleNo"
              value={form.vehicleNo || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Party Name</label>
            <input
              name="partyName"
              value={form.partyName || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Transporter Name</label>
            <input
              name="transporterName"
              value={form.transporterName || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Site</label>
            <input name="site" value={form.site || ""} onChange={handleChange} />
          </div>

          <div className="wd-field">
            <label>Weighment Date</label>
            <input
              type="date"
              name="weighmentDate"
              value={form.weighmentDate || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Weighment In Date</label>
            <input
              type="date"
              name="weighmentInDate"
              value={form.weighmentInDate || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Weighment In Time</label>
            <input
              type="time"
              name="weighmentInTime"
              value={form.weighmentInTime || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Weighment Out Date</label>
            <input
              type="date"
              name="weighmentOutDate"
              value={form.weighmentOutDate || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Weighment Out Time</label>
            <input
              type="time"
              name="weighmentOutTime"
              value={form.weighmentOutTime || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Supplier Invoice No</label>
            <input
              name="supplierInvoiceNo"
              value={form.supplierInvoiceNo || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Supplier Invoice Date</label>
            <input
              type="date"
              name="supplierInvoiceDate"
              value={form.supplierInvoiceDate || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Bill No</label>
            <input name="billNo" value={form.billNo || ""} onChange={handleChange} />
          </div>

          <div className="wd-field">
            <label>Bill Date</label>
            <input
              type="date"
              name="billDate"
              value={form.billDate || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Total Dispatch Weight</label>
            <input
              name="totalDispatchWeight"
              value={form.totalDispatchWeight || ""}
              onChange={handleChange}
            />
          </div>

          <div className="wd-field">
            <label>Transit Date</label>
            <input
              type="date"
              name="transitDate"
              value={form.transitDate || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="wd-weight-strip wd-weight-strip-single-line">
          <div className="wd-weight-box">
            <label>First Weight (MT)</label>
            <input
              value={form.firstWeight || ""}
              readOnly
              className="wd-weight-yellow"
              placeholder="-"
            />
          </div>

          <div className="wd-weight-box">
            <label>Second Weight (MT)</label>
            <input
              value={form.secondWeight || ""}
              readOnly
              className="wd-weight-yellow"
              placeholder="-"
            />
          </div>

          <div className="wd-weight-box">
            <label>Net Weight (MT)</label>
            <input
              value={form.netWeight || ""}
              readOnly
              className="wd-weight-green"
              placeholder="-"
            />
          </div>

          <div className="wd-weight-box wd-weight-input-box wd-weight-get-box">
            <label>
              Weight (In MT)
              <span>{weightHint}</span>
            </label>

            <div className="wd-weight-action">
              <input
                type="number"
                step="0.001"
                name="currentWeight"
                value={form.currentWeight || ""}
                onChange={handleChange}
                placeholder="Enter value"
                disabled={!!form.firstWeight && !!form.secondWeight}
              />

              <button
                type="button"
                onClick={getWeight}
                disabled={!!form.firstWeight && !!form.secondWeight}
              >
                {weightButtonText}
              </button>
            </div>
          </div>
        </div>

        <div className="wd-textarea-row">
          <div className="wd-field">
            <label>Remarks</label>
            <textarea
              rows="3"
              name="remarks"
              value={form.remarks || ""}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="wd-checkbox-row">
          <label className="wd-checkbox-label">
            <input
              type="checkbox"
              name="bulkWeigh"
              checked={!!form.bulkWeigh}
              onChange={handleChange}
            />
            Bulk Weigh
          </label>
        </div>
      </div>

      <div className="wd-card">
        <div className="wd-items-section">
          <div className="wd-items-header">
            <span className="wd-items-title">* Items</span>
            {anyChecked && (
              <button className="wd-del-rows-btn" onClick={handleDeleteChecked}>
                Delete Selected
              </button>
            )}
          </div>

          <div className="wd-items-table-wrap">
            <table className="wd-items-table">
              <thead>
                <tr>
                  <th>S No</th>
                  <th>Del</th>
                  <th>First Weight (MT)</th>
                  <th>Second Weight (MT)</th>
                  <th>Net Weight (MT)</th>
                  <th>Get Weight</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {items.map((row, idx) => (
                  <tr
                    key={idx}
                    className={row._checked ? "wd-row-checked" : ""}
                    onFocus={() => handleRowFocus(idx)}
                  >
                    <td className="wd-sno">{row.sNo}</td>

                    <td className="wd-check-cell">
                      <input
                        type="checkbox"
                        checked={!!row._checked}
                        onChange={(e) => handleItemCheck(idx, e.target.checked)}
                      />
                    </td>

                    <td>
                      <input
                        className="wd-item-input wd-wt-input wd-item-yellow"
                        value={row.firstWeight}
                        readOnly
                        placeholder="← auto"
                      />
                    </td>

                    <td>
                      <input
                        className="wd-item-input wd-wt-input wd-item-yellow"
                        value={row.secondWeight}
                        readOnly
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <input
                        className="wd-item-input wd-net-input wd-item-green"
                        value={row.netWeight}
                        readOnly
                        placeholder="-"
                      />
                    </td>

                    <td>
                      <button
                        type="button"
                        className="wd-item-get-btn"
                        onClick={() => getItemWeight(idx)}
                      >
                        Get Wt
                      </button>
                    </td>

                    <td>
                      <input
                        className="wd-item-input wd-rem-input"
                        value={row.remarks}
                        onChange={(e) =>
                          handleItemChange(idx, "remarks", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="wd-insert-bar">
            <input
              type="number"
              min="1"
              max="50"
              className="wd-insert-count"
              value={insertCount}
              onChange={(e) => setInsertCount(e.target.value)}
            />
            <button className="wd-insert-btn" onClick={handleInsertRows}>
              Insert Row
            </button>
          </div>
        </div>
      </div>

      <div className="wd-actions">
        <button className="wd-cancel-btn" onClick={() => navigate(-1)} disabled={saving}>
          Cancel
        </button>
        <button className="wd-draft-btn" onClick={() => handleSave(true)} disabled={saving}>
          Save as Draft
        </button>
        <button className="wd-save-btn" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? "Saving..." : "Save & Update"}
        </button>
      </div>
    </div>
  );
};

export default WeighmentDetail;