import React from "react";
import "./Sales.css";
import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";


const Sales = () => {
  return (
    <div className="module-page">
      <ModuleNavbar />
      <div className="module-header">
        <h1>💹 Sales Module</h1>
        <p>Manage customer sales and invoices</p>
      </div>

      <div className="module-grid">

        <div className="module-card">
          <span>🧾</span>
          <h3>Invoices</h3>
        </div>

        <div className="module-card">
          <span>👥</span>
          <h3>Customers</h3>
        </div>

        <div className="module-card">
          <span>🚚</span>
          <h3>Deliveries</h3>
        </div>

      </div>

    </div>
  );
};

export default Sales;