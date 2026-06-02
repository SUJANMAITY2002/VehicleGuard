import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./SalesSearch.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = "/api/sales";

export const CUSTOMERS = [
  "ABC Industries",
  "XYZ Traders",
  "Global Chemicals",
  "Sunrise Pvt Ltd",
  "Metro Exports",
  "National Corp",
];

export const PAYMENT_TERMS = [
  "Prepaid",
  "Postpaid",
  "Advance 50%",
  "Credit 30 Days",
];

export const SALES_PERSONS = [
  "Rahul Sharma",
  "Priya Mehta",
  "Amit Patel",
  "Sneha Joshi",
  "Vikram Singh",
];

export const ITEM_TYPES = [
  "Tyre",
  "Tube",
  "Flap",
  "Battery",
  "Lubricant",
  "Spare Part",
];

export const SCHEMES = ["Ripur", "For", "Basic"];

// ─── Utility ──────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-IN", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
const SalesSearch = () => {
  const navigate = useNavigate();

  const today    = new Date().toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [filters, setFilters] = useState({
    fromDate:     monthAgo,
    toDate:       today,
    contractNo:   "",
    customer:     "",
    salesPerson:  "",
    itemType:     "",
    scheme:       "",
    paymentTerms: "",
    type:         "",
  });

  const [contracts, setContracts] = useState([]);
  const [searched,  setSearched]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.fromDate)     params.append("fromDate",     filters.fromDate);
      if (filters.toDate)       params.append("toDate",       filters.toDate);
      if (filters.contractNo)   params.append("contractNo",   filters.contractNo);
      if (filters.customer)     params.append("customer",     filters.customer);
      if (filters.salesPerson)  params.append("salesPerson",  filters.salesPerson);
      if (filters.itemType)     params.append("itemType",     filters.itemType);
      if (filters.scheme)       params.append("scheme",       filters.scheme);
      if (filters.paymentTerms) params.append("paymentTerms", filters.paymentTerms);
      if (filters.type)         params.append("type",         filters.type);

      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setContracts(data);
      setSearched(true);
    } catch {
      setError("Could not connect to server. Check that the backend is running.");
      setContracts([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value }));
  };

  const clearField = (field) => setFilters((p) => ({ ...p, [field]: "" }));

  const clearAll = () => {
    setFilters({
      fromDate:     monthAgo,
      toDate:       today,
      contractNo:   "",
      customer:     "",
      salesPerson:  "",
      itemType:     "",
      scheme:       "",
      paymentTerms: "",
      type:         "",
    });
    setContracts([]);
    setSearched(false);
  };

  const handleDelete = async (id, contractNo) => {
    if (!window.confirm(`Delete contract ${contractNo}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchContracts();
    } catch {
      alert("Delete failed.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="ss-page">

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div className="ss-topbar">
        <div className="ss-topbar-left">
          <button className="ss-back-btn" onClick={() => navigate("/manufacturing")}>
            ← Sales Contract
          </button>
        </div>
        <div className="ss-topbar-right">
          <button
            className="ss-create-btn"
            onClick={() => navigate("/sales-contract/create")}
          >
            + Create ▾
          </button>
        </div>
      </div>

      <div className="ss-body">

        {/* ── FILTER CARD ──────────────────────────────────────────────── */}
        <div className="ss-filter-card">

          {/* Row 1 — 4 columns */}
          <div className="ss-filter-row ss-grid-4">

            {/* From Date */}
            <div className="ss-input-wrap">
              <label className="ss-label">
                From Date{filters.fromDate && <span className="ss-dot"> •</span>}
              </label>
              <div className="ss-field-row">
                <input
                  type="date"
                  name="fromDate"
                  className="ss-input"
                  value={filters.fromDate}
                  onChange={handleChange}
                />
                {filters.fromDate && (
                  <button className="ss-x" onClick={() => clearField("fromDate")}>✕</button>
                )}
              </div>
            </div>

            {/* To Date */}
            <div className="ss-input-wrap">
              <label className="ss-label">To Date</label>
              <div className="ss-field-row">
                <input
                  type="date"
                  name="toDate"
                  className="ss-input"
                  value={filters.toDate}
                  onChange={handleChange}
                />
                {filters.toDate && (
                  <button className="ss-x" onClick={() => clearField("toDate")}>✕</button>
                )}
              </div>
            </div>

            {/* Contract No */}
            <div className="ss-input-wrap">
              <label className="ss-label">Contract No.</label>
              <div className="ss-field-row">
                <input
                  type="text"
                  name="contractNo"
                  className="ss-input"
                  placeholder="Search contract no."
                  value={filters.contractNo}
                  onChange={handleChange}
                />
                {filters.contractNo && (
                  <button className="ss-x" onClick={() => clearField("contractNo")}>✕</button>
                )}
              </div>
            </div>

            {/* Party / Customer — free-type with datalist (matches form style) */}
            <div className="ss-input-wrap">
              <label className="ss-label">Party / Customer</label>
              <div className="ss-field-row">
                <input
                  list="ss-customer-list"
                  name="customer"
                  className="ss-input"
                  placeholder="Type or select customer…"
                  value={filters.customer}
                  onChange={handleChange}
                  autoComplete="off"
                />
                <datalist id="ss-customer-list">
                  {CUSTOMERS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {filters.customer && (
                  <button className="ss-x" onClick={() => clearField("customer")}>✕</button>
                )}
              </div>
            </div>

          </div>

          {/* Row 2 — Sales Person, Item Type, Scheme, Type */}
          <div className="ss-filter-row ss-grid-4">

            {/* Sales Person */}
            <div className="ss-input-wrap">
              <label className="ss-label">Sales Person</label>
              <div className="ss-field-row">
                <input
                  list="ss-sales-person-list"
                  name="salesPerson"
                  className="ss-input"
                  placeholder="Type or select…"
                  value={filters.salesPerson}
                  onChange={handleChange}
                  autoComplete="off"
                />
                <datalist id="ss-sales-person-list">
                  {SALES_PERSONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {filters.salesPerson && (
                  <button className="ss-x" onClick={() => clearField("salesPerson")}>✕</button>
                )}
              </div>
            </div>

            {/* Item Type */}
            <div className="ss-input-wrap">
              <label className="ss-label">Item Type</label>
              <div className="ss-field-row">
                <input
                  list="ss-item-type-list"
                  name="itemType"
                  className="ss-input"
                  placeholder="Type or select…"
                  value={filters.itemType}
                  onChange={handleChange}
                  autoComplete="off"
                />
                <datalist id="ss-item-type-list">
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                {filters.itemType && (
                  <button className="ss-x" onClick={() => clearField("itemType")}>✕</button>
                )}
              </div>
            </div>

            {/* Scheme */}
            <div className="ss-input-wrap">
              <label className="ss-label">Scheme</label>
              <div className="ss-field-row">
                <select
                  name="scheme"
                  className="ss-input"
                  value={filters.scheme}
                  onChange={handleChange}
                >
                  <option value="">All Schemes</option>
                  {SCHEMES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {filters.scheme && (
                  <button className="ss-x" onClick={() => clearField("scheme")}>✕</button>
                )}
              </div>
            </div>

            {/* Type */}
            <div className="ss-input-wrap">
              <label className="ss-label">Type</label>
              <div className="ss-field-row">
                <select
                  name="type"
                  className="ss-input"
                  value={filters.type}
                  onChange={handleChange}
                >
                  <option value="">All Types</option>
                  <option value="TE">TE</option>
                  <option value="UT">UT</option>
                </select>
                {filters.type && (
                  <button className="ss-x" onClick={() => clearField("type")}>✕</button>
                )}
              </div>
            </div>

          </div>

          {/* Row 3 — Payment Terms + Actions */}
          <div className="ss-filter-row ss-grid-row2">

            {/* Payment Terms */}
            <div className="ss-input-wrap">
              <label className="ss-label">Payment Terms</label>
              <div className="ss-field-row">
                <select
                  name="paymentTerms"
                  className="ss-input"
                  value={filters.paymentTerms}
                  onChange={handleChange}
                >
                  <option value="">All Terms</option>
                  {PAYMENT_TERMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {filters.paymentTerms && (
                  <button className="ss-x" onClick={() => clearField("paymentTerms")}>✕</button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="ss-filter-actions">
              <button className="ss-btn-clear" onClick={clearAll}>
                Clear All
              </button>
              <button
                className="ss-btn-search"
                onClick={fetchContracts}
                disabled={loading}
              >
                {loading ? "Searching…" : "🔍 Search"}
              </button>
            </div>

          </div>
        </div>

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {error && <div className="ss-error">{error}</div>}

        {/* ── RESULTS TABLE ────────────────────────────────────────────── */}
        <div className="ss-table-card">
          {!searched ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">🔍</div>
              <p className="ss-empty-title">Apply filters to display results</p>
              <p className="ss-empty-sub">Use the filters above and click Search</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="ss-empty">
              <div className="ss-empty-icon">📋</div>
              <p className="ss-empty-title">No records found</p>
              <p className="ss-empty-sub">
                Try adjusting filters or{" "}
                <span
                  className="ss-link"
                  onClick={() => navigate("/sales-contract/create")}
                >
                  create a new contract
                </span>
              </p>
            </div>
          ) : (
            <>
              <div className="ss-count">
                {contracts.length} record{contracts.length !== 1 ? "s" : ""} found
              </div>

              <div className="ss-table-wrap">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Contract No.</th>
                      <th>Date</th>
                      <th>Party</th>
                      <th>Sales Person</th>
                      <th>Item Type</th>
                      <th>Scheme</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Rate (₹)</th>
                      <th>Amount (₹)</th>
                      <th>Pay Terms</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c, i) => (
                      <tr key={c.id}>
                        <td>{i + 1}</td>

                        <td>
                          <button
                            className="ss-contract-link"
                            onClick={() => navigate(`/sales-contract/edit/${c.id}`)}
                            title="Click to view / edit"
                          >
                            {c.contract_no}
                          </button>
                        </td>

                        <td>{fmtDate(c.contract_date)}</td>
                        <td>{c.customer     || "-"}</td>
                        <td>{c.sales_person || "-"}</td>
                        <td>{c.item_type    || "-"}</td>
                        <td>
                          {c.scheme ? (
                            <span className={`ss-scheme-badge ss-scheme-${c.scheme.toLowerCase()}`}>
                              {c.scheme}
                            </span>
                          ) : "-"}
                        </td>
                        <td>
                          <span className={`ss-type-badge ss-type-${(c.type || "").toLowerCase()}`}>
                            {c.type || "-"}
                          </span>
                        </td>
                        <td>{c.qty  ? Number(c.qty).toLocaleString("en-IN")  : "-"}</td>
                        <td>{c.rate ? Number(c.rate).toLocaleString("en-IN") : "-"}</td>
                        <td>
                          {c.qty && c.rate
                            ? "₹" + (Number(c.qty) * Number(c.rate)).toLocaleString("en-IN")
                            : "-"}
                        </td>
                        <td>{c.pay_terms || "-"}</td>
                        <td>{fmtDate(c.due_date)}</td>
                        <td className="ss-actions-cell">
                          <button
                            className="ss-action-btn ss-edit"
                            onClick={() => navigate(`/sales-contract/edit/${c.id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className="ss-action-btn ss-delete"
                            onClick={() => handleDelete(c.id, c.contract_no)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default SalesSearch;