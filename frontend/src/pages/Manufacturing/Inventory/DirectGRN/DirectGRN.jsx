import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./DirectGRN.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const API = `${API_URL}/api/direct-grn`;

const EMPTY_FILTERS = {
  fromDate: "",
  toDate: "",
  grnNo: "",
  status: "",
  grnType: "",
  transactionCategory: "",
  vendorCode: "",
  vendorName: "",
  vehicleNo: "",
  site: "",
  invoiceNo: "",
  poNo: "",
};

const DirectGRN = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState([]);
  const [txCategories, setTxCategories] = useState([]);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  /* ── Fetch sites ── */
  useEffect(() => {
    axios
      .get(`${API_URL}/api/sites`)
      .then((res) =>
        setSites((Array.isArray(res.data) ? res.data : []).filter((s) => s.status !== "Inactive"))
      )
      .catch(() => setSites([]));
  }, []);

  /* ── Fetch Transaction Category master — same source as Create page
     (module "Inventory", businessEntity "GRN"). All statuses included
     here (unlike Create), so the filter can still find older records
     saved against a category that's since been closed in the master. ── */
  useEffect(() => {
    axios
      .get(`${API_URL}/api/transactions`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTxCategories(list.filter((tx) => tx.module === "Inventory" && tx.businessEntity === "GRN"));
      })
      .catch(() => setTxCategories([]));
  }, []);

  /* ── Auto-load on mount (no Apply needed) ── */
  useEffect(() => {
    fetchData(EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Close dropdown when clicking outside ── */
  useEffect(() => {
    if (!showCreateMenu) return;
    const handler = () => setShowCreateMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showCreateMenu]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const fetchData = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const res = await axios.get(`${API}?${params.toString()}`);
      setResults(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => fetchData(filters);

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    fetchData(EMPTY_FILTERS);
  };

  /* ── Guard: one GRN per IC (vehicle still open = status not Closed) ──
     When "+ Create From Item Conversion" is clicked we check before
     navigating. The actual per-IC duplicate check lives in the IC picker
     screen (IcPickerScreen) — we pass existingGrns so it can mark already-
     used ICs as disabled.
  ── */
  const handleCreateFromIC = (e) => {
    e.stopPropagation();
    setShowCreateMenu(false);
    navigate("/create-direct-grn", { state: { fromItemConversion: true, existingGrns: results } });
  };

  return (
    <div className="dgrn-page">
      <ModuleNavbar />

      {/* ── TOP BAR (matches Inward style) ── */}
      <div className="dgrn-topbar">
        <div className="dgrn-topbar-left">
          <button className="dgrn-back-btn" onClick={() => navigate("/inventory")}>← Back</button>
          <div>
            <h1>GRN</h1>
            <span className="dgrn-topbar-sub">
              Showing {results.length} record{results.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="dgrn-topbar-right">
          <div className="dgrn-create-wrap">
            <button
              className="dgrn-create-btn"
              onClick={(e) => { e.stopPropagation(); setShowCreateMenu((prev) => !prev); }}
            >
              + Create ▾
            </button>
            {showCreateMenu && (
              <div className="dgrn-create-menu">
                <button onClick={() => { setShowCreateMenu(false); navigate("/create-direct-grn"); }}>
                  Create DGRN
                </button>
                <button onClick={handleCreateFromIC}>
                  Create From Item Conversion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="dgrn-content">

        {/* ── Search Filters ── */}
        <div className="dgrn-card">
          <div className="dgrn-filter-title">Search Filters</div>

          <div className="dgrn-filter-grid">
            <div className="dgrn-fg">
              <label>From Date</label>
              <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} />
            </div>
            <div className="dgrn-fg">
              <label>To Date</label>
              <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} />
            </div>
            <div className="dgrn-fg">
              <label>GRN No</label>
              <input name="grnNo" value={filters.grnNo} onChange={handleFilterChange} placeholder="Search GRN No…" />
            </div>
            <div className="dgrn-fg">
              <label>Transaction Category</label>
              <select name="transactionCategory" value={filters.transactionCategory} onChange={handleFilterChange}>
                <option value="">All</option>
                {txCategories.map((tx) => (
                  <option key={tx._id} value={tx.categoryDescription}>
                    {tx.transactionCategoryCode} - {tx.categoryDescription}
                  </option>
                ))}
              </select>
            </div>
            <div className="dgrn-fg">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All</option>
                <option>Draft</option>
                <option>Open</option>
                <option>Approved</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="dgrn-fg">
              <label>GRN Type</label>
              <select name="grnType" value={filters.grnType} onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="T">T</option>
                <option value="UT">UT</option>
              </select>
            </div>
            <div className="dgrn-fg">
              <label>PO No</label>
              <input name="poNo" value={filters.poNo} onChange={handleFilterChange} placeholder="Search PO No…" />
            </div>
            <div className="dgrn-fg">
              <label>Party Code</label>
              <input name="vendorCode" value={filters.vendorCode} onChange={handleFilterChange} />
            </div>
            <div className="dgrn-fg">
              <label>Party Name</label>
              <input name="vendorName" value={filters.vendorName} onChange={handleFilterChange} />
            </div>
            <div className="dgrn-fg">
              <label>Vehicle No</label>
              <input name="vehicleNo" value={filters.vehicleNo} onChange={handleFilterChange} />
            </div>
            <div className="dgrn-fg">
              <label>Site</label>
              <select name="site" value={filters.site} onChange={handleFilterChange}>
                <option value="">All</option>
                {sites.map((site) => (
                  <option key={site._id} value={site.siteCode || site.siteName}>
                    {site.siteCode || site.siteName}
                    {site.siteName ? ` - ${site.siteName}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="dgrn-fg">
              <label>Invoice No</label>
              <input name="invoiceNo" value={filters.invoiceNo} onChange={handleFilterChange} />
            </div>
          </div>

          <div className="dgrn-filter-actions">
            <button className="dgrn-reset-btn" onClick={handleReset}>Reset</button>
            <button className="dgrn-apply-btn" onClick={handleApply} disabled={loading}>
              {loading ? "Searching…" : "Apply"}
            </button>
          </div>
        </div>

        {/* ── Results Table ── */}
        <div className="dgrn-card" style={{ padding: 0 }}>
          {loading ? (
            <div className="dgrn-placeholder">Loading…</div>
          ) : results.length === 0 ? (
            <div className="dgrn-placeholder">No records found</div>
          ) : (
            <>
              <div style={{ padding: "10px 16px 8px", borderBottom: "1px solid #f1f5f9" }}>
                <span className="dgrn-table-meta">
                  Showing {results.length} record{results.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="dgrn-table-wrap">
                <table className="dgrn-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>GRN NO</th>
                      <th>DATE</th>
                      <th>PO NO</th>
                      <th>TRANSACTION CATEGORY</th>
                      <th>PARTY NAME</th>
                      <th>INV NO</th>
                      <th>VEHICLE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr
                        key={row._id || idx}
                        className="dgrn-clickable-row"
                        onClick={() => navigate(`/direct-grn-details/${row._id}`)}
                      >
                        <td className="dgrn-sno-cell">{idx + 1}</td>
                        <td>
                          <span className="dgrn-grn-no-highlight">
                            {row.grnNo || "—"}
                          </span>
                        </td>
                        <td>{row.grnDate || "-"}</td>
                        <td>{row.poNo || "-"}</td>
                        <td>{row.transactionCategory || "-"}</td>
                        <td>{row.partyName || row.vendorName || "-"}</td>
                        <td>{row.challanInvoiceNo || "-"}</td>
                        <td>{row.vehicleNo || "-"}</td>
                        <td>
                          <span className={`dgrn-badge dgrn-badge-${(row.status || "draft").toLowerCase()}`}>
                            {row.status || "Draft"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </div>{/* end dgrn-content */}
    </div>
  );
};

export default DirectGRN;