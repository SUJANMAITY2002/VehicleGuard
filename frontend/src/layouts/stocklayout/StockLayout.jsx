import React from "react";

import {
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./StockLayout.css";

const StockLayout = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const menuItems = [

    {
      title: "Create GRN",
      path: "create-grn",
      icon: "📝",
    },

    {
      title: "Stock In",
      path: "stock-in",
      icon: "📦",
    },

    {
      title: "Warehouse",
      path: "warehouse",
      icon: "🏭",
    },

    {
      title: "Inventory",
      path: "inventory",
      icon: "📋",
    },

    {
      title: "Stock Transfer",
      path: "stock-transfer",
      icon: "🔄",
    },

    {
      title: "Low Stock Alert",
      path: "low-stock-alert",
      icon: "⚠️",
    },

    {
      title: "GRN Reports",
      path: "grn-reports",
      icon: "📊",
    },

  ];

  return (

    <div className="layout">

      {/* SIDEBAR */}

      <div className="sidebar">

        <div className="logo-section">

          <h2>ERP SYSTEM</h2>

          <p>GRN & Stock Module</p>

        </div>

        <div className="menu">

          {menuItems.map((item, index) => {

            const active =
              location.pathname ===
              `/grn-stock-module/${item.path}`;

            return (

              <div
                key={index}
                className={
                  active
                    ? "menu-item active"
                    : "menu-item"
                }
                onClick={() =>
                  navigate(
                    `/grn-stock-module/${item.path}`,
                    { replace: true }
                  )
                }
              >

                <span className="menu-icon">
                  {item.icon}
                </span>

                <span>
                  {item.title}
                </span>

              </div>

            );
          })}

        </div>

      </div>

      {/* CONTENT */}

      <div className="content">

        <Outlet />

      </div>

    </div>

  );
};

export default StockLayout;