import React from "react";
import "./Production.css";
import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";



const Production = () => {
  return (
    <div className="module-page">
      <ModuleNavbar />
      <div className="module-header">
        <h1>🏭 Production Module</h1>
        <p>Manage factory production workflow</p>
      </div>

      <div className="module-grid">

        <div className="module-card">
          <span>⚙️</span>
          <h3>Machines</h3>
        </div>

        <div className="module-card">
          <span>🧱</span>
          <h3>Raw Materials</h3>
        </div>

        <div className="module-card">
          <span>📈</span>
          <h3>Production Reports</h3>
        </div>

      </div>

    </div>
  );
};

export default Production;