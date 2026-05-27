import React from "react";

import { Route } from "react-router-dom";

import GateEntryLayout from "../layouts/GateEntryLayout";

import VehicleIn from "../pages/gateentry/VehicleIn";
import VehicleOut from "../pages/gateentry/VehicleOut";
import GatePass from "../pages/gateentry/GatePass";
import LiveVehicleStatus from "../pages/gateentry/LiveVehicleStatus";
import SecurityLog from "../pages/gateentry/SecurityLog";
import VisitorEntry from "../pages/gateentry/VisitorEntry";
import Reports from "../pages/gateentry/Reports";

const GateEntryRoutes = () => {
  return (
    <Route
      path="/gate-entry-module"
      element={<GateEntryLayout />}
    >

      <Route
        index
        element={<VehicleIn />}
      />

      <Route
        path="vehicle-in"
        element={<VehicleIn />}
      />

      <Route
        path="vehicle-out"
        element={<VehicleOut />}
      />

      <Route
        path="gate-pass"
        element={<GatePass />}
      />

      <Route
        path="live-vehicle-status"
        element={<LiveVehicleStatus />}
      />

      <Route
        path="security-log"
        element={<SecurityLog />}
      />

      <Route
        path="visitor-entry"
        element={<VisitorEntry />}
      />

      <Route
        path="reports"
        element={<Reports />}
      />

    </Route>
  );
};

export default GateEntryRoutes;