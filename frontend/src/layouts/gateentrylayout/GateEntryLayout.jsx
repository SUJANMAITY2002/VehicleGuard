import React from "react";

import {
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./GateEntryLayout.css";

const GateEntryLayout = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const menuItems = [
    {
      title: "Vehicle IN",
      path: "vehicle-in",
      icon: "🚚",
    },
    {
      title: "Vehicle OUT",
      path: "vehicle-out",
      icon: "🚛",
    },
    {
      title: "Gate Pass",
      path: "gate-pass",
      icon: "📄",
    },
    {
      title: "Live Vehicle Status",
      path: "live-vehicle-status",
      icon: "🟢",
    },
    {
      title: "Security Log",
      path: "security-log",
      icon: "🔐",
    },
    {
      title: "Visitor Entry",
      path: "visitor-entry",
      icon: "👤",
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

          <p>Gate Entry Module</p>

        </div>

        <div className="menu">

          {menuItems.map((item, index) => {

            const active =
              location.pathname ===
              `/gate-entry-module/${item.path}`;

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
                    `/gate-entry-module/${item.path}`,
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

export default GateEntryLayout;