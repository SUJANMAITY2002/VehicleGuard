import React from "react";
import "./Procurement.css";
import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";


const Procurement = () => {
  return (
    <div className="module-page">
      <ModuleNavbar />
      <div className="module-header">
        <h1>🛒 Procurement Module</h1>
        <p>Manage purchasing and vendor operations</p>
      </div>

      <div className="module-grid">

        <div className="module-card">
          <span>📋</span>
          <h3>Purchase Orders</h3>
        </div>

        <div className="module-card">
          <span>🏢</span>
          <h3>Vendors</h3>
        </div>

        <div className="module-card">
          <span>📦</span>
          <h3>Material Requests</h3>
        </div>

      </div>

    </div>
  );
};

export default Procurement;