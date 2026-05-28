import React from "react";

import {
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./WeighBridgeLayout.css";

const WeighBridgeLayout = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const menuItems = [

    {
      title: "Gross Weight",
      path: "gross-weight",
      icon: "⚖️",
    },

    {
      title: "Tare Weight",
      path: "tare-weight",
      icon: "🚛",
    },

    {
      title: "Weight Slip",
      path: "weight-slip",
      icon: "📄",
    },

    {
      title: "Live Weight",
      path: "live-weight",
      icon: "🟢",
    },

    {
      title: "Pending Vehicle",
      path: "pending-vehicle",
      icon: "⏳",
    },

    {
      title: "Weight Reports",
      path: "weight-reports",
      icon: "📊",
    },

  ];

  return (

    <div className="layout">

      {/* SIDEBAR */}

      <div className="sidebar">

        <div className="logo-section">

          <h2>ERP SYSTEM</h2>

          <p>WeighBridge Module</p>

        </div>

        <div className="menu">

          {menuItems.map((item, index) => {

            const active =
              location.pathname ===
              `/weighbridge-module/${item.path}`;

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
                    `/weighbridge-module/${item.path}`,
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

export default WeighBridgeLayout;