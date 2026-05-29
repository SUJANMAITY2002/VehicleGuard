import React from "react";
import { useNavigate } from "react-router-dom";
import "./Inventory.css";

import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";


const Inventory = () => {
const navigate = useNavigate();
  const inventoryCards = [
  {
    shortName: "GI",
    title: "Goods Inward Note",
    code: "M03GIN",
    theme: "purple",
    path: "/goods-inward-note",
  },
  {
    shortName: "GR",
    title: "Goods Receipt Note",
    code: "M03GRN",
    theme: "purple",
    path: "/goods-receipt-note",
  },
  {
    shortName: "DG",
    title: "Direct GRN",
    code: "M03DGRN",
    theme: "blue",
    path: "/direct-grn",
  },
  {
    shortName: "II",
    title: "Item Inventory",
    code: "M03II",
    theme: "blue",
    path: "/item-inventory",
  },
];

  return (
    <div className="inventory-main-container">

      <ModuleNavbar />

      {/* HEADER */}
      <div className="inventory-top-banner">

        <h1 className="inventory-page-title">
          Inventory
        </h1>

      </div>

      {/* CARD AREA */}
      <div className="inventory-card-wrapper">

        {inventoryCards.map((card, index) => (

          <div
            className="inventory-module-card"
            key={index}
            onClick={() => navigate(card.path)}
          >

            {/* LEFT */}
            <div className="inventory-module-left">

              <div
                className={`inventory-module-icon-circle ${card.theme}`}
              >
                {card.shortName}
              </div>

              <div className="inventory-module-details">

                <h3>
                  {card.title}
                </h3>

                <p>
                  Transaction
                </p>

              </div>

            </div>

            {/* RIGHT */}
            <div className="inventory-module-right">

              <span className="inventory-module-code">
                {card.code}
              </span>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
};

export default Inventory;