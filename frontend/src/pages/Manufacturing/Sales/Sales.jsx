import React from "react";
import { useNavigate } from "react-router-dom";
import "./Sales.css";

import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";

/*
  SALES MODULE — landing page
  ────────────────────────────
  Same card-grid pattern as Inventory.jsx. Each card is one step in the
  Sales chain (Sauda → Demand → Production Request → ... → Invoice).

  Only steps that have a real page built get a `path` + are clickable.
  Everything else shows a "Soon" badge and is disabled until that step
  is built (built incrementally, step by step).
*/

const Sales = () => {
  const navigate = useNavigate();

  const salesCards = [
    {
      shortName: "SD",
      title: "Sauda",
      code: "M04SD",
      theme: "purple",
      path: "/sauda-search",
    },
    {
      shortName: "DE",
      title: "Demand Entry",
      code: "M04DE",
      theme: "blue",
      path: "/demand-search",
    },
    {
      shortName: "PR",
      title: "Production Request",
      code: "M04PR",
      theme: "teal",
      path: "/production-request-search",
    },
    // {
    //   shortName: "PP",
    //   title: "Production Planning",
    //   code: "M04PP",
    //   theme: "teal",
    //   path: null, // Step 4
    // },
    {
      shortName: "FD",
      title: "Final Dispatch List",
      code: "M04FD",
      theme: "orange",
      path: "/dispatch-search",
    },
    {
      shortName: "VO",
      title: "Vehicle Outward",
      code: "M04VO",
      theme: "orange",
      path: "/vehicle-outward-search",
    },
    {
      shortName: "WT",
      title: "Weighment",
      code: "M04WT",
      theme: "blue",
      path: "/vehicle-outward-weighment-search",
    },
    {
      shortName: "IV",
      title: "Invoice",
      code: "M04IV",
      theme: "green",
      path: null, // Step 8
    },
  ];

  const handleCardClick = (card) => {
    if (!card.path) return; // disabled — not built yet
    navigate(card.path);
  };

  return (
    <div className="sales-main-container">

      <ModuleNavbar />

      {/* HEADER */}
      <div className="sales-top-banner">
        <h1 className="sales-page-title">Sales</h1>
      </div>

      {/* CARD AREA */}
      <div className="sales-card-wrapper">

        {salesCards.map((card, index) => (
          <div
            className={`sales-module-card ${!card.path ? "disabled" : ""}`}
            key={index}
            onClick={() => handleCardClick(card)}
          >

            {/* LEFT */}
            <div className="sales-module-left">
              <div className={`sales-module-icon-circle ${card.theme}`}>
                {card.shortName}
              </div>

              <div className="sales-module-details">
                <h3>{card.title}</h3>
                <p>Transaction</p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="sales-module-right">
              {!card.path && <span className="sales-module-soon">Soon</span>}
              <span className="sales-module-code">{card.code}</span>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default Sales;