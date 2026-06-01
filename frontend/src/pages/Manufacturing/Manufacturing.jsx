import React from "react";
import { useNavigate } from "react-router-dom";
import "./Manufacturing.css";

const Manufacturing = () => {

  const navigate = useNavigate();

  const modules = [
  {
    number: "1",
    title: "Procurement",
    icon: "🛒",
    path: "/procurement",
  },
  {
    number: "2",
    title: "Inventory",
    icon: "📦",
    path: "/inventory",
  },
  {
    number: "3",
    title: "Production",
    icon: "🏭",
    path: "/production",
  },
  {
    number: "4",
    title: "Sales",
    icon: "💹",
    path: "/salesContractForm",
  },
  {
    number: "5",
    title: "Masters",
    icon: "🛠️",
    path: "/masters",
  },
];

  return (
    <div className="manufacturing-container">

      {/* TOP NAVBAR */}
      <div className="top-navbar">

        <div className="top-left">
          <h1>Manufacturing</h1>
        </div>

        <div className="top-right">
          <span>🔍</span>
          <span>⤴</span>
          <span>⚙️</span>
        </div>

      </div>

      {/* CARD SECTION */}
      <div className="card-section">

        {modules.map((module, index) => (
          <div
            className="sap-card"
            key={index}
            onClick={() => navigate(module.path)}
          >

            <div className="card-left">

              <div className="circle-icon">
                {module.number}
              </div>

              <div className="card-text">
                <h3>{module.title}</h3>
                <p>Module</p>
              </div>

            </div>

            <div className="card-right">
              <div className="module-icon">
                {module.icon}
              </div>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default Manufacturing;