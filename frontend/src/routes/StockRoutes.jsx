import React from "react";

import {
  Route,
  Navigate,
} from "react-router-dom";

import StockLayout
from "../layouts/stocklayout/StockLayout";

import CreateGRN
from "../pages/stock/CreateGRN";

import StockIn
from "../pages/stock/StockIn";

import Warehouse
from "../pages/stock/Warehouse";

import Inventory
from "../pages/stock/Inventory";

import StockTransfer
from "../pages/stock/StockTransfer";

import LowStockAlert
from "../pages/stock/LowStockAlert";

import GRNReports
from "../pages/stock/GRNReports";

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