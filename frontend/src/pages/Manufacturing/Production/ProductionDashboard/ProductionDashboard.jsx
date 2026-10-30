import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./ProductionDashboard.css";

const API = `${API_URL}/api/production-dashboard`;

const ProductionDashboard = () => {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API)
      .then((r) => setData(r.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const KPI = ({ icon, label, value, unit, color, sub }) => (
    <div className="dash-kpi" style={{ borderLeftColor: color }}>
      <div className="dash-kpi-icon">{icon}</div>
      <div>
        <div className="dash-kpi-val">{value ?? "-"} <span className="dash-kpi-unit">{unit}</span></div>
        <div className="dash-kpi-label">{label}</div>
        {sub && <div className="dash-kpi-sub">{sub}</div>}
      </div>
    </div>
  );

  return (
    <div className="dash-page">
      <ModuleNavbar />

      <div className="dash-hero">
        <div className="dash-hero-inner">
          <button className="dash-back-btn" onClick={() => navigate("/production")}>← Production</button>
          <div>
            <h2>Production Dashboard</h2>
            <span className="dash-subtitle">Live KPIs — {data?.today || "Today"}</span>
          </div>
          <button className="dash-refresh-btn" onClick={() => { setLoading(true); axios.get(API).then((r) => setData(r.data?.data)).finally(() => setLoading(false)); }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading && <div className="dash-loading">Loading dashboard…</div>}

      {!loading && data && (
        <div className="dash-body">

          {/* TODAY'S SECTION */}
          <div className="dash-section-title">📅 Today's Production</div>
          <div className="dash-kpi-grid">
            <KPI icon="🔥" label="CCM Production"     value={data.ccm?.qty}        unit="MT"  color="#ff6b35" sub={`Yield: ${data.ccm?.yield}%`} />
            <KPI icon="🏗️" label="Rolling Production"  value={data.rolling?.qty}    unit="MT"  color="#2563eb" sub={`Yield: ${data.rolling?.yield}%`} />
            <KPI icon="📦" label="Bundles Created"      value={data.bundling?.count} unit="nos" color="#16a34a" sub={`Weight: ${data.bundling?.weight} MT`} />
            <KPI icon="♻️" label="CCM Scrap Generated"  value={data.ccm?.scrap}      unit="MT"  color="#ef4444" />
          </div>

          {/* OVERALL KPIs */}
          <div className="dash-section-title" style={{marginTop:28}}>📊 Overall Performance</div>
          <div className="dash-kpi-grid">
            <KPI icon="📈" label="Avg CCM Yield"       value={data.overall?.avgYield}  unit="%" color="#7c3aed" />
            <KPI icon="🗑️" label="Total Scrap (All)"   value={data.overall?.totalScrap} unit="MT" color="#f59e0b" />
            <KPI icon="⏳" label="CCM Pending"         value={data.ccm?.pending}        unit="entries" color="#0891b2" />
            <KPI icon="⏳" label="Rolling Pending"     value={data.rolling?.pending}    unit="entries" color="#d97706" />
          </div>

          {/* QUICK LINKS */}
          <div className="dash-section-title" style={{marginTop:28}}>⚡ Quick Actions</div>
          <div className="dash-quick-grid">
            {[
              { label: "Create CCM Entry",      route: "/create-ccm-production",      icon: "🔥" },
              { label: "Create Rolling Entry",   route: "/create-rolling-production",  icon: "🏗️" },
              { label: "Create Bundle Entry",    route: "/create-bundling-production", icon: "📦" },
              { label: "View CCM Records",       route: "/ccm-production",             icon: "📋" },
              { label: "View Rolling Records",   route: "/rolling-production",         icon: "📋" },
              { label: "Production Inventory",   route: "/production-inventory",       icon: "📊" },
              { label: "Production Reports",     route: "/production-reports",         icon: "📈" },
            ].map((q) => (
              <button key={q.route} className="dash-quick-btn" onClick={() => navigate(q.route)}>
                {q.icon} {q.label}
              </button>
            ))}
          </div>

        </div>
      )}

      {!loading && !data && (
        <div style={{textAlign:"center", padding:60, color:"#64748b"}}>
          Failed to load dashboard. Check backend connection.
        </div>
      )}
    </div>
  );
};

export default ProductionDashboard;