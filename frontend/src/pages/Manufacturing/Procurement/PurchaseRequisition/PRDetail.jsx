import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./PurchaseRequisition.css";

const PR_API = `${API_URL}/api/purchase-requisition`;

const DEPT_OPTIONS   = ["Production", "Maintenance", "Stores", "Admin", "Accounts", "HR", "IT", "Quality", "Dispatch"];
const PRIORITY_OPT   = ["High", "Normal", "Low"];
const STATUS_OPTIONS = ["Pending", "Approved", "Closed", "Cancelled"];

/* ── Convert to PO Modal ── */
const ConvertPOModal = ({ pr, onClose, onConverted }) => {
  const [poNo,         setPoNo]         = useState("");
  const [poDate,       setPoDate]       = useState(new Date().toISOString().slice(0, 10));
  const [partyName,    setPartyName]    = useState("");
  const [partyCode,    setPartyCode]    = useState("");
  const [mobileNo,     setMobileNo]     = useState("");
  const [paymentMode,  setPaymentMode]  = useState("");
  const [eta,          setEta]          = useState(pr?.requiredDate || "");
  const [dueDate,      setDueDate]      = useState("");
  const [poType,       setPoType]       = useState("");
  const [convertedBy,  setConvertedBy]  = useState("");
  const [parties,      setParties]      = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [seqError,     setSeqError]     = useState("");

  useEffect(() => {
    const fetchSeq = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/purchase-order/next-sequence`, {
          params: { module: "Procurement", businessEntity: "PurchaseOrder", entityPrefix: "PO" },
        });
        if (res.data.success) { setPoNo(res.data.nextCode); setSeqError(""); }
      } catch (err) {
        setSeqError(err.response?.data?.message || "Enter PO No manually");
      }
    };

    const fetchParties = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/parties`);
        setParties((res.data || []).filter((p) => p.status === "Active"));
      } catch (_) {}
    };

    fetchSeq();
    fetchParties();
  }, []);

  const handlePartySelect = (e) => {
    const selected = parties.find((p) => p.partyName === e.target.value);
    if (selected) {
      setPartyName(selected.partyName);
      setPartyCode(selected.partyCode || selected._id || "");
      setMobileNo(selected.mobileNo || selected.mobile || "");
    } else {
      setPartyName(e.target.value);
    }
  };

  const handleConvert = async () => {
    if (!partyName) return alert("Supplier / Party Name is required");
    if (!poNo)      return alert("PO No is required");

    setSaving(true);
    try {
      const res = await axios.post(`${PR_API}/${pr._id}/convert-to-po`, {
        poNo, poDate, partyName, partyCode, mobileNo,
        paymentMode, eta, dueDate, poType, convertedBy,
      });
      if (res.data.success) {
        alert(`✅ ${res.data.message}`);
        onConverted(res.data.data);
      }
    } catch (err) {
      alert("Conversion failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pr-modal-overlay">
      <div className="pr-modal">
        <div className="pr-modal-header">
          <span>⚙️ Convert PR to Purchase Order</span>
          <button className="pr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="pr-modal-info">
          <strong>PR No:</strong> {pr?.prNo} &nbsp;|&nbsp;
          <strong>Department:</strong> {pr?.department} &nbsp;|&nbsp;
          <strong>Items:</strong> {pr?.items?.map((i) => i.itemName).join(", ")}
        </div>

        {seqError && <div className="pr-seq-warning" style={{ margin: "8px 0" }}>⚠️ {seqError}</div>}

        <div className="cpr-grid" style={{ marginTop: 12 }}>

          <div className="cpr-field">
            <label>PO No <span className="req">*</span></label>
            <input className="cpr-input" value={poNo} onChange={(e) => setPoNo(e.target.value)} />
          </div>

          <div className="cpr-field">
            <label>PO Date</label>
            <input type="date" className="cpr-input" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
          </div>

          <div className="cpr-field">
            <label>Supplier / Party <span className="req">*</span></label>
            <select className="cpr-input" value={partyName} onChange={handlePartySelect}>
              <option value="">-- Select --</option>
              {parties.map((p) => (
                <option key={p._id} value={p.partyName}>{p.partyName}</option>
              ))}
            </select>
          </div>

          <div className="cpr-field">
            <label>Mobile No</label>
            <input className="cpr-input" value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} />
          </div>

          <div className="cpr-field">
            <label>Payment Mode</label>
            <select className="cpr-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="">-- Select --</option>
              {["Cash", "Cheque", "Online", "Credit"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="cpr-field">
            <label>PO Type</label>
            <input className="cpr-input" value={poType} onChange={(e) => setPoType(e.target.value)} placeholder="e.g. Material" />
          </div>

          <div className="cpr-field">
            <label>ETA</label>
            <input type="date" className="cpr-input" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>

          <div className="cpr-field">
            <label>Due Date</label>
            <input type="date" className="cpr-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="cpr-field">
            <label>Converted By</label>
            <input className="cpr-input" value={convertedBy} onChange={(e) => setConvertedBy(e.target.value)} placeholder="Your name…" />
          </div>

        </div>

        {/* Items preview */}
        <div className="pr-modal-items">
          <div className="cpr-card-header" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Items to be transferred to PO:
          </div>
          <table className="cpr-items-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>#</th><th>Item</th><th>Category</th><th>UOM</th><th>Required Qty</th>
              </tr>
            </thead>
            <tbody>
              {pr?.items?.map((it, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{it.itemName}</td>
                  <td>{it.itemCategory}</td>
                  <td>{it.uom}</td>
                  <td>{it.requiredQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pr-modal-footer">
          <button className="cpr-cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="cpr-save-btn"   onClick={handleConvert} disabled={saving}>
            {saving ? "Generating PO…" : "Generate PO"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════
   PR DETAIL PAGE
═══════════════════════════════════ */
const PRDetail = () => {
  const { id }          = useParams();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const [pr,      setPr]      = useState(null);
  const [prEdit,  setPrEdit]  = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [showConvertModal, setShowConvertModal] = useState(false);

  /* auto-open convert modal if navigated with ?tab=convert */
  useEffect(() => {
    if (searchParams.get("tab") === "convert" && pr?.status === "Approved" && !pr?.convertedToPO) {
      setShowConvertModal(true);
    }
  }, [searchParams, pr]);

  /* load PR */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${PR_API}/${id}`);
        setPr(res.data);
        setPrEdit({ ...res.data });
      } catch (err) {
        console.error(err);
        setError("Failed to load Purchase Requisition");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* save PR */
  const savePr = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${PR_API}/${id}`, prEdit);
      if (res.data.success) {
        setPr(res.data.data);
        setPrEdit({ ...res.data.data });
        setEditing(false);
        alert("Purchase Requisition Updated Successfully");
      }
    } catch (err) {
      alert("Update failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  /* item helpers */
  const updateItem = (index, field, value) => {
    const items = [...(prEdit.items || [])];
    items[index] = { ...items[index], [field]: value };
    setPrEdit((p) => ({ ...p, items }));
  };

  /* field renderers */
  const F = (field, type = "text") =>
    editing ? (
      <input
        type={type}
        className="pod-input"
        value={prEdit[field] ?? ""}
        onChange={(e) => setPrEdit((p) => ({ ...p, [field]: e.target.value }))}
      />
    ) : (
      <div className="pod-value">{pr?.[field] || "-"}</div>
    );

  const Sel = (field, opts) =>
    editing ? (
      <select
        className="pod-input"
        value={prEdit[field] ?? ""}
        onChange={(e) => setPrEdit((p) => ({ ...p, [field]: e.target.value }))}
      >
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <div className="pod-value">{pr?.[field] || "-"}</div>
    );

  const statusColor = (s) => {
    if (s === "Pending")         return { bg: "#fef3c7", fg: "#d97706" };
    if (s === "Approved")        return { bg: "#dcfce7", fg: "#16a34a" };
    if (s === "Converted to PO") return { bg: "#dbeafe", fg: "#2563eb" };
    if (s === "Closed")          return { bg: "#f1f5f9", fg: "#64748b" };
    if (s === "Cancelled")       return { bg: "#fee2e2", fg: "#dc2626" };
    return { bg: "#f1f5f9", fg: "#64748b" };
  };

  const priorityColor = (p) => {
    if (p === "High")   return { bg: "#fee2e2", fg: "#dc2626" };
    if (p === "Normal") return { bg: "#dbeafe", fg: "#2563eb" };
    if (p === "Low")    return { bg: "#dcfce7", fg: "#16a34a" };
    return { bg: "#f1f5f9", fg: "#64748b" };
  };

  if (loading) return (
    <div className="pod-page"><ModuleNavbar /><div className="pod-loading">Loading…</div></div>
  );
  if (error) return (
    <div className="pod-page"><ModuleNavbar /><div className="pod-error">{error}</div></div>
  );

  const sc = statusColor(pr?.status);
  const pc = priorityColor(pr?.priority);

  return (
    <div className="pod-page">
      <ModuleNavbar />

      {/* PAGE HEADER */}
      <div className="pod-header">
        <button className="pod-back-btn" onClick={() => navigate("/purchase-requisition")}>← Back</button>
        <div className="pod-header-title">
          <h2>Purchase Requisition Detail</h2>
          <span className="pod-pono-badge">{pr?.prNo}</span>
        </div>
        <div className="pod-header-meta" style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <span className="pod-status-pill" style={{ background: pc.bg, color: pc.fg }}>
            {pr?.priority}
          </span>
          <span className="pod-status-pill" style={{ background: sc.bg, color: sc.fg }}>
            {pr?.status}
          </span>
          {pr?.status === "Approved" && !pr?.convertedToPO && (
            <button
              className="pr-convert-btn"
              onClick={() => setShowConvertModal(true)}
            >
              ⚙️ Generate PO
            </button>
          )}
        </div>
      </div>

      {/* Converted PO banner */}
      {pr?.convertedToPO && (
        <div className="pr-converted-banner">
          ✅ This PR has been converted to PO <strong>{pr.convertedPONo}</strong> on{" "}
          {pr.convertedAt ? new Date(pr.convertedAt).toLocaleDateString("en-IN") : ""} by {pr.convertedBy}.
        </div>
      )}

      {/* ── PR INFORMATION ── */}
      <div className="pod-card">
        <div className="pod-card-header">
          <div className="pod-card-title">📋 PR Information</div>
          <div className="pod-card-actions">
            {editing ? (
              <>
                <button className="pod-cancel-btn" onClick={() => { setEditing(false); setPrEdit({ ...pr }); }} disabled={saving}>Cancel</button>
                <button className="pod-save-btn" onClick={savePr} disabled={saving}>{saving ? "Saving…" : "Save PR"}</button>
              </>
            ) : (
              <button className="pod-edit-btn" onClick={() => setEditing(true)}>Edit Details</button>
            )}
          </div>
        </div>

        <div className="pod-grid">
          <div className="pod-field">
            <div className="pod-label">PR No</div>
            <div className="pod-value pod-mono">{pr?.prNo || "-"}</div>
          </div>
          <div className="pod-field">
            <div className="pod-label">PR Date</div>
            {F("prDate", "date")}
          </div>
          <div className="pod-field">
            <div className="pod-label">Department</div>
            {Sel("department", DEPT_OPTIONS)}
          </div>
          <div className="pod-field">
            <div className="pod-label">Site</div>
            {F("site")}
          </div>
          <div className="pod-field">
            <div className="pod-label">Requested By</div>
            {F("requestedBy")}
          </div>
          <div className="pod-field">
            <div className="pod-label">Priority</div>
            {Sel("priority", PRIORITY_OPT)}
          </div>
          <div className="pod-field">
            <div className="pod-label">Required Date</div>
            {F("requiredDate", "date")}
          </div>
          <div className="pod-field">
            <div className="pod-label">Status</div>
            {Sel("status", STATUS_OPTIONS)}
          </div>
          <div className="pod-field pod-field-full">
            <div className="pod-label">Remarks</div>
            {editing ? (
              <textarea
                className="pod-textarea"
                value={prEdit.remarks ?? ""}
                onChange={(e) => setPrEdit((p) => ({ ...p, remarks: e.target.value }))}
                rows={3}
              />
            ) : (
              <div className="pod-value">{pr?.remarks || "-"}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── ITEMS ── */}
      <div className="pod-card">
        <div className="pod-card-header">
          <div className="pod-card-title">📦 Items</div>
        </div>
        <div className="pod-items-wrap">
          <table className="pod-items-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>UOM</th>
                <th>Required Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(editing ? prEdit.items : pr?.items)?.length > 0 ? (
                (editing ? prEdit.items : pr?.items).map((item, i) => (
                  <tr key={i}>
                    <td>{item.sNo ?? i + 1}</td>
                    <td>
                      {editing
                        ? <input className="pod-item-input" value={item.itemCode || ""}
                            onChange={(e) => updateItem(i, "itemCode", e.target.value)} />
                        : item.itemCode || "-"}
                    </td>
                    <td>
                      {editing
                        ? <input className="pod-item-input" value={item.itemName || ""}
                            onChange={(e) => updateItem(i, "itemName", e.target.value)} />
                        : item.itemName || "-"}
                    </td>
                    <td>
                      {editing
                        ? <input className="pod-item-input" value={item.itemCategory || ""}
                            onChange={(e) => updateItem(i, "itemCategory", e.target.value)} />
                        : item.itemCategory || "-"}
                    </td>
                    <td>
                      {editing
                        ? <input className="pod-item-input" value={item.uom || ""}
                            onChange={(e) => updateItem(i, "uom", e.target.value)} />
                        : item.uom || "-"}
                    </td>
                    <td>
                      {editing
                        ? <input type="number" className="pod-item-input" value={item.requiredQty ?? ""}
                            onChange={(e) => updateItem(i, "requiredQty", e.target.value)} />
                        : item.requiredQty ?? "-"}
                    </td>
                    <td>
                      {editing
                        ? <input className="pod-item-input" value={item.remarks || ""}
                            onChange={(e) => updateItem(i, "remarks", e.target.value)} />
                        : item.remarks || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="pod-no-items">No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── APPROVAL HISTORY ── */}
      <div className="pod-card">
        <div className="pod-card-header">
          <div className="pod-card-title">📜 Approval History</div>
        </div>
        {pr?.approvalHistory?.length > 0 ? (
          <div className="pr-history-wrap">
            {pr.approvalHistory.map((h, i) => (
              <div key={i} className="pr-history-item">
                <div className="pr-history-dot" />
                <div className="pr-history-content">
                  <div className="pr-history-action">{h.action}</div>
                  <div className="pr-history-meta">
                    By <strong>{h.performedBy}</strong> on{" "}
                    {h.performedAt ? new Date(h.performedAt).toLocaleString("en-IN") : ""}
                  </div>
                  {h.remarks && <div className="pr-history-remarks">{h.remarks}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pod-no-items">No history available</div>
        )}
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <ConvertPOModal
          pr={pr}
          onClose={() => setShowConvertModal(false)}
          onConverted={(data) => {
            setShowConvertModal(false);
            setPr(data.pr);
            setPrEdit({ ...data.pr });
          }}
        />
      )}

    </div>
  );
};

export default PRDetail;