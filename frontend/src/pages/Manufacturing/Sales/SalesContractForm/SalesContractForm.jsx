import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./SalesContractForm.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = "/api/sales";

const CUSTOMERS = [
  "ABC Industries",
  "XYZ Traders",
  "Global Chemicals",
  "Sunrise Pvt Ltd",
  "Metro Exports",
  "National Corp",
];

const PAYMENT_TERMS = [
  "Prepaid",
  "Postpaid",
  "Advance 50%",
  "Credit 30 Days",
];

const SALES_PERSONS = [
  "Rahul Sharma",
  "Priya Mehta",
  "Amit Patel",
  "Sneha Joshi",
  "Vikram Singh",
];

const ITEM_TYPES = [
  "Tyre",
  "Tube",
  "Flap",
  "Battery",
  "Lubricant",
  "Spare Part",
];

const SCHEMES = ["Ripur", "For", "Basic"];

// ─── Component ────────────────────────────────────────────────────────────────
const SalesContractForm = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    contract_no:   "",
    contract_date: today,
    customer:      "",
    sales_person:  "",
    item_type:     "",
    scheme:        "",
    qty:           "",
    type:          "",
    pay_terms:     "",
    due_days:      "",
    due_date:      "",
    rate:          "",
    remarks:       "",
  });

  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (isEdit) {
          const res  = await fetch(`${API_BASE}/${id}`);
          if (!res.ok) throw new Error("Record not found");
          const data = await res.json();
          setForm({
            contract_no:   data.contract_no   || "",
            contract_date: data.contract_date ? data.contract_date.split("T")[0] : today,
            customer:      data.customer      || "",
            sales_person:  data.sales_person  || "",
            item_type:     data.item_type     || "",
            scheme:        data.scheme        || "",
            qty:           data.qty           ?? "",
            type:          data.type          || "",
            pay_terms:     data.pay_terms     || "",
            due_days:      data.due_days      ?? "",
            due_date:      data.due_date ? data.due_date.split("T")[0] : "",
            rate:          data.rate          ?? "",
            remarks:       data.remarks       || "",
          });
        } else {
          const res  = await fetch(`${API_BASE}/next-contract-no`);
          if (!res.ok) throw new Error("Could not fetch contract number");
          const data = await res.json();
          setForm((p) => ({ ...p, contract_no: data.contract_no }));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  // ── Auto-calculate due date ───────────────────────────────────────────────
  useEffect(() => {
    if (form.contract_date && form.due_days !== "") {
      const d = new Date(form.contract_date);
      d.setDate(d.getDate() + Number(form.due_days));
      setForm((p) => ({ ...p, due_date: d.toISOString().split("T")[0] }));
    } else if (form.due_days === "") {
      setForm((p) => ({ ...p, due_date: "" }));
    }
  }, [form.contract_date, form.due_days]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.customer)      { setError("Please select a Party / Customer."); return; }
    if (!form.qty)           { setError("Qty is required.");                  return; }
    if (!form.type)          { setError("Please select a Type (TE or UT)."); return; }
    if (!form.pay_terms)     { setError("Please select Payment Terms.");      return; }
    if (!form.rate)          { setError("Rate is required.");                 return; }
    if (!form.contract_date) { setError("Date is required.");                 return; }

    setSaving(true);
    try {
      const url    = isEdit ? `${API_BASE}/${id}` : API_BASE;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...form,
        qty:      Number(form.qty),
        rate:     Number(form.rate),
        due_days: form.due_days !== "" ? Number(form.due_days) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed");
      }

      setSuccess(isEdit ? "Contract updated successfully!" : "Contract saved successfully!");
      setTimeout(() => navigate("/sales-search"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const amount =
    form.qty && form.rate
      ? (Number(form.qty) * Number(form.rate)).toLocaleString("en-IN")
      : "";

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="scf-page">
        <div className="scf-topbar">
          <div className="scf-topbar-left">
            <button className="scf-back-btn" onClick={() => navigate("/sales-search")}>
              ← {isEdit ? "Edit Contract" : "Create Contract"}
            </button>
          </div>
        </div>
        <div className="scf-body">
          <div className="scf-card scf-loading">
            <div className="scf-spinner" />
            <p>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scf-page">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="scf-topbar">
        <div className="scf-topbar-left">
          <button className="scf-back-btn" onClick={() => navigate("/sales-search")}>
            ← {isEdit ? "Edit Contract" : "Create Contract"}
          </button>
        </div>
        <div className="scf-topbar-right">
          <span className="scf-contract-no">#{form.contract_no}</span>
        </div>
      </div>

      {/* ── FORM CARD ───────────────────────────────────────────────────── */}
      <div className="scf-body">
        <div className="scf-card">

          {error   && <div className="scf-alert scf-alert-err">{error}</div>}
          {success && <div className="scf-alert scf-alert-ok">{success}</div>}

          <form onSubmit={handleSubmit} noValidate>

            {/* ── SECTION: Contract Info ── */}
            <div className="scf-section-title">Contract Details</div>
            <div className="scf-grid">

              {/* Contract No */}
              <div className="scf-group">
                <label className="scf-label">Contract No.</label>
                <input
                  className="scf-input scf-readonly"
                  type="text"
                  value={form.contract_no}
                  readOnly
                />
              </div>

              {/* Date */}
              <div className="scf-group">
                <label className="scf-label">
                  Date <span className="scf-req">*</span>
                </label>
                <input
                  className="scf-input"
                  type="date"
                  name="contract_date"
                  value={form.contract_date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Party / Customer — free-type with datalist */}
              <div className="scf-group">
                <label className="scf-label">
                  Party / Customer <span className="scf-req">*</span>
                </label>
                <input
                  list="customer-list"
                  className="scf-input"
                  name="customer"
                  value={form.customer}
                  onChange={handleChange}
                  placeholder="Type or select customer…"
                  autoComplete="off"
                />
                <datalist id="customer-list">
                  {CUSTOMERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Sales Person — free-type with datalist */}
              <div className="scf-group">
                <label className="scf-label">Sales Person</label>
                <input
                  list="sales-person-list"
                  className="scf-input"
                  name="sales_person"
                  value={form.sales_person}
                  onChange={handleChange}
                  placeholder="Type or select sales person…"
                  autoComplete="off"
                />
                <datalist id="sales-person-list">
                  {SALES_PERSONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Item Type — free-type with datalist */}
              <div className="scf-group">
                <label className="scf-label">Item Type</label>
                <input
                  list="item-type-list"
                  className="scf-input"
                  name="item_type"
                  value={form.item_type}
                  onChange={handleChange}
                  placeholder="Type or select item type…"
                  autoComplete="off"
                />
                <datalist id="item-type-list">
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>

              {/* Scheme */}
              <div className="scf-group">
                <label className="scf-label">Scheme</label>
                <select
                  className="scf-input"
                  name="scheme"
                  value={form.scheme}
                  onChange={handleChange}
                >
                  <option value="">— Select Scheme —</option>
                  {SCHEMES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div className="scf-group">
                <label className="scf-label">
                  Transaction Type <span className="scf-req">*</span>
                </label>
                <select
                  className="scf-input"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                >
                  <option value="">— Select Type —</option>
                  <option value="TE">TE</option>
                  <option value="UT">UT</option>
                </select>
              </div>

            </div>

            {/* ── SECTION: Quantity & Rate ── */}
            <div className="scf-section-title">Quantity & Pricing</div>
            <div className="scf-grid">

              <div className="scf-group">
                <label className="scf-label">
                  Qty <span className="scf-req">*</span>
                </label>
                <input
                  className="scf-input"
                  type="number"
                  name="qty"
                  min="0"
                  placeholder="Enter quantity"
                  value={form.qty}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="scf-group">
                <label className="scf-label">
                  Rate (₹) <span className="scf-req">*</span>
                </label>
                <input
                  className="scf-input"
                  type="number"
                  name="rate"
                  min="0"
                  step="0.01"
                  placeholder="Enter rate"
                  value={form.rate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="scf-group">
                <label className="scf-label">Amount (₹)</label>
                <input
                  className="scf-input scf-readonly"
                  type="text"
                  value={amount ? "₹ " + amount : ""}
                  placeholder="Auto-calculated"
                  readOnly
                />
              </div>

            </div>

            {/* ── SECTION: Payment ── */}
            <div className="scf-section-title">Payment Terms</div>
            <div className="scf-grid">

              <div className="scf-group">
                <label className="scf-label">
                  Pay Terms <span className="scf-req">*</span>
                </label>
                <select
                  className="scf-input"
                  name="pay_terms"
                  value={form.pay_terms}
                  onChange={handleChange}
                  required
                >
                  <option value="">— Select Terms —</option>
                  {PAYMENT_TERMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="scf-group">
                <label className="scf-label">Due Days</label>
                <input
                  className="scf-input"
                  type="number"
                  name="due_days"
                  min="0"
                  placeholder="e.g. 30"
                  value={form.due_days}
                  onChange={handleChange}
                />
              </div>

              <div className="scf-group">
                <label className="scf-label">Due Date</label>
                <input
                  className="scf-input scf-readonly"
                  type="date"
                  value={form.due_date}
                  readOnly
                  placeholder="Auto from due days"
                />
              </div>

            </div>

            {/* ── SECTION: Remarks ── */}
            <div className="scf-section-title">Additional Info</div>
            <div className="scf-group scf-full">
              <label className="scf-label">Remarks</label>
              <textarea
                className="scf-input scf-textarea"
                name="remarks"
                rows="3"
                placeholder="Optional remarks…"
                value={form.remarks}
                onChange={handleChange}
              />
            </div>

            {/* ── BUTTONS ─────────────────────────────────────────────────── */}
            <div className="scf-btn-row">
              <button
                type="button"
                className="scf-btn scf-btn-cancel"
                onClick={() => navigate("/sales-search")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="scf-btn scf-btn-save"
                disabled={saving}
              >
                {saving
                  ? (isEdit ? "Updating…" : "Saving…")
                  : (isEdit ? "✔ Update Contract" : "✔ Save Contract")}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SalesContractForm;