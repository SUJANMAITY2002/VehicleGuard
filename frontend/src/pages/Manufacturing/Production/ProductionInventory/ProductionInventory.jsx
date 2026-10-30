import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./ProductionInventory.css";

const API = `${API_URL}/api/production-inventory`;

const ProductionInventory = () => {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API)
      .then((r) => setData(r.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    setLoading(true);
    axios.get(API)
      .then((r) => setData(r.data?.data))
      .finally(() => setLoading(false));
  };

  const StageCard = ({ icon, label, qty, unit, color, note }) => (
    <div className="inv-stage-card" style={{ borderTopColor: color }}>
      <div className="inv-stage-icon">{icon}</div>
      <div className="inv-stage-qty">{qty ?? "0"} <span className="inv-stage-unit">{unit}</span></div>
      <div className="inv-stage-label">{label}</div>
      {note && <div className="inv-stage-note">{note}</div>}
    </div>
  );

  return (
    <div className="inv-page">
      <ModuleNavbar />

      <div className="inv-hero">
        <div className="inv-hero-inner">
          <button className="inv-back-btn" onClick={() => navigate("/production")}>← Production</button>
          <div>
            <h2>Production Inventory</h2>
            <span className="inv-subtitle">Stage-wise stock: CCM → Rolling → Bundling</span>
          </div>
          <button className="inv-refresh-btn" onClick={refresh}>↻ Refresh</button>
        </div>
      </div>

      {loading && <div className="inv-loading">Calculating inventory…</div>}

      {!loading && data && (
        <div className="inv-body">

          {/* STAGE FLOW */}
          <div className="inv-section-title">🏭 Production Flow — Current Stock</div>
          <div className="inv-flow-row">
            <StageCard icon="🔥" label="CCM — Billet Stock"    qty={data.summary?.billetStock}   unit="MT" color="#ff6b35" note="Produced − Consumed by Rolling" />
            <div className="inv-flow-arrow">→</div>
            <StageCard icon="🏗️" label="Finished Goods (Loose)" qty={data.summary?.finishedGoods} unit="MT" color="#2563eb" note="Rolled − Bundled" />
            <div className="inv-flow-arrow">→</div>
            <StageCard icon="📦" label="Bundle Stock"           qty={data.summary?.bundleStock}   unit="KG" color="#16a34a" note="Ready to dispatch" />
          </div>

          {/* SCRAP / LOSS */}
          <div className="inv-section-title" style={{marginTop:28}}>♻️ By-Products & Losses</div>
          <div className="inv-byproduct-grid">
            <div className="inv-bp-card">
              <div className="inv-bp-icon">🗑️</div>
              <div className="inv-bp-val">{data.summary?.ccmScrap ?? "0"} MT</div>
              <div className="inv-bp-label">CCM Scrap</div>
            </div>
            <div className="inv-bp-card">
              <div className="inv-bp-icon">⚙️</div>
              <div className="inv-bp-val">{data.summary?.rollingScrap ?? "0"} MT</div>
              <div className="inv-bp-label">Rolling Mill Scale / Scrap</div>
            </div>
          </div>

          {/* PRODUCT-WISE BREAKDOWN */}
          {data.products?.length > 0 && (
            <>
              <div className="inv-section-title" style={{marginTop:28}}>📊 Product-wise Inventory</div>
              <div className="inv-table-card">
                <div className="inv-table-wrap">
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product Code</th>
                        <th>Product Name</th>
                        <th>Size</th>
                        <th>Rolling Qty (MT)</th>
                        <th>Bundled Qty (MT)</th>
                        <th>Loose Stock (MT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{p.productCode || "-"}</td>
                          <td><strong>{p.productName || "-"}</strong></td>
                          <td>{p.size || "-"}</td>
                          <td>{p.rollingQty}</td>
                          <td>{p.bundledQty}</td>
                          <td>
                            <span className={`inv-stock-badge ${p.looseStock > 0 ? "positive" : "zero"}`}>
                              {p.looseStock}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {data.products?.length === 0 && (
            <div className="inv-empty">No product-level data available yet. Create rolling production records to see the breakdown.</div>
          )}

        </div>
      )}

      {!loading && !data && (
        <div style={{textAlign:"center", padding:60, color:"#64748b"}}>
          Failed to load inventory. Check backend connection.
        </div>
      )}
    </div>
  );
};

export default ProductionInventory;