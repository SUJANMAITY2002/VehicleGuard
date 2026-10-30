import React from "react";
import { useNavigate } from "react-router-dom";
import "./Procurement.css";
import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";

const Procurement = () => {
  const navigate = useNavigate();

  const procurementCards = [
    // {
    //   shortName: "RQ",
    //   title: "Purchase Requisition",
    //   code: "M02REQ",
    //   theme: "purple",
    //   path: "/purchase-requisition",
    // },
    {
      shortName: "PO",
      title: "Purchase Order",
      code: "M02PO",
      theme: "blue",
      path: "/purchase-order",
    },
  ];

  return (
    <div className="inventory-main-container">
      <ModuleNavbar />

      <div className="inventory-top-banner">
        <h1 className="inventory-page-title">Procurement</h1>
      </div>

      <div className="inventory-card-wrapper">
        {procurementCards.map((card, index) => (
          <div
            className="inventory-module-card"
            key={index}
            onClick={() => navigate(card.path)}
          >
            <div className="inventory-module-left">
              <div className={`inventory-module-icon-circle ${card.theme}`}>
                {card.shortName}
              </div>
              <div className="inventory-module-details">
                <h3>{card.title}</h3>
                <p>Transaction</p>
              </div>
            </div>
            <div className="inventory-module-right">
              <span className="inventory-module-code">{card.code}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Procurement;
