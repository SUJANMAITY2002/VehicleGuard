import React from "react";

import {
  Route,
  Navigate,
} from "react-router-dom";

import CCMLayout
from "../layouts/ccmlayout/CCMLayout";

import HeatEntry
from "../pages/ccm/HeatEntry";

import BilletProduction
from "../pages/ccm/BilletProduction";

import ShiftProduction
from "../pages/ccm/ShiftProduction";

import MachineStatus
from "../pages/ccm/MachineStatus";

import ProductionReports
from "../pages/ccm/ProductionReports";

import DowntimeReports
from "../pages/ccm/DowntimeReports";

const CCMRoutes = () => {
  return (

    <Route
      path="/ccm-production-module"
      element={<CCMLayout />}
    >

      <Route
        index
        element={
          <Navigate
            to="heat-entry"
            replace
          />
        }
      />

      <Route
        path="heat-entry"
        element={<HeatEntry />}
      />

      <Route
        path="billet-production"
        element={<BilletProduction />}
      />

      <Route
        path="shift-production"
        element={<ShiftProduction />}
      />

      <Route
        path="machine-status"
        element={<MachineStatus />}
      />

      <Route
        path="production-reports"
        element={<ProductionReports />}
      />

      <Route
        path="downtime-reports"
        element={<DowntimeReports />}
      />

    </Route>

  );
};

export default CCMRoutes;