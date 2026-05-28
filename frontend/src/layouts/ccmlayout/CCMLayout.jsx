import React from "react";

import {
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./CCMLayout.css";

const CCMLayout = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const menuItems = [

    {
      title: "Heat Entry",
      path: "heat-entry",
      icon: "🔥",
    },

    {
      title: "Billet Production",
      path: "billet-production",
      icon: "🏭",
    },

    {
      title: "Shift Production",
      path: "shift-production",
      icon: "⏰",
    },

    {
      title: "Machine Status",
      path: "machine-status",
      icon: "⚙️",
    },

    {
      title: "Production Reports",
      path: "production-reports",
      icon: "📊",
    },

    {
      title: "Downtime Reports",
      path: "downtime-reports",
      icon: "📉",
    },

  ];

  return (

    <div className="layout">

      {/* SIDEBAR */}

      <div className="sidebar">

        <div className="logo-section">

          <h2>ERP SYSTEM</h2>

          <p>CCM Production Module</p>

        </div>

        <div className="menu">

          {menuItems.map((item, index) => {

            const active =
              location.pathname ===
              `/ccm-production-module/${item.path}`;

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
                    `/ccm-production-module/${item.path}`,
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

export default CCMLayout;