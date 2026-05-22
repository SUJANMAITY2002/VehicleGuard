
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ItemEntry.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EMPTY_ITEM = {
  entryNo:           "",
  itemName:          "",
  itemCategory:      "Raw Material",
  withoutItemWeight: "",
  withItemWeight:    "",
  remarks:           "",
};

const ITEM_CATEGORIES = ["Raw Material", "Finished Goods", "Scrap", "Equipment", "Other"];

function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[+m - 1]} ${y}`;
}

function ItemEntry() {
  const navigate  = useNavigate();
  const formRef   = useRef(null);   // used to scroll up when a row is clicked
  const token     = localStorage.getItem("token");

  const [form,           setForm]           = useState(EMPTY_ITEM);
  const [vehicleInfo,    setVehicleInfo]    = useState(null);
  const [fetchingEntry,  setFetchingEntry]  = useState(false);
  const [entryError,     setEntryError]     = useState("");
  const [formError,      setFormError]      = useState("");
  const [loading,        setLoading]        = useState(false);
  const [success,        setSuccess]        = useState("");

  // Recent vehicle entries
  const [recentEntries,  setRecentEntries]  = useState([]);
  const [loadingRecent,  setLoadingRecent]  = useState(true);
  const [recentSearch,   setRecentSearch]   = useState("");

  // Auto-calculated net weight
  const withoutW  = parseFloat(form.withoutItemWeight) || 0;
  const withW     = parseFloat(form.withItemWeight)    || 0;
  const netWeight = withW - withoutW;

  // Fetch recent vehicle entries on mount
  useEffect(() => {
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const res = await axios.get(`${API}/api/entry/all`);
        setRecentEntries(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecent();
  }, []);

  // Reload recent list after a successful save
  const reloadRecent = async () => {
    try {
      const res = await axios.get(`${API}/api/entry/all`);
      setRecentEntries(res.data);
    } catch {}
  };

  const handleEntryNoChange = (e) => {
    setForm({ ...form, entryNo: e.target.value });
    setVehicleInfo(null);
    setEntryError("");
    setFormError("");
  };

  const fetchVehicleEntry = async (entryNo) => {
    const no = (entryNo || form.entryNo).trim().toUpperCase();
    if (!no) { setEntryError("Please enter an Entry No."); return; }
    setFetchingEntry(true);
    setEntryError("");
    setVehicleInfo(null);
    try {
      const res = await axios.get(`${API}/api/entry/${no}`);
      setVehicleInfo(res.data);
      // sync entryNo field if called from table row
      setForm(prev => ({ ...prev, entryNo: no }));
    } catch (err) {
      setEntryError(err.response?.data?.message || "Entry not found. Please check the Entry No.");
    } finally {
      setFetchingEntry(false);
    }
  };

  const handleEntryNoKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); fetchVehicleEntry(); }
  };

  // Called when user clicks "Item Entry →" on a recent row
  const handleQuickSelect = (entry) => {
    setFormError("");
    setSuccess("");
    setEntryError("");
    setForm(prev => ({ ...EMPTY_ITEM, entryNo: entry.entryNo }));
    fetchVehicleEntry(entry.entryNo);
    // Scroll to top of form
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token)                    { navigate("/signin"); return; }
    if (!vehicleInfo)              { setFormError("Please fetch a valid Entry No first."); return; }
    if (!form.itemName.trim())     { setFormError("Item name is required."); return; }
    if (!form.withoutItemWeight)   { setFormError("Without-item weight is required."); return; }
    if (!form.withItemWeight)      { setFormError("With-item weight is required."); return; }
    if (withW <= withoutW)         { setFormError("With-item weight must be greater than without-item weight."); return; }

    setLoading(true);
    setFormError("");
    try {
      await axios.post(`${API}/api/item/add`, {
        entryNo:           vehicleInfo.entryNo,
        itemName:          form.itemName.trim(),
        itemCategory:      form.itemCategory,
        withoutItemWeight: withoutW,
        withItemWeight:    withW,
        remarks:           form.remarks.trim(),
      });
      setSuccess("Item entry saved successfully!");
      setForm(EMPTY_ITEM);
      setVehicleInfo(null);
      reloadRecent();
    } catch (err) {
      setFormError(err.response?.data?.message || "Error saving. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_ITEM);
    setVehicleInfo(null);
    setSuccess("");
    setFormError("");
    setEntryError("");
  };

  // Filter recent entries by search
  const filteredRecent = recentEntries.filter(e => {
    const q = recentSearch.toLowerCase();
    return (
      e.entryNo?.toLowerCase().includes(q) ||
      e.vehicleNo?.toLowerCase().includes(q) ||
      e.particleNo?.toLowerCase().includes(q)
    );
  });

  if (!token) {
    return (
      <div className="page">
        <div className="locked-box" style={{ marginTop: 48 }}>
          <span>🔐</span>
          <h3>Login Required</h3>
          <p>Sign in to add item entries</p>
          <button className="btn-primary" onClick={() => navigate("/signin")}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Item Entry</h1>
          <p className="page-sub">Fetch vehicle entry and record item weights</p>
        </div>
      </div>

      {/* ── FORM CARD ── */}
      <div className="form-card" ref={formRef}>

        {/* Step 1 */}
        <div className="step-section">
          <div className="step-label">
            <span className="step-num">1</span>
            Enter Entry No
          </div>
          <div className="entry-lookup-row">
            <input
              type="text"
              className="entry-no-input"
              placeholder="e.g. VE250522001"
              value={form.entryNo}
              onChange={handleEntryNoChange}
              onKeyDown={handleEntryNoKeyDown}
              style={{ textTransform: "uppercase" }}
            />
            <button
              type="button"
              className="btn-fetch"
              onClick={() => fetchVehicleEntry()}
              disabled={fetchingEntry}
            >
              {fetchingEntry ? "Fetching…" : "Fetch Details →"}
            </button>
          </div>
          {entryError && <div className="alert alert-error" style={{ marginTop: 8 }}>{entryError}</div>}
        </div>

        {/* Step 2: Vehicle details */}
        {vehicleInfo && (
          <div className="step-section">
            <div className="step-label">
              <span className="step-num">2</span>
              Vehicle Details <span className="locked-tag">🔒 Auto-filled</span>
            </div>
            <div className="vehicle-info-grid">
              <div className="info-field">
                <span className="info-field-label">Entry No</span>
                <span className="info-field-value highlight">{vehicleInfo.entryNo}</span>
              </div>
              <div className="info-field">
                <span className="info-field-label">Entry Date</span>
                <span className="info-field-value">{fmtDate(vehicleInfo.entryDate)}</span>
              </div>
              <div className="info-field">
                <span className="info-field-label">Vehicle No</span>
                <span className="info-field-value highlight">{vehicleInfo.vehicleNo}</span>
              </div>
              <div className="info-field">
                <span className="info-field-label">Particle No</span>
                <span className="info-field-value">{vehicleInfo.particleNo}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Item & weight */}
        {vehicleInfo && (
          <form onSubmit={handleSubmit}>
            <div className="step-section">
              <div className="step-label">
                <span className="step-num">3</span>
                Item & Weight Details
              </div>

              {formError && <div className="alert alert-error">{formError}</div>}
              {success   && <div className="alert alert-success">{success}</div>}

              <div className="form-grid-2" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label>Item Name *</label>
                  <input type="text" name="itemName"
                    placeholder="e.g. Iron Ore, Coal, Steel Rods…"
                    value={form.itemName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Item Category</label>
                  <select name="itemCategory" value={form.itemCategory} onChange={handleChange}>
                    {ITEM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="weight-section">
                <div className="weight-card without">
                  <span className="weight-card-label">Without Item Weight (kg)</span>
                  <input type="number" name="withoutItemWeight" className="weight-input"
                    placeholder="0.00" step="0.01" min="0"
                    value={form.withoutItemWeight} onChange={handleChange} />
                  <span className="weight-hint">Empty vehicle weight</span>
                </div>

                <div className="weight-arrow">→</div>

                <div className="weight-card with">
                  <span className="weight-card-label">With Item Weight (kg)</span>
                  <input type="number" name="withItemWeight" className="weight-input"
                    placeholder="0.00" step="0.01" min="0"
                    value={form.withItemWeight} onChange={handleChange} />
                  <span className="weight-hint">Loaded vehicle weight</span>
                </div>

                <div className="weight-arrow">=</div>

                <div className={`weight-card net ${netWeight > 0 ? "net-positive" : netWeight < 0 ? "net-negative" : ""}`}>
                  <span className="weight-card-label">Net Weight (kg)</span>
                  <span className="net-weight-value">
                    {form.withItemWeight && form.withoutItemWeight ? netWeight.toFixed(2) : "—"}
                  </span>
                  <span className="weight-hint">Auto-calculated</span>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Remarks</label>
                <input type="text" name="remarks" placeholder="Any notes…"
                  value={form.remarks} onChange={handleChange} />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={handleReset}>Reset</button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? "Saving…" : "✓ Save Item Entry"}
                </button>
              </div>
            </div>
          </form>
        )}

        {!vehicleInfo && !entryError && (
          <div className="step-hint">
            <span>👆</span>
            <p>Enter an Entry No above and click <strong>Fetch Details</strong> to begin,<br />or click <strong>Item Entry →</strong> on any row below</p>
          </div>
        )}
      </div>

      {/* ── RECENT VEHICLE ENTRIES TABLE ── */}
      <div className="recent-card">
        <div className="recent-header">
          <div className="recent-title-group">
            <h2 className="recent-title">Recent Vehicle Entries</h2>
            <span className="recent-badge">{recentEntries.length}</span>
          </div>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search entry no, vehicle, particle…"
              value={recentSearch}
              onChange={e => setRecentSearch(e.target.value)}
            />
          </div>
        </div>

        {loadingRecent ? (
          <div className="state-box"><div className="spinner"></div><p>Loading entries…</p></div>
        ) : filteredRecent.length === 0 ? (
          <div className="state-box"><span>📋</span><p>No vehicle entries found</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Entry No</th>
                  <th>Date</th>
                  <th>Vehicle No</th>
                  <th>Particle No</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.map((e, i) => {
                  const isActive = vehicleInfo?.entryNo === e.entryNo;
                  return (
                    <tr key={e._id} className={isActive ? "row-active" : ""}>
                      <td className="td-num">{i + 1}</td>
                      <td><span className="entry-no-badge">{e.entryNo}</span></td>
                      <td className="td-date">{fmtDate(e.entryDate)}</td>
                      <td><strong className="vehicle-no">{e.vehicleNo}</strong></td>
                      <td className="td-muted">{e.particleNo}</td>
                      <td>
                        <button
                          className={`btn-use-entry ${isActive ? "btn-use-active" : ""}`}
                          onClick={() => handleQuickSelect(e)}
                          disabled={fetchingEntry}
                        >
                          {isActive ? "✓ Selected" : "Item Entry →"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default ItemEntry;
