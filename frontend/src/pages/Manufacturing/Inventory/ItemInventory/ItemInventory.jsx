import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ItemInventory.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

/* ── API endpoints ── */
const DGRN_API     = `${API_URL}/api/direct-grn`;
const ITEMS_API    = `${API_URL}/api/items`;
const CAT_API      = `${API_URL}/api/item-categories`;
const GROUP_API    = `${API_URL}/api/item-group`;

/* ── Item type options (matches master) ── */
const ITEM_TYPE_OPTIONS = [
  "Raw Material",
  "Semi Finished",
  "Finished Goods",
  "Consumables",
  "Packing Material",
  "Scrap",
  "Service",
];

/* ── UOM conversion table: baseUOM → { actualUOM, factor }
   factor = how many base units make 1 actual unit
   e.g. 1 MT = 1000 KG  →  KG is base, factor=1000
   Add more rows as needed for your business. ── */
const UOM_CONVERSION = {
  KG:   { actualUOM: "MT",  factor: 1000 },
  MT:   { actualUOM: "MT",  factor: 1    },
  PCS:  { actualUOM: "PCS", factor: 1    },
  BAG:  { actualUOM: "MT",  factor: 50   },   // 50 KG bags → MT
  NOS:  { actualUOM: "NOS", factor: 1    },
  LTR:  { actualUOM: "KL",  factor: 1000 },
  GM:   { actualUOM: "KG",  factor: 1000 },
};

const toActual = (qty, uom) => {
  const conv = UOM_CONVERSION[uom?.toUpperCase?.()];
  if (!conv || conv.factor === 1) return { actualUOM: uom || "-", actualQty: qty };
  return { actualUOM: conv.actualUOM, actualQty: qty / conv.factor };
};

/* ── Number formatters ── */
const fmtQty = (n, d = 3) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt2 = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Blank filters ── */
const BLANK = {
  fromDate:   "",
  toDate:     "",
  itemTypes:  "",
  category:   "",
  itemGroup:  "",
  itemName:   "",
};

/* ════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
const ItemInventory = () => {
  const navigate = useNavigate();

  /* ── filter state ── */
  const [filters,  setFilters]  = useState(BLANK);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);

  /* ── master data ── */
  const [allItems,      setAllItems]      = useState([]);   // item master
  const [allCategories, setAllCategories] = useState([]);   // item-category master
  const [allGroups,     setAllGroups]     = useState([]);   // item-group master

  /* ── results ── */
  const [rows,         setRows]         = useState([]);
  const [selectedRow,  setSelectedRow]  = useState(null);  // for transaction detail panel

  /* ════════════════════ LOAD MASTERS ════════════════════ */
  useEffect(() => {
    axios.get(ITEMS_API).then((r) => setAllItems(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    axios.get(CAT_API).then((r)   => setAllCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    axios.get(GROUP_API).then((r) => setAllGroups(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  /* ════════════════════ CASCADED OPTIONS ════════════════════
     Category options: filtered by selected itemTypes
     Group options:    filtered by selected category
     Item options:     filtered by selected group (or category or type)
  ════════════════════════════════════════════════════════════ */
  /* case-insensitive string compare helper */
  const ciEq = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

  const categoryOptions = allCategories.filter((c) =>
    !filters.itemTypes || ciEq(c.itemTypes, filters.itemTypes)
  );

  const groupOptions = allGroups.filter((g) => {
    if (filters.category) return ciEq(g.itemTypes, filters.category);
    if (filters.itemTypes) {
      const matchingCats = allCategories
        .filter((c) => ciEq(c.itemTypes, filters.itemTypes))
        .map((c) => (c.categoryName || "").trim().toLowerCase());
      return matchingCats.includes((g.itemTypes || "").trim().toLowerCase());
    }
    return true;
  });

  const itemOptions = allItems.filter((item) => {
    if (filters.itemTypes && !ciEq(item.itemTypes, filters.itemTypes)) return false;
    if (filters.category  && !ciEq(item.category,  filters.category))  return false;
    if (filters.itemGroup && !ciEq(item.itemGroup,  filters.itemGroup)) return false;
    return true;
  });

  /* ════════════════════ FILTER CHANGE ════════════════════ */
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Cascade reset: changing itemTypes resets downstream
    if (name === "itemTypes") {
      setFilters((p) => ({ ...p, itemTypes: value, category: "", itemGroup: "", itemName: "" }));
    } else if (name === "category") {
      setFilters((p) => ({ ...p, category: value, itemGroup: "", itemName: "" }));
    } else if (name === "itemGroup") {
      setFilters((p) => ({ ...p, itemGroup: value, itemName: "" }));
    } else {
      setFilters((p) => ({ ...p, [name]: value }));
    }
  };

  const handleReset = () => {
    setFilters(BLANK);
    setRows([]);
    setSelectedRow(null);
    setSearched(false);
  };

  /* ════════════════════ SEARCH ════════════════════
     1. Fetch Direct GRN records (with optional date range)
     2. Expand GRN items into per-item aggregates
     3. Enrich each row with item master data (UOM, type, category, group)
     4. Apply client-side filters for type / category / group / itemName
  ════════════════════════════════════════════════ */
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    setSelectedRow(null);

    try {
      /* ── 1. Fetch Direct GRN ── */
      const params = new URLSearchParams();
      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate)   params.append("toDate",   filters.toDate);

      const res  = await axios.get(`${DGRN_API}?${params.toString()}`);
      const grns = Array.isArray(res.data) ? res.data : (res.data?.data || []);

      /* ── 2. Aggregate per item ── */
      const map = {};

      grns.forEach((grn) => {
        (grn.items || []).forEach((lineItem) => {
          const code = (lineItem.itemCode || lineItem.itemName || "").trim();
          if (!code) return;

          if (!map[code]) {
            map[code] = {
              itemCode:     code,
              itemName:     lineItem.itemName || code,
              uom:          lineItem.uom      || "",
              totalQty:     0,
              totalAmount:  0,
              transactions: [],
            };
          }

          const qty    = Number(lineItem.qty    || 0);
          const amount = Number(lineItem.totalAmount || 0);

          map[code].totalQty    += qty;
          map[code].totalAmount += amount;
          map[code].transactions.push({
            grnNo:     grn.grnNo      || "-",
            grnDate:   grn.grnDate    || "-",
            partyName: grn.partyName  || grn.vendorName || "-",
            vehicleNo: grn.vehicleNo  || "-",
            invoiceNo: grn.challanInvoiceNo || "-",
            status:    grn.status     || "-",
            qty,
            rate:      Number(lineItem.rate  || 0),
            amount,
            uom:       lineItem.uom  || "",
          });
        });
      });

      /* ── 3. Enrich with item master ── */
      let enriched = Object.values(map).map((row) => {
        const master = allItems.find(
          (m) => m.itemCode === row.itemCode || m.itemName === row.itemName
        );
        return {
          ...row,
          uom:       master?.uom       || row.uom  || "-",
          itemTypes: master?.itemTypes || "",
          category:  master?.category  || "",
          itemGroup: master?.itemGroup || "",
        };
      });

      /* ── 4. Client-side filter (case-insensitive) ── */
      const ci = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
      if (filters.itemTypes) enriched = enriched.filter((r) => ci(r.itemTypes, filters.itemTypes));
      if (filters.category)  enriched = enriched.filter((r) => ci(r.category,  filters.category));
      if (filters.itemGroup) enriched = enriched.filter((r) => ci(r.itemGroup, filters.itemGroup));
      if (filters.itemName)  enriched = enriched.filter((r) =>
        r.itemName.toLowerCase().includes(filters.itemName.toLowerCase()) ||
        r.itemCode.toLowerCase().includes(filters.itemName.toLowerCase())
      );

      setRows(enriched);
    } catch (err) {
      console.error(err);
      alert("Failed to load inventory data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filters, allItems]);

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="inv-page">
      <ModuleNavbar />

      {/* ══════════ TOP BAR (mirrors DirectGRN) ══════════ */}
      <div className="inv-topbar">
        <div className="inv-topbar-left">
          <button className="inv-back-btn" onClick={() => navigate(-1)}>← Back</button>
          <div>
            <h1>Item Inventory</h1>
            <span className="inv-topbar-sub">
              {searched && !loading
                ? `${rows.length} item${rows.length !== 1 ? "s" : ""} found from GRN records`
                : "Search by filters to view GRN-based stock"}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="inv-content">

        {/* ── SEARCH FILTER CARD ── */}
        <div className="inv-card">
          <div className="inv-filter-title">🔍 Search Filters</div>

          <div className="inv-filter-grid">

            {/* FROM DATE */}
            <div className="inv-fg">
              <label>From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleChange}
              />
            </div>

            {/* TO DATE */}
            <div className="inv-fg">
              <label>To Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleChange}
              />
            </div>

            {/* ITEM TYPE */}
            <div className="inv-fg">
              <label>Item Type</label>
              <select name="itemTypes" value={filters.itemTypes} onChange={handleChange}>
                <option value="">— All Types —</option>
                {ITEM_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* ITEM CATEGORY (cascaded from type) */}
            <div className="inv-fg">
              <label>Item Category</label>
              <select name="category" value={filters.category} onChange={handleChange}>
                <option value="">— All Categories —</option>
                {categoryOptions.map((c) => (
                  <option key={c._id} value={c.categoryName}>{c.categoryName}</option>
                ))}
              </select>
            </div>

            {/* ITEM GROUP (cascaded from category) */}
            <div className="inv-fg">
              <label>Item Group</label>
              <select name="itemGroup" value={filters.itemGroup} onChange={handleChange}>
                <option value="">— All Groups —</option>
                {groupOptions.map((g) => (
                  <option key={g._id} value={g.itemGroup}>{g.itemGroup}</option>
                ))}
              </select>
            </div>

            {/* ITEM NAME (cascaded from group) */}
            <div className="inv-fg">
              <label>Item Name</label>
              <select name="itemName" value={filters.itemName} onChange={handleChange}>
                <option value="">— All Items —</option>
                {itemOptions.map((it) => (
                  <option key={it._id} value={it.itemName}>
                    {it.itemCode} — {it.itemName}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="inv-filter-actions">
            <button className="inv-reset-btn" onClick={handleReset}>Reset</button>
            <button
              className="inv-apply-btn"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        {/* ── RESULTS AREA ── */}

        {/* Not yet searched */}
        {!searched && !loading && (
          <div className="inv-empty-state">
            <div className="inv-empty-icon">📦</div>
            <div className="inv-empty-title">Item Inventory</div>
            <div className="inv-empty-sub">
              Select filters above and click <strong>Search</strong> to view GRN-based stock levels.
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="inv-empty-state">
            <div className="inv-spinner" />
            <div className="inv-empty-sub">Fetching GRN records…</div>
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <>
            {rows.length === 0 ? (
              <div className="inv-empty-state">
                <div className="inv-empty-icon">🔍</div>
                <div className="inv-empty-title">No Records Found</div>
                <div className="inv-empty-sub">
                  No GRN entries match the selected filters. Try adjusting your search criteria.
                </div>
              </div>
            ) : (
              <>
                {/* ── STOCK TABLE CARD ── */}
                <div className="inv-card" style={{ padding: 0 }}>
                  <div className="inv-table-header">
                    <span className="inv-table-title">📋 GRN Stock Summary</span>
                    <span className="inv-table-count">
                      {rows.length} item{rows.length !== 1 ? "s" : ""} ·{" "}
                      {selectedRow ? "click another row to switch" : "click a row to view GRN transactions"}
                    </span>
                  </div>

                  <div className="inv-table-wrap">
                    <table className="inv-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item Code</th>
                          <th>Item Name</th>
                          <th>B UOM</th>
                          <th className="inv-num">Qty</th>
                          <th>Aut UOM</th>
                          <th className="inv-num">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => {
                          const { actualUOM, actualQty } = toActual(row.totalQty, row.uom);
                          const isSelected = selectedRow?.itemCode === row.itemCode;
                          return (
                            <React.Fragment key={row.itemCode}>
                              <tr
                                className={`inv-row${isSelected ? " inv-row--selected" : ""}`}
                                onClick={() =>
                                  setSelectedRow(isSelected ? null : row)
                                }
                              >
                              <td className="inv-sno">{idx + 1}</td>
                              <td>
                                <span className="inv-code-chip">{row.itemCode}</span>
                              </td>
                              <td className="inv-item-name" title={row.itemName}>
                                {row.itemName}
                              </td>
                              {/* BASE UOM */}
                              <td>
                                <span className="inv-uom-pill inv-uom-base">
                                  {row.uom || "—"}
                                </span>
                              </td>
                              <td className="inv-num inv-qty-base">
                                {fmtQty(row.totalQty)}
                              </td>

                              {/* ACTUAL UOM */}
                              <td>
                                <span className="inv-uom-pill inv-uom-actual">
                                  {actualUOM}
                                </span>
                              </td>
                              <td className="inv-num inv-qty-actual">
                                {fmtQty(actualQty)}
                              </td>
                            </tr>

                            {/* ── INLINE DETAIL PANEL ROW ── */}
                            {isSelected && (
                              <tr className="inv-detail-inline-row">
                                <td colSpan={7} style={{ padding: 0 }}>
                                  <div className="inv-detail-inline">

                                    {/* Header */}
                                    <div className="inv-detail-header">
                                      <div className="inv-detail-left">
                                        <span className="inv-detail-icon">🧾</span>
                                        <div>
                                          <div className="inv-detail-title">
                                            {selectedRow.itemName}
                                          </div>
                                          <div className="inv-detail-sub">
                                            Code: <strong>{selectedRow.itemCode}</strong>
                                            &nbsp;·&nbsp;
                                            {selectedRow.transactions.length} GRN transaction{selectedRow.transactions.length !== 1 ? "s" : ""}
                                            &nbsp;·&nbsp;
                                            Total: <strong>{fmtQty(selectedRow.totalQty)} {selectedRow.uom}</strong>
                                            &nbsp;/&nbsp;
                                            <strong>
                                              {fmtQty(toActual(selectedRow.totalQty, selectedRow.uom).actualQty)}{" "}
                                              {toActual(selectedRow.totalQty, selectedRow.uom).actualUOM}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        className="inv-close-btn"
                                        onClick={(e) => { e.stopPropagation(); setSelectedRow(null); }}
                                      >
                                        ✕
                                      </button>
                                    </div>

                                    {/* KPI STRIP */}
                                    <div className="inv-kpi-strip">
                                      <div className="inv-kpi">
                                        <span className="inv-kpi-label">Total GRN Qty (Base)</span>
                                        <span className="inv-kpi-val inv-kpi-blue">
                                          {fmtQty(selectedRow.totalQty)} {selectedRow.uom}
                                        </span>
                                      </div>
                                      <div className="inv-kpi">
                                        <span className="inv-kpi-label">Total GRN Qty (Actual)</span>
                                        <span className="inv-kpi-val inv-kpi-green">
                                          {fmtQty(toActual(selectedRow.totalQty, selectedRow.uom).actualQty)}{" "}
                                          {toActual(selectedRow.totalQty, selectedRow.uom).actualUOM}
                                        </span>
                                      </div>
                                      <div className="inv-kpi">
                                        <span className="inv-kpi-label">Total Amount</span>
                                        <span className="inv-kpi-val">₹ {fmt2(selectedRow.totalAmount)}</span>
                                      </div>
                                    </div>

                                    {/* GRN TRANSACTION TABLE */}
                                    <div className="inv-txn-wrap">
                                      <table className="inv-table inv-txn-table">
                                        <thead>
                                          <tr>
                                            <th>#</th>
                                            <th>GRN No</th>
                                            <th>GRN Date</th>
                                            <th>Party Name</th>
                                            <th>Invoice No</th>
                                            <th>Vehicle No</th>
                                            <th>Status</th>
                                            <th className="inv-num">Base Qty ({selectedRow.uom})</th>
                                            <th className="inv-num">
                                              Actual Qty ({toActual(1, selectedRow.uom).actualUOM})
                                            </th>
                                            <th className="inv-num">Rate (₹)</th>
                                            <th className="inv-num">Amount (₹)</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {[...selectedRow.transactions]
                                            .sort((a, b) => (a.grnDate < b.grnDate ? 1 : -1))
                                            .map((txn, i) => {
                                              const { actualQty } = toActual(txn.qty, txn.uom || selectedRow.uom);
                                              return (
                                                <tr key={i} className="inv-txn-row">
                                                  <td>{i + 1}</td>
                                                  <td>
                                                    <span className="inv-grn-chip">{txn.grnNo}</span>
                                                  </td>
                                                  <td>{txn.grnDate}</td>
                                                  <td title={txn.partyName}>{txn.partyName}</td>
                                                  <td>{txn.invoiceNo}</td>
                                                  <td>{txn.vehicleNo}</td>
                                                  <td>
                                                    <span
                                                      className={`inv-status-badge inv-status-${
                                                        (txn.status || "").toLowerCase()
                                                      }`}
                                                    >
                                                      {txn.status}
                                                    </span>
                                                  </td>
                                                  <td className="inv-num inv-qty-base">
                                                    {fmtQty(txn.qty)}
                                                  </td>
                                                  <td className="inv-num inv-qty-actual">
                                                    {fmtQty(actualQty)}
                                                  </td>
                                                  <td className="inv-num">{fmt2(txn.rate)}</td>
                                                  <td className="inv-num inv-amount">
                                                    ₹ {fmt2(txn.amount)}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </tbody>
                                        <tfoot>
                                          <tr className="inv-totals-row">
                                            <td colSpan={7}><strong>Total</strong></td>
                                            <td className="inv-num">
                                              <strong>{fmtQty(selectedRow.totalQty)}</strong>
                                            </td>
                                            <td className="inv-num">
                                              <strong>
                                                {fmtQty(toActual(selectedRow.totalQty, selectedRow.uom).actualQty)}
                                              </strong>
                                            </td>
                                            <td></td>
                                            <td className="inv-num">
                                              <strong>₹ {fmt2(selectedRow.totalAmount)}</strong>
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>

                      {/* TOTALS ROW */}
                      <tfoot>
                        <tr className="inv-totals-row">
                          <td colSpan={4}><strong>Grand Total</strong></td>
                          <td className="inv-num">
                            <strong>
                              {fmtQty(rows.reduce((s, r) => s + r.totalQty, 0))}
                            </strong>
                          </td>
                          <td></td>
                          <td className="inv-num">
                            <strong>
                              {/* Actual totals across different UOMs don't add meaningfully — show dash */}
                              —
                            </strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* ── TRANSACTION DETAIL PANEL ── */}
              </>
            )}
          </>
        )}

      </div>{/* end inv-content */}
    </div>
  );
};

export default ItemInventory;