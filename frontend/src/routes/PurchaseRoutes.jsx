import React from "react";

import { Route } from "react-router-dom";

import PurchaseLayout from "../layouts/PurchaseLayout";

import CreatePO from "../pages/purchase/CreatePO";
import PurchaseList from "../pages/purchase/PurchaseList";
import PendingPO from "../pages/purchase/PendingPO";
import ApprovedPO from "../pages/purchase/ApprovedPO";

import VendorManagement from "../pages/purchase/VendorManagement";
import RateChart from "../pages/purchase/RateChart";
import MaterialMaster from "../pages/purchase/MaterialMaster";
import Reports from "../pages/purchase/Reports";

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