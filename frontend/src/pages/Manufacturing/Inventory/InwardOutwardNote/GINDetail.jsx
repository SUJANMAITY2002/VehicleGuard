import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./GINdetail.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

const GIN_API       = "http://localhost:5000/api/goods-inward-note";
const WEIGHMENT_API = "http://localhost:5000/api/weighment";

/* ─────────────────────────────────────────────────────────────
   GINDetail
   Opened from GoodsInwardNote by clicking the GIN No hyperlink.
   Shows full GIN information + all linked weighment data.
   Both sections are fully editable inline.
───────────────────────────────────────────────────────────── */
const GINDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gin,          setGin]          = useState(null);
  const [weighment,    setWeighment]    = useState(null);
  const [ginEdit,      setGinEdit]      = useState({});
  const [wEdit,        setWEdit]        = useState({});
  const [ginEditing,   setGinEditing]   = useState(false);
  const [wEditing,     setWEditing]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [savingGin,    setSavingGin]    = useState(false);
  const [savingW,      setSavingW]      = useState(false);
  const [error,        setError]        = useState("");

  /* ── load GIN ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ginRes = await axios.get(`${GIN_API}/${id}`);
        const ginData = ginRes.data;
        setGin(ginData);
        setGinEdit({ ...ginData });

        /* find linked weighment */
        if (ginData?.ginNo) {
          const wRes = await axios.get(WEIGHMENT_API, {
            params: { inwardOutwardNoteNo: ginData.ginNo }
          });
          const wList = wRes.data?.data || [];
          if (wList.length > 0) {
            setWeighment(wList[0]);
            setWEdit({ ...wList[0] });
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load record");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ── GIN save ── */
  const saveGin = async () => {
    setSavingGin(true);
    try {
      const res = await axios.put(`${GIN_API}/${id}`, ginEdit);
      if (res.data.success) {
        setGin(res.data.data);
        setGinEdit({ ...res.data.data });
        setGinEditing(false);
        alert("GIN Updated Successfully");
      }
    } catch (err) {
      console.error(err);
      alert("GIN update failed");
    } finally {
      setSavingGin(false);
    }
  };

  /* ── Weighment save ── */
  const saveWeighment = async () => {
    setSavingW(true);
    try {
      const res = await axios.put(`${WEIGHMENT_API}/${weighment._id}`, wEdit);
      if (res.data.success) {
        setWeighment(res.data.data);
        setWEdit({ ...res.data.data });
        setWEditing(false);
        alert("Weighment Updated Successfully");
      }
    } catch (err) {
      console.error(err);
      alert("Weighment update failed");
    } finally {
      setSavingW(false);
    }
  };

  /* net weight auto-calc for weighment edit */
  const handleWChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...wEdit, [name]: value };
    if (name === "firstWeight" || name === "secondWeight") {
      const f = parseFloat(name === "firstWeight"  ? value : wEdit.firstWeight  || 0) || 0;
      const s = parseFloat(name === "secondWeight" ? value : wEdit.secondWeight || 0) || 0;
      updated.netWeight = f > 0 && s > 0 ? String(Math.abs(f - s)) : "";
    }
    setWEdit(updated);
  };

  /* ── helpers: editable field ── */
  const ginF = (field, type = "text", readOnly = false) => (
    ginEditing && !readOnly
      ? <input type={type} className="gd-input" value={ginEdit[field] || ""}
          onChange={(e) => setGinEdit((p) => ({ ...p, [field]: e.target.value }))} />
      : <div className="gd-value">{gin?.[field] || "-"}</div>
  );

  const ginS = (field, opts) => (
    ginEditing
      ? <select className="gd-input" value={ginEdit[field] || ""}
          onChange={(e) => setGinEdit((p) => ({ ...p, [field]: e.target.value }))}>
          {opts.map((o) => <option key={o}>{o}</option>)}
        </select>
      : <div className="gd-value">{gin?.[field] || "-"}</div>
  );

  const wF = (field, type = "text", readOnly = false) => (
    wEditing && !readOnly
      ? <input type={type} className="gd-input" value={wEdit[field] || ""}
          onChange={handleWChange} name={field} />
      : <div className="gd-value">{weighment?.[field] || "-"}</div>
  );

  const wS = (field, opts) => (
    wEditing
      ? <select className="gd-input" value={wEdit[field] || ""}
          onChange={(e) => setWEdit((p) => ({ ...p, [field]: e.target.value }))} name={field}>
          {opts.map((o) => <option key={o} value={o}>{o || "Select"}</option>)}
        </select>
      : <div className="gd-value">{weighment?.[field] || "-"}</div>
  );

  if (loading) return (
    <div className="gd-page"><ModuleNavbar /><div className="gd-loading">Loading...</div></div>
  );
  if (error) return (
    <div className="gd-page"><ModuleNavbar /><div className="gd-error">{error}</div></div>
  );

  return (
    <div className="gd-page">
      <ModuleNavbar />

      {/* ── PAGE HEADER ── */}
      <div className="gd-header">
        <button
          className="gd-back-btn"
          onClick={() => navigate("/inward-outward-note")}
        >
          ← Back
        </button>
        <div className="gd-header-title">
          <h2>Inward outward Detail</h2>
          <span className="gd-gin-no-badge">{gin?.ginNo}</span>
        </div>
        <div className="gd-header-meta">
          <span className={`gd-status-pill ${(gin?.status || "").toLowerCase()}`}>{gin?.status || "-"}</span>
          <span className={`gd-entry-pill ${(gin?.vehicleEntry || "").toLowerCase()}`}>{gin?.vehicleEntry || "-"}</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          SECTION 1 — GIN INFORMATION
      ════════════════════════════════════════════════ */}
      <div className="gd-card">
        <div className="gd-card-header">
          <div className="gd-card-title">📋 GIN Information</div>
          <div className="gd-card-actions">
            {ginEditing ? (
              <>
                <button className="gd-cancel-btn" onClick={() => { setGinEditing(false); setGinEdit({ ...gin }); }} disabled={savingGin}>
                  Cancel
                </button>
                <button className="gd-save-btn" onClick={saveGin} disabled={savingGin}>
                  {savingGin ? "Saving..." : "Save GIN"}
                </button>
              </>
            ) : (
              <button className="gd-edit-btn" onClick={() => setGinEditing(true)}>Edit Details</button>
            )}
          </div>
        </div>

        <div className="gd-grid">

          <div className="gd-field">
            <div className="gd-label">GIN No</div>
            <div className="gd-value gd-readonly">{gin?.ginNo || "-"}</div>
          </div>

          <div className="gd-field">
            <div className="gd-label">GIN Date</div>
            {ginF("ginDate", "date")}
          </div>

          <div className="gd-field">
            <div className="gd-label">PO/CPO No</div>
            {ginF("poCpoNo")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Transaction Category</div>
            {ginF("transactionCategory")}
          </div>

          <div className="gd-field">
            <div className="gd-label">GIN Description</div>
            {ginF("ginDescription")}
          </div>

          <div className="gd-field">
            <div className="gd-label">GIN Type</div>
            {ginS("ginType", ["Domestic", "International"])}
          </div>

          <div className="gd-field">
            <div className="gd-label">Delivery Mode</div>
            {ginS("deliveryMode", ["By Road", "By Train", "By Air", "By Sea"])}
          </div>

          <div className="gd-field">
            <div className="gd-label">Status</div>
            {ginS("status", ["Open", "Closed"])}
          </div>

          <div className="gd-field">
            <div className="gd-label">Site</div>
            {ginF("site")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Vehicle Entry</div>
            {ginS("vehicleEntry", ["Inward", "Outward"])}
          </div>

          <div className="gd-field">
            <div className="gd-label">Vehicle No</div>
            {ginF("vehicleNo")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Vendor Code</div>
            {ginF("vendorCode")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Vendor Name</div>
            {ginF("vendorName")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Manufacturer Code</div>
            {ginF("manufacturerCode")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Manufacturer Name</div>
            {ginF("manufacturerName")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Manufacturer Address</div>
            {ginF("manufacturerAddress")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Challan/Invoice No</div>
            {ginF("challanInvoiceNo")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Challan Date</div>
            {ginF("challanDate", "date")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Bill No</div>
            {ginF("billNo")}
          </div>

          <div className="gd-field">
            <div className="gd-label">Bill Date</div>
            {ginF("billDate", "date")}
          </div>

          <div className="gd-field">
            <div className="gd-label">E-Way Date</div>
            {ginF("ewayDate", "date")}
          </div>

        </div>

        {/* Remarks full-width */}
        <div className="gd-fullrow">
          <div className="gd-label">Remarks</div>
          {ginEditing
            ? <textarea className="gd-textarea" value={ginEdit.remarks || ""}
                onChange={(e) => setGinEdit((p) => ({ ...p, remarks: e.target.value }))} rows={3} />
            : <div className="gd-value">{gin?.remarks || "-"}</div>
          }
        </div>

      </div>

      {/* ════════════════════════════════════════════════
          SECTION 2 — LINKED WEIGHMENT
      ════════════════════════════════════════════════ */}
      <div className="gd-card">
        <div className="gd-card-header">
          <div className="gd-card-title">⚖️ Linked Weighment</div>
          <div className="gd-card-actions">
            {weighment ? null : (
              <div className="gd-no-weighment">
                No weighment linked.
                <button className="gd-create-w-btn"
                  onClick={() => navigate(
                    gin?.vehicleEntry === "Outward"
                      ? "/create-outward-weighment"
                      : "/create-inward-weighment"
                  )}>
                  + Create Weighment
                </button>
              </div>
            )}
          </div>
        </div>

        {weighment ? (
          <>
            <div className="gd-grid">

              <div className="gd-field">
                <div className="gd-label">Weighment No</div>
                {wF("weighmentNo")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Transaction Category</div>
                {wS("transactionCategory", ["", "Purchase", "Sales"])}
              </div>

              <div className="gd-field">
                <div className="gd-label">Transaction Type</div>
                {wS("transactionType", ["", "Inward", "Outward"])}
              </div>

              <div className="gd-field">
                <div className="gd-label">Status</div>
                {wS("status", ["Open", "Closed"])}
              </div>

              <div className="gd-field">
                <div className="gd-label">Inward/Outward Note No</div>
                {wF("inwardOutwardNoteNo")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Vehicle No</div>
                {wF("vehicleNo")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Party Name</div>
                {wF("partyName")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Transporter Name</div>
                {wF("transporterName")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Site</div>
                {wF("site")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Weighment Date</div>
                {wF("weighmentDate", "date")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Weighment In Date</div>
                {wF("weighmentInDate", "date")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Weighment In Time</div>
                {wF("weighmentInTime", "time")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Weighment Out Date</div>
                {wF("weighmentOutDate", "date")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Weighment Out Time</div>
                {wF("weighmentOutTime", "time")}
              </div>

              <div className="gd-field gd-weight-field">
                <div className="gd-label">First Weight (MT)</div>
                {wEditing
                  ? <input type="number" step="0.001" name="firstWeight"
                      className="gd-input gd-weight-input" value={wEdit.firstWeight || ""}
                      onChange={handleWChange} />
                  : <div className="gd-value gd-weight-val">{weighment?.firstWeight || "-"}</div>
                }
              </div>

              <div className="gd-field gd-weight-field">
                <div className="gd-label">Second Weight (MT)</div>
                {wEditing
                  ? <input type="number" step="0.001" name="secondWeight"
                      className="gd-input gd-weight-input" value={wEdit.secondWeight || ""}
                      onChange={handleWChange} />
                  : <div className="gd-value gd-weight-val">{weighment?.secondWeight || "-"}</div>
                }
              </div>

              <div className="gd-field gd-weight-field">
                <div className="gd-label">Net Weight (MT)</div>
                {wEditing
                  ? <input readOnly className="gd-input gd-net-weight" value={wEdit.netWeight || ""} />
                  : <div className="gd-value gd-net-val">{weighment?.netWeight || "-"}</div>
                }
              </div>

              <div className="gd-field">
                <div className="gd-label">Supplier Invoice No</div>
                {wF("supplierInvoiceNo")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Supplier Invoice Date</div>
                {wF("supplierInvoiceDate", "date")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Bill No</div>
                {wF("billNo")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Bill Date</div>
                {wF("billDate", "date")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Total Dispatch Weight</div>
                {wF("totalDispatchWeight")}
              </div>

              <div className="gd-field">
                <div className="gd-label">Transit Date</div>
                {wF("transitDate", "date")}
              </div>

            </div>

            {/* Items grid */}
            {weighment?.items?.length > 0 && (
              <div className="gd-items-section">
                <div className="gd-items-title">⚖️ Weighment Items</div>
                <div className="gd-items-wrap">
                  <table className="gd-items-table">
                    <thead>
                      <tr>
                        <th>S No</th>
                        <th>First Weight (MT)</th>
                        <th>Second Weight (MT)</th>
                        <th>Net Weight (MT)</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weighment.items.map((item, i) => (
                        <tr key={i}>
                          <td>{item.sNo ?? i + 1}</td>
                          <td>
                            {wEditing
                              ? <input type="number" step="0.001" className="gd-item-input"
                                  value={wEdit.items?.[i]?.firstWeight || ""}
                                  onChange={(e) => {
                                    const items = [...(wEdit.items || [])];
                                    const row = { ...items[i], firstWeight: e.target.value };
                                    const f = parseFloat(e.target.value) || 0;
                                    const s = parseFloat(row.secondWeight || 0) || 0;
                                    row.netWeight = f > 0 && s > 0 ? String(Math.abs(f - s)) : "";
                                    items[i] = row;
                                    setWEdit((p) => ({ ...p, items }));
                                  }} />
                              : item.firstWeight || "-"}
                          </td>
                          <td>
                            {wEditing
                              ? <input type="number" step="0.001" className="gd-item-input"
                                  value={wEdit.items?.[i]?.secondWeight || ""}
                                  onChange={(e) => {
                                    const items = [...(wEdit.items || [])];
                                    const row = { ...items[i], secondWeight: e.target.value };
                                    const f = parseFloat(row.firstWeight || 0) || 0;
                                    const s = parseFloat(e.target.value) || 0;
                                    row.netWeight = f > 0 && s > 0 ? String(Math.abs(f - s)) : "";
                                    items[i] = row;
                                    setWEdit((p) => ({ ...p, items }));
                                  }} />
                              : item.secondWeight || "-"}
                          </td>
                          <td>
                            <div className={`gd-net-val${wEditing ? " editing" : ""}`}>
                              {wEditing ? wEdit.items?.[i]?.netWeight || "-" : item.netWeight || "-"}
                            </div>
                          </td>
                          <td>
                            {wEditing
                              ? <input type="text" className="gd-item-input"
                                  value={wEdit.items?.[i]?.remarks || ""}
                                  onChange={(e) => {
                                    const items = [...(wEdit.items || [])];
                                    items[i] = { ...items[i], remarks: e.target.value };
                                    setWEdit((p) => ({ ...p, items }));
                                  }} />
                              : item.remarks || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Remarks */}
            <div className="gd-fullrow" style={{ marginTop: 16 }}>
              <div className="gd-label">Remarks</div>
              {wEditing
                ? <textarea className="gd-textarea" name="remarks" value={wEdit.remarks || ""}
                    onChange={(e) => setWEdit((p) => ({ ...p, remarks: e.target.value }))} rows={3} />
                : <div className="gd-value">{weighment?.remarks || "-"}</div>
              }
            </div>

          </>
        ) : (
          <div className="gd-no-weighment-body">
            No weighment record linked to this GIN yet.
          </div>
        )}

      </div>

    </div>
  );
};

export default GINDetail;
