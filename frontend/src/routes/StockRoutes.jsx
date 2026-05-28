import React from "react";

import {
  Route,
  Navigate,
} from "react-router-dom";

import StockLayout
from "../layouts/stocklayout/StockLayout";

import CreateGRN
from "../pages/Stock/CreateGRN";

import StockIn
from "../pages/Stock/StockIn";

import Warehouse
from "../pages/Stock/Warehouse";

import Inventory
from "../pages/Stock/Inventory";

import StockTransfer
from "../pages/Stock/StockTransfer";

import LowStockAlert
from "../pages/Stock/LowStockAlert";

import GRNReports
from "../pages/Stock/GRNReports";

const StockRoutes = () => {
  return (

    <Route
      path="/grn-stock-module"
      element={<StockLayout />}
    >

      <Route
        index
        element={
          <Navigate
            to="create-grn"
            replace
          />
        }
      />

      <Route
        path="create-grn"
        element={<CreateGRN />}
      />

      <Route
        path="stock-in"
        element={<StockIn />}
      />

      <Route
        path="warehouse"
        element={<Warehouse />}
      />

      <Route
        path="inventory"
        element={<Inventory />}
      />

      <Route
        path="stock-transfer"
        element={<StockTransfer />}
      />

      <Route
        path="low-stock-alert"
        element={<LowStockAlert />}
      />

      <Route
        path="grn-reports"
        element={<GRNReports />}
      />

    </Route>

  );
};

export default StockRoutes;