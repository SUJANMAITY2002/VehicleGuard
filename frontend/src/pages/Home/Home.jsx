import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  const modules = [
    {
      number: "1",
      title: "PURCHASE MODULE",
      icon: "🛒",
      path: "/purchase-module",
    },
    {
      number: "2",
      title: "Vehicle Gate Entry",
      icon: "🚚",
      path: "/gate-entry-module",
    },
    {
      number: "3",
      title: "Weigh Bridge",
      icon: "⚖️",
      path: "/weighbridge-module",
    },
    {
      number: "4",
      title: "Quality",
      icon: "✅",
      path: "/quality-module",
    },
    {
      number: "5",
      title: "GRN & STOCK MODULE",
      icon: "📦",
      path: "/grn-stock-module",
    },
    {
      number: "6",
      title: "CCM O/P",
      icon: "🏭",
      path: "/ccm-production-module",
    },
    {
      number: "7",
      title: "Rolling O/P",
      icon: "🔄",
      path: "/rolling-op",
    },
    {
      number: "8",
      title: "Sales Order",
      icon: "📝",
      path: "/sales-order",
    },
    {
      number: "9",
      title: "Sales Shipment",
      icon: "🚛",
      path: "/sales-shipment",
    },
    {
      number: "10",
      title: "Sales Invoice",
      icon: "🧾",
      path: "/sales-invoice",
    },
    {
      number: "11",
      title: "Fund Management",
      icon: "💰",
      path: "/fund-management",
    },
    {
      number: "12",
      title: "Reports",
      icon: "📊",
      path: "/reports",
    },
    {
      number: "13",
      title: "MASTERS MODULE",
      icon: "⚙️",
      path: "/masters-module",
    },
  ];

  return (
    <div className="home-container">
      <div className="overlay">

        <div className="top-bar">
          <h1 className="dashboard-title">
            ERP MANAGEMENT SYSTEM
          </h1>

          <p className="dashboard-subtitle">
            Control & Manage All Operations
          </p>
        </div>

        <div className="card-grid">
          {modules.map((module, index) => (
            <div
              key={index}
              className="dashboard-card"
              onClick={() => navigate(module.path)}
            >
              <div className="module-number">
                {module.number}
              </div>

              <div className="card-icon">
                {module.icon}
              </div>

              <h3>{module.title}</h3>

              <button className="open-btn">
                Open Module →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;