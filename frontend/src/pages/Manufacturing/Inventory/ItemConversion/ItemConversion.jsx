import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./ItemConversion.css";

const WeighmentImportModal = ({ records, onSelect, onClose, loading }) => (
  <div className="ic-modal-overlay" onClick={onClose}>
    <div className="ic-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ic-modal-header">
        <h3>Import from Weighment</h3>
        <button className="ic-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="ic-modal-body">
        {loading ? (
          <div className="ic-modal-empty">Loading weighment records…</div>
        ) : records.length === 0 ? (
          <div className="ic-modal-empty">
            No available Weighment records found.<br />
            <small>(Only <strong>Saved</strong> weighments not yet used in an IC are shown)</small>
          </div>
        ) : (
          <table className="ic-modal-table">
            <thead>
              <tr>
                <th>Weighment No</th>
                <th>Date</th>
                <th>Party Name</th>
                <th>Vehicle No</th>
                <th>Transaction Type</th>
                <th>Net Weight</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} className="ic-modal-row-link" onClick={() => onSelect(r)}>
                  <td><strong>{r.weighmentNo}</strong></td>
                  <td>{r.weighmentDate || "-"}</td>
                  <td>{r.partyName || "-"}</td>
                  <td>{r.vehicleNo || "-"}</td>
                  <td>{r.transactionType || "-"}</td>
                  <td>{r.netWeight ? `${r.netWeight} MT` : "-"}</td>
                  <td>
                    <span className={`ic-status-badge ic-status-${(r.status || "").toLowerCase()}`}>
                      {r.status || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

/* ── Inward (GIN) Import Modal ── */
/* Shows GINs with status Open / Convert / Vout
   AND excludes any GIN already linked to an existing IC (ginId) */
const InwardImportModal = ({ records, onSelect, onClose, loading }) => (
  <div className="ic-modal-overlay" onClick={onClose}>
    <div className="ic-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ic-modal-header">
        <h3>Import from Inward (GIN)</h3>
        <button className="ic-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="ic-modal-body">
        {loading ? (
          <div className="ic-modal-empty">Loading inward records…</div>
        ) : records.length === 0 ? (
          <div className="ic-modal-empty">
            No available Inward records found.<br />
            <small>(Only Open / Convert / Vout GINs not yet used in an IC are shown)</small>
          </div>
        ) : (
          <table className="ic-modal-table">
            <thead>
              <tr>
                <th>GIN No</th>
                <th>Date</th>
                <th>Party Name</th>
                <th>Vehicle No</th>
                <th>Transaction Category</th>
                <th>Net Weight</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} className="ic-modal-row-link" onClick={() => onSelect(r)}>
                  <td><strong>{r.ginNo || r.documentNo || "-"}</strong></td>
                  <td>{r.inwardDate || r.date || "-"}</td>
                  <td>{r.partyName || "-"}</td>
                  <td>{r.vehicleNo || "-"}</td>
                  <td>{r.transactionCategory || "-"}</td>
                  <td>{r.netWeight ? `${r.netWeight} MT` : "-"}</td>
                  <td>
                    <span className={`ic-status-badge ic-status-${(r.status || "").toLowerCase()}`}>
                      {r.status || "-"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

const ItemConversion = () => {
  const navigate = useNavigate();

  const [records,  setRecords]  = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading,  setLoading]  = useState(false);

  /* search */
  const [srchFromDate, setSrchFromDate] = useState("");
  const [srchToDate,   setSrchToDate]   = useState("");
  const [srchIcNo,     setSrchIcNo]     = useState("");
  const [srchVehicle,  setSrchVehicle]  = useState("");
  const [srchItemCode, setSrchItemCode] = useState("");
  const [srchStatus,   setSrchStatus]   = useState("");
  const [srchTxCategory, setSrchTxCategory] = useState("");

  /* Transaction Category master — businessEntity "Item Conversion" (same source as Create page) */
  const [txCategories, setTxCategories] = useState([]);

  /* weighment import modal (top search bar) */
  const [showWeighmentModal,     setShowWeighmentModal]     = useState(false);
  const [weighmentRecords,       setWeighmentRecords]       = useState([]);
  const [loadingWeighment,       setLoadingWeighment]       = useState(false);

  /* inward (GIN) import modal (create dropdown) */
  const [showInwardModal,        setShowInwardModal]        = useState(false);
  const [inwardRecords,          setInwardRecords]          = useState([]);
  const [loadingInward,          setLoadingInward]          = useState(false);

  /* create dropdown toggle */
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  /* ── Fetch all existing IC records ── */
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/item-conversion`);
      let data = res.data;

      /* Auto-sync: if a linked GIN is now Closed, close the IC too */
      const ginRes = await axios.get(`${API_URL}/api/goods-inward-note`).catch(() => null);
      const ginData = ginRes ? (Array.isArray(ginRes.data) ? ginRes.data : (ginRes.data?.data || [])) : [];
      const ginStatusMap = {};
      ginData.forEach((g) => { if (g._id) ginStatusMap[g._id] = g.status; });

      const syncPromises = data.map(async (ic) => {
        if (ic.ginId && ginStatusMap[ic.ginId] === "Closed" && ic.status !== "Closed") {
          try {
            await axios.put(`${API_URL}/api/item-conversion/${ic._id}`, { ...ic, status: "Closed" });
            return { ...ic, status: "Closed" };
          } catch { return ic; }
        }
        return ic;
      });
      data = await Promise.all(syncPromises);

      setRecords(data);
      /* Default view: show Open, Draft and Saved records */
      const DEFAULT_STATUSES = ["Open", "Draft", "Saved"];
      setFiltered(data.filter((r) => DEFAULT_STATUSES.includes(r.status || "Open")));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, []);

  /* ── Fetch Transaction Category master — businessEntity "Item Conversion" ──
     (All statuses included here, unlike the Create page, so the search filter
     can still find older records saved against a category that's since been
     closed in the master.) ── */
  useEffect(() => {
    axios.get(`${API_URL}/api/transactions`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTxCategories(list.filter((tx) => tx.businessEntity === "Item Conversion"));
      })
      .catch(() => setTxCategories([]));
  }, []);

  /* ── Close create menu when clicking outside ── */
  useEffect(() => {
    if (!showCreateMenu) return;
    const handler = () => setShowCreateMenu(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [showCreateMenu]);

  /* ── Search / Reset ── */
  const handleSearch = () => {
    let f = [...records];
    if (srchFromDate)   f = f.filter((r) => r.conversionDate >= srchFromDate);
    if (srchToDate)     f = f.filter((r) => r.conversionDate <= srchToDate);
    if (srchIcNo)       f = f.filter((r) => r.icNo?.toLowerCase().includes(srchIcNo.toLowerCase()));
    if (srchVehicle)    f = f.filter((r) => r.vehicleNo?.toLowerCase().includes(srchVehicle.toLowerCase()));
    if (srchItemCode)   f = f.filter((r) => r.itemCode?.toLowerCase().includes(srchItemCode.toLowerCase()));
    if (srchStatus)     f = f.filter((r) => (r.status || "Open").toLowerCase() === srchStatus.toLowerCase());
    if (srchTxCategory) f = f.filter((r) => r.transactionCategory === srchTxCategory);
    setFiltered(f);
  };

  const handleReset = () => {
    setSrchFromDate(""); setSrchToDate(""); setSrchIcNo("");
    setSrchVehicle(""); setSrchItemCode(""); setSrchStatus(""); setSrchTxCategory("");
    const DEFAULT_STATUSES = ["Open", "Draft", "Saved"];
    setFiltered(records.filter((r) => DEFAULT_STATUSES.includes(r.status || "Open")));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Item Conversion?")) return;
    try {
      await axios.delete(`${API_URL}/api/item-conversion/${id}`);
      fetchRecords();
    } catch (err) { console.error(err); }
  };

  /* ─────────────────────────────────────────────────────
     WEIGHMENT MODAL (top search bar "Import from Weighment")
     Filter: status must be "Saved" ONLY
     Exclude: any weighmentId already used as ginId in an IC
  ───────────────────────────────────────────────────── */
  const handleOpenWeighmentModal = async () => {
    setShowWeighmentModal(true);
    setLoadingWeighment(true);
    try {
      /* Fetch all weighments */
      const wtRes  = await axios.get(`${API_URL}/api/weighment`);
      const wtData = Array.isArray(wtRes.data) ? wtRes.data : (wtRes.data?.data || []);

      /* Collect all weighmentIds already linked in existing ICs */
      const usedIds = new Set(records.map((ic) => ic.ginId).filter(Boolean));

      /* Keep only Saved weighments not already used in an IC.
         Saved = both weights captured and finalised — the only state
         eligible for Item Conversion export. */
      const available = wtData.filter((w) => {
        const status = (w.status || "").toLowerCase();
        return status === "saved" && !usedIds.has(w._id);
      });

      setWeighmentRecords(available);
    } catch (err) {
      console.error(err);
      setWeighmentRecords([]);
    } finally {
      setLoadingWeighment(false);
    }
  };

  const handleWeighmentSelect = (wt) => {
    setShowWeighmentModal(false);
    navigate("/create-item-conversion", {
      state: {
        fromWeighment: {
          weighmentId:         wt._id,
          weighmentNo:         wt.weighmentNo         || "",
          vehicleNo:           wt.vehicleNo           || "",
          partyName:           wt.partyName           || "",
          partyCode:           wt.vendorCode          || "",
          poNo:                wt.poCpoNo             || "",
          transactionCategory: wt.transactionCategory || "",
          netWeight:           wt.netWeight           || "",
          items: (wt.items || []).filter((it) => it.itemCode || it.itemName),
        },
      },
    });
  };

  /* ─────────────────────────────────────────────────────
     INWARD / GIN MODAL (create dropdown "Import from Inward")
     Filter: status must be "Open"
     Exclude: any ginId already used in an existing IC
  ───────────────────────────────────────────────────── */
  const handleOpenInwardModal = async () => {
    setShowInwardModal(true);
    setShowCreateMenu(false);
    setLoadingInward(true);
    try {
      /* Fetch GINs that are eligible for IC creation:
         Open    = no weighment yet (direct IC from inward)
         Convert = first weight done (weighment in progress)
         Vout    = both weights done (weighment finalised — ready for IC)
      */
      const ginParams = new URLSearchParams();
      ["Open", "Convert", "Vout"].forEach((s) => ginParams.append("statusIn", s));
      const ginRes  = await axios.get(`${API_URL}/api/goods-inward-note?${ginParams.toString()}`);
      const ginData = Array.isArray(ginRes.data) ? ginRes.data : (ginRes.data?.data || []);

      /* Collect all ginIds already linked in existing ICs */
      const usedIds = new Set(records.map((ic) => ic.ginId).filter(Boolean));

      /* Keep only eligible GINs not already used in an IC */
      const available = ginData.filter((g) => {
        const status = (g.status || "").toLowerCase();
        return (status === "open" || status === "convert" || status === "vout") && !usedIds.has(g._id);
      });

      setInwardRecords(available);
    } catch (err) {
      console.error(err);
      setInwardRecords([]);
    } finally {
      setLoadingInward(false);
    }
  };

  const handleInwardSelect = (gin) => {
    setShowInwardModal(false);
    navigate("/create-item-conversion", {
      state: {
        fromGIN: {
          _id:       gin._id,
          poCpoNo:   gin.poCpoNo   || gin.poNo   || "",
          vehicleNo: gin.vehicleNo || "",
          partyName: gin.partyName || "",
          partyCode: gin.partyCode || "",
          items:     gin.items     || [],
        },
      },
    });
  };

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

  return (
    <div className="ic-page">
      <ModuleNavbar />

      {/* ── TOP BAR ── */}
      <div className="ic-topbar">
        <div className="ic-topbar-left">
          <button
            className="ic-back-btn"
            onClick={() => navigate("/inventory")}
            style={{ backgroundColor: "#2563eb", color: "#fff", border: "none" }}
          >
            ←Back
          </button>
          <div>
            <h1>Item Conversion</h1>
            <span className="ic-topbar-sub">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="ic-topbar-right">
          {/* "Import from Weighment" — fetches only Saved weighments not yet linked to any IC */}
          <button className="ic-export-btn" onClick={handleOpenWeighmentModal}>
            ⚖️ Import from Weighment
          </button>

          {/* Create dropdown */}
          <div className="ic-create-dropdown-wrap" style={{ position: "relative" }}>
            <button
              className="ic-create-btn"
              onClick={(e) => { e.stopPropagation(); setShowCreateMenu((p) => !p); }}
            >
              + Create ▾
            </button>

            {showCreateMenu && (
              <div className="ic-create-menu">
                {/* Plain create — no pre-fill */}
                <button
                  className="ic-create-menu-item"
                  onClick={() => { setShowCreateMenu(false); navigate("/create-item-conversion"); }}
                >
                  Create
                </button>

                {/* Import from Inward (GIN) — fetches Open/Convert/Vout GINs not yet linked to any IC */}
                <button
                  className="ic-create-menu-item"
                  onClick={handleOpenInwardModal}
                >
                  Import from Inward
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SEARCH CARD ── */}
      <div className="ic-card">
        <div className="ic-card-title"><span className="ic-card-icon">🔍</span> Search</div>
        <div className="ic-search-grid">
          <div className="ic-field">
            <label>From Date</label>
            <input type="date" value={srchFromDate} onChange={(e) => setSrchFromDate(e.target.value)} />
          </div>
          <div className="ic-field">
            <label>To Date</label>
            <input type="date" value={srchToDate} onChange={(e) => setSrchToDate(e.target.value)} />
          </div>
          <div className="ic-field">
            <label>IC No</label>
            <input type="text" value={srchIcNo} onChange={(e) => setSrchIcNo(e.target.value)} placeholder="Search IC No…" />
          </div>
          <div className="ic-field">
            <label>Vehicle No</label>
            <input type="text" value={srchVehicle} onChange={(e) => setSrchVehicle(e.target.value)} placeholder="Search vehicle…" />
          </div>
          <div className="ic-field">
            <label>Item Code</label>
            <input type="text" value={srchItemCode} onChange={(e) => setSrchItemCode(e.target.value)} placeholder="Search item code…" />
          </div>
          <div className="ic-field">
            <label>Transaction Category</label>
            <select value={srchTxCategory} onChange={(e) => setSrchTxCategory(e.target.value)}>
              <option value="">All</option>
              {txCategories.map((tx) => (
                <option key={tx._id} value={tx.categoryDescription}>
                  {tx.transactionCategoryCode} - {tx.categoryDescription}
                </option>
              ))}
            </select>
          </div>
          <div className="ic-field">
            <label>Status</label>
            <select value={srchStatus} onChange={(e) => setSrchStatus(e.target.value)}>
              <option value="">All</option>
              <option value="Open">Open</option>
              <option value="Draft">Draft</option>
              <option value="Saved">Saved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
        <div className="ic-search-btns">
          <button className="ic-search-btn" onClick={handleSearch}>Search</button>
          <button className="ic-reset-btn"  onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="ic-card">
        {loading ? (
          <div className="ic-loading">
            <span className="ic-loading-spinner" /> Loading…
          </div>
        ) : (
          <div className="ic-table-wrap">
            <table className="ic-table">
              <thead>
                <tr>
                  <th>S No</th>
                  <th>IC No</th>
                  <th>Date</th>
                  <th>Transaction Category</th>
                  <th>PO No</th>
                  <th>Vehicle No</th>
                  <th>Party Name</th>
                  <th>Item Code</th>
                  <th>Item Description</th>
                  <th>CQty</th>
                  <th>RQty</th>
                  <th>UOM</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((r, i) => {
                    const rqty   = r.totalRaQty ?? (r.conversionRows || []).reduce((s, row) => s + (Number(row.raQty || row.rQty) || 0), 0);
                    return (
                      <tr key={r._id} className="ic-table-row-link" onClick={() => navigate(`/item-conversion-detail/${r._id}`)}>
                        <td className="ic-sno-cell">{i + 1}</td>
                        <td>
                          <span className="ic-no-highlight">{r.icNo}</span>
                        </td>
                        <td>{r.conversionDate || "-"}</td>
                        <td>{r.transactionCategory || "-"}</td>
                        <td>{r.poNo || "-"}</td>
                        <td>{r.vehicleNo || "-"}</td>
                        <td>{r.partyName || "-"}</td>
                        <td><span className="ic-code-pill">{r.itemCode || "-"}</span></td>
                        <td>{r.itemDescription || "-"}</td>
                        <td className="ic-num-cell">{fmt(r.baseQty)}</td>
                        <td className="ic-num-cell">{fmt(rqty)}</td>
                        <td>{r.uom || "-"}</td>
                        <td>
                          <span className={`ic-status-badge ic-status-${(r.status || "open").toLowerCase()}`}>
                            {r.status || "Open"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="13" className="ic-no-data">No Item Conversions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Weighment Import Modal ── */}
      {showWeighmentModal && (
        <WeighmentImportModal
          records={weighmentRecords}
          loading={loadingWeighment}
          onSelect={handleWeighmentSelect}
          onClose={() => setShowWeighmentModal(false)}
        />
      )}  

      {/* ── Inward (GIN) Import Modal ── */}
      {showInwardModal && (
        <InwardImportModal
          records={inwardRecords}
          loading={loadingInward}
          onSelect={handleInwardSelect}
          onClose={() => setShowInwardModal(false)}
        />
      )}

      {/* Inline styles for new elements */}
      <style>{`
        .ic-create-dropdown-wrap { position: relative; }

        .ic-create-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 500;
          min-width: 180px;
          overflow: hidden;
        }

        .ic-create-menu-item {
          display: block;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: #1e293b;
          transition: background 0.15s;
        }
        .ic-create-menu-item:hover { background: #f0f9ff; color: #0369a1; }
        .ic-create-menu-item + .ic-create-menu-item { border-top: 1px solid #f1f5f9; }

        .ic-status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .ic-status-badge.ic-status-open    { background: #dcfce7; color: #166534; }
        .ic-status-badge.ic-status-draft   { background: #fef9c3; color: #854d0e; }
        .ic-status-badge.ic-status-saved   { background: #dbeafe; color: #1e40af; }
        .ic-status-badge.ic-status-convert { background: #ede9fe; color: #6d28d9; }
        .ic-status-badge.ic-status-vout    { background: #f0fdf4; color: #15803d; }
        .ic-status-badge.ic-status-closed  { background: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  );
};

export default ItemConversion;