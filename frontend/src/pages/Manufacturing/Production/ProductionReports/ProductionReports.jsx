import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./ProductionReports.css";

const API = `${API_URL}/api/production-reports`;

const MODULES = [
  { key: "ccm",      label: "CCM Report",      icon: "🔥", desc: "Heat-wise, Shift-wise, Yield & Scrap" },
  { key: "rolling",  label: "Rolling Report",   icon: "🏗️", desc: "Product-wise, Size-wise, Mill-wise, Loss Analysis" },
  { key: "bundling", label: "Bundling Report",  icon: "📦", desc: "Bundle Register, Tag Report, Dispatch Ready Stock" },
];

const today    = new Date().toISOString().split("T")[0];
const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

const ProductionReports = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState("ccm");
  const [fromDate,  setFromDate]  = useState(monthAgo);
  const [toDate,    setToDate]    = useState(today);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);

  const fetchReport = async (mod = activeModule) => {
    setLoading(true); setData(null);
    try {
      const res = await axios.get(API, { params: { module: mod, fromDate, toDate } });
      setData(res.data);
    } catch { alert("Failed to fetch report"); }
    finally { setLoading(false); }
  };

  const switchModule = (mod) => {
    setActiveModule(mod);
    setData(null);
  };

  /* ── CCM Report render ── */
  const CCMReport = () => (
    <>
      {/* Totals */}
      <div className="rpt-totals-grid">
        {[
          { label: "Total Input (MT)",   val: data.totals?.totalInput },
          { label: "Total Billet (MT)",  val: data.totals?.totalBillet },
          { label: "Total Scrap (MT)",   val: data.totals?.totalScrap },
          { label: "Avg Yield %",        val: data.totals?.avgYield + "%" },
        ].map((t) => (
          <div className="rpt-total-card" key={t.label}>
            <div className="rpt-total-val">{t.val ?? "0"}</div>
            <div className="rpt-total-label">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Heat-wise */}
      <div className="rpt-sub-title">Heat-wise Production</div>
      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead><tr><th>#</th><th>Heat No</th><th>Input (MT)</th><th>Billet (MT)</th><th>Scrap (MT)</th><th>Avg Yield %</th><th>Heats</th></tr></thead>
          <tbody>
            {(data.heatWise || []).map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><strong>{r.heatNo || "-"}</strong></td>
                <td>{r.inputQty?.toFixed(3)}</td>
                <td>{r.billetQty?.toFixed(3)}</td>
                <td>{r.scrapQty?.toFixed(3)}</td>
                <td><span className={`rpt-yield-badge ${parseFloat(r.avgYield) >= 90 ? "good" : "warn"}`}>{r.avgYield}%</span></td>
                <td>{r.count}</td>
              </tr>
            ))}
            {!data.heatWise?.length && <tr><td colSpan={7} className="rpt-empty">No heat data in range</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Shift-wise */}
      <div className="rpt-sub-title" style={{marginTop:24}}>Shift-wise Production</div>
      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead><tr><th>#</th><th>Shift</th><th>Input (MT)</th><th>Billet (MT)</th><th>Scrap (MT)</th><th>Entries</th></tr></thead>
          <tbody>
            {(data.shiftWise || []).map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><strong>Shift {r.shift}</strong></td>
                <td>{r.inputQty?.toFixed(3)}</td>
                <td>{r.billetQty?.toFixed(3)}</td>
                <td>{r.scrapQty?.toFixed(3)}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  /* ── Rolling Report render ── */
  const RollingReport = () => (
    <>
      <div className="rpt-totals-grid">
        {[
          { label: "Total Input (MT)",  val: data.totals?.totalInput },
          { label: "Total Output (MT)", val: data.totals?.totalOutput },
          { label: "Avg Yield %",       val: data.totals?.avgYield + "%" },
        ].map((t) => (
          <div className="rpt-total-card" key={t.label}>
            <div className="rpt-total-val">{t.val ?? "0"}</div>
            <div className="rpt-total-label">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="rpt-sub-title">Product-wise Production</div>
      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead><tr><th>#</th><th>Product Name</th><th>Size</th><th>Qty (MT)</th></tr></thead>
          <tbody>
            {(data.productWise || []).map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><strong>{r.productName || "-"}</strong></td>
                <td>{r.size || "-"}</td>
                <td>{r.qty}</td>
              </tr>
            ))}
            {!data.productWise?.length && <tr><td colSpan={4} className="rpt-empty">No product data in range</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="rpt-sub-title" style={{marginTop:24}}>Mill-wise Production</div>
      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead><tr><th>#</th><th>Mill No</th><th>Input (MT)</th><th>Output (MT)</th><th>Entries</th></tr></thead>
          <tbody>
            {(data.millWise || []).map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><strong>{r.millNo || "-"}</strong></td>
                <td>{r.inputQty?.toFixed(3)}</td>
                <td>{r.outputQty?.toFixed(3)}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  /* ── Bundling Report render ── */
  const BundlingReport = () => (
    <>
      <div className="rpt-totals-grid">
        {[
          { label: "Total Bundles",       val: data.totals?.totalBundles },
          { label: "Total Weight (MT)",   val: data.totals?.totalWeight },
          { label: "Total Pieces",        val: data.totals?.totalPieces },
        ].map((t) => (
          <div className="rpt-total-card" key={t.label}>
            <div className="rpt-total-val">{t.val ?? "0"}</div>
            <div className="rpt-total-label">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="rpt-sub-title">Bundle Register</div>
      <div className="rpt-table-wrap">
        <table className="rpt-table">
          <thead><tr><th>#</th><th>Bundle Entry No</th><th>Date</th><th>Bundles</th><th>Weight (MT)</th><th>Pieces</th><th>Status</th></tr></thead>
          <tbody>
            {(data.records || []).map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><strong>{r.bundleEntryNo || "-"}</strong></td>
                <td>{r.bundleDate || "-"}</td>
                <td>{r.totalBundleCount || "-"}</td>
                <td>{r.totalBundleWt || "-"}</td>
                <td>{r.totalPieces || "-"}</td>
                <td><span className={`rpt-status ${(r.status || "").toLowerCase()}`}>{r.status || "-"}</span></td>
              </tr>
            ))}
            {!data.records?.length && <tr><td colSpan={7} className="rpt-empty">No bundling records in range</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="rpt-page">
      <ModuleNavbar />

      <div className="rpt-hero">
        <div className="rpt-hero-inner">
          <button className="rpt-back-btn" onClick={() => navigate("/production")}>← Production</button>
          <div>
            <h2>Production Reports</h2>
            <span className="rpt-subtitle">Analyse production by heat, shift, product, mill & bundling</span>
          </div>
        </div>
      </div>

      <div className="rpt-body">

        {/* MODULE TABS */}
        <div className="rpt-module-tabs">
          {MODULES.map((m) => (
            <button
              key={m.key}
              className={`rpt-module-tab ${activeModule === m.key ? "active" : ""}`}
              onClick={() => switchModule(m.key)}
            >
              {m.icon} {m.label}
              <span className="rpt-tab-desc">{m.desc}</span>
            </button>
          ))}
        </div>

        {/* DATE FILTER */}
        <div className="rpt-filter-card">
          <div className="rpt-filter-row">
            <div className="rpt-filter-field">
              <label>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="rpt-filter-field">
              <label>To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button className="rpt-run-btn" onClick={() => fetchReport(activeModule)}>
              {loading ? "Loading…" : "Generate Report"}
            </button>
          </div>
        </div>

        {/* REPORT OUTPUT */}
        {loading && <div className="rpt-loading">Generating report…</div>}
        {!loading && data && (
          <div className="rpt-output">
            <div className="rpt-output-title">
              {MODULES.find((m) => m.key === activeModule)?.icon}{" "}
              {MODULES.find((m) => m.key === activeModule)?.label}
              <span className="rpt-date-range"> · {fromDate} to {toDate}</span>
            </div>
            {activeModule === "ccm"      && <CCMReport />}
            {activeModule === "rolling"  && <RollingReport />}
            {activeModule === "bundling" && <BundlingReport />}
          </div>
        )}
        {!loading && !data && (
          <div className="rpt-prompt">Select a date range and click Generate Report</div>
        )}
      </div>
    </div>
  );
};

export default ProductionReports;