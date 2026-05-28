import React from "react";

import {
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import "./QualityLayout.css";

const QualityLayout = () => {

  const navigate = useNavigate();

  const location = useLocation();

  const menuItems = [

    {
      title: "Incoming QC",
      path: "incoming-qc",
      icon: "📥",
    },

    {
      title: "Grade Check",
      path: "grade-check",
      icon: "✅",
    },

    {
      title: "Lab Report",
      path: "lab-report",
      icon: "🧪",
    },

    {
      title: "QC Approval",
      path: "qc-approval",
      icon: "✔️",
    },

    {
      title: "Rejected Material",
      path: "rejected-material",
      icon: "❌",
    },

    {
      title: "QC Reports",
      path: "qc-reports",
      icon: "📊",
    },

  ];

  return (

    <div className="layout">

      {/* SIDEBAR */}

      <div className="sidebar">

        <div className="logo-section">

          <h2>ERP SYSTEM</h2>

          <p>Quality Check Module</p>

        </div>

        <div className="menu">

          {menuItems.map((item, index) => {

            const active =
              location.pathname ===
              `/quality-module/${item.path}`;

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
                    `/quality-module/${item.path}`,
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

export default QualityLayout;