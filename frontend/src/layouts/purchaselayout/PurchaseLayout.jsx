import React from "react";

import {
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./PurchaseLayout.css";

const PurchaseLayout = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const menuItems = [
    {
      title: "Create Purchase Order",
      path: "create-po",
      icon: "📝",
    },
    {
      title: "Purchase List",
      path: "purchase-list",
      icon: "📋",
    },
    {
      title: "Pending PO",
      path: "pending-po",
      icon: "⏳",
    },
    {
      title: "Approved PO",
      path: "approved-po",
      icon: "✅",
    },
    {
      title: "Vendor Management",
      path: "vendor-management",
      icon: "🏢",
    },
    {
      title: "Rate Chart",
      path: "rate-chart",
      icon: "📊",
    },
    {
      title: "Material Master",
      path: "material-master",
      icon: "📦",
    },
    {
      title: "Reports",
      path: "reports",
      icon: "📈",
    },
  ];

  return (
    <div className="layout">

      {/* SIDEBAR */}

      <div className="sidebar">

        <div className="logo-section">

          <h2>ERP SYSTEM</h2>

          <p>Purchase Module</p>

        </div>

        <div className="menu">

          {menuItems.map((item, index) => {

            const active =
              location.pathname ===
              `/purchase-module/${item.path}`;

            return (
              <div
                key={index}
                className={
                  active
                    ? "menu-item active"
                    : "menu-item"
                }
                onClick={() =>
                  navigate(item.path, {
                    replace: true,
                  })
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

      {/* RIGHT CONTENT */}

      <div className="content">

        <Outlet />

      </div>

    </div>
  );
};

export default PurchaseLayout;