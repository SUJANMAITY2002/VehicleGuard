import React from "react";

import { Route } from "react-router-dom";

import PurchaseLayout from "../layouts/purchaselayout/PurchaseLayout";

import CreatePO from "../pages/Purchase/CreatePO";
import PurchaseList from "../pages/Purchase/PurchaseList";
import PendingPO from "../pages/Purchase/PendingPO";
import ApprovedPO from "../pages/Purchase/ApprovedPO";

import VendorManagement from "../pages/Purchase/VendorManagement";
import RateChart from "../pages/Purchase/RateChart";
import MaterialMaster from "../pages/Purchase/MaterialMaster";
import Reports from "../pages/Purchase/Reports";

const PurchaseRoutes = () => {
  return (
    <Route
      path="/purchase-module"
      element={<PurchaseLayout />}
    >

      <Route
        index
        element={<CreatePO />}
      />

      <Route
        path="create-po"
        element={<CreatePO />}
      />

      <Route
        path="purchase-list"
        element={<PurchaseList />}
      />

      <Route
        path="pending-po"
        element={<PendingPO />}
      />

      <Route
        path="approved-po"
        element={<ApprovedPO />}
      />

      <Route
        path="vendor-management"
        element={<VendorManagement />}
      />

      <Route
        path="rate-chart"
        element={<RateChart />}
      />

      <Route
        path="material-master"
        element={<MaterialMaster />}
      />

      <Route
        path="reports"
        element={<Reports />}
      />

    </Route>
  );
};

export default PurchaseRoutes;