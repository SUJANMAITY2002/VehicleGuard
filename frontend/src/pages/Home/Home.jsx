import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  const modules = [
  {
    number: "1",
    title: "Finance & Accounting",
    icon: "💳",
    path: "/finance-module",
  },
  {
    number: "2",
    title: "Manufacturing",
    icon: "🏗️",
    path: "/manufacturing",
  },
  {
    number: "3",
    title: "HRM",
    icon: "🧑‍💼",
    path: "/hrm-module",
  },
  {
    number: "4",
    title: "Reports",
    icon: "📈",
    path: "/reports-module",
  },
  {
    number: "5",
    title: "System Admin",
    icon: "🖥️",
    path: "/sys_admin",
  },
];

  return (
    <div className="home-container">
      <div className="overlay">

        <div className="top-bar">
          <h1 className="dashboard-title">Steel Manufacturing Solution</h1>
          <p className="dashboard-subtitle">
            Control & Manage All Operations
          </p>
        </div>

        <div className="card-grid">
          {modules.map((module, index) => (
            <div
              key={index}
              className="dashboard-card small-card"
              onClick={() => navigate(module.path)}
            >
              <div className="module-number">{module.number}</div>

              <div className="card-icon">{module.icon}</div>

              <h3>{module.title}</h3>

              <button className="open-btn">Open Module →</button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Home;