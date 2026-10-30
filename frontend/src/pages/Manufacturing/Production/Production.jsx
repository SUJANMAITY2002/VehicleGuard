import React from "react";
import { useNavigate } from "react-router-dom";
import "./Production.css";
import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";

const Production = () => {
  const navigate = useNavigate();

  const productionCards = [
    {
      shortName: "HE",
      title: "Heat",
      code: "M03HE",
      theme: "blue",
      path: "/heat",
    },
    {
      shortName: "CCM",
      title: "CCM Production",
      code: "M03CCM",
      theme: "purple",
      path: "/ccm-production",
    },
    {
      shortName: "RP",
      title: "Rolling Production",
      code: "M03RP",
      theme: "blue",
      path: "/rolling-production",
    },
    {
      shortName: "BP",
      title: "Bundling Production",
      code: "M03BP",
      theme: "purple",
      path: "/bundling-production",
    },
    {
      shortName: "PI",
      title: "Production Inventory",
      code: "M03PI",
      theme: "blue",
      path: "/production-inventory",
    },
    {
      shortName: "PR",
      title: "Production Reports",
      code: "M03PR",
      theme: "purple",
      path: "/production-reports",
    },
    {
      shortName: "PD",
      title: "Production Dashboard",
      code: "M03PD",
      theme: "blue",
      path: "/production-dashboard",
    },
  ];

  return (
    <div className="inventory-main-container">
      <ModuleNavbar />

      <div className="inventory-top-banner">
        <h1 className="inventory-page-title">Production</h1>
      </div>

      <div className="inventory-card-wrapper">
        {productionCards.map((card, index) => (
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

export default Production;