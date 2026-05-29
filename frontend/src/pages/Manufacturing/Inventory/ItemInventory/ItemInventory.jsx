import React from "react";
import "./ItemInventory.css";

import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

const ItemInventory = () => {
  return (
    <div className="inventory-subpage">

      <ModuleNavbar />

      <div className="inventory-subpage-content">

        <h1>Item Inventory</h1>

      </div>

    </div>
  );
};

export default ItemInventory;