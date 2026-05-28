import React from "react";

import {
  Route,
  Navigate,
} from "react-router-dom";

import WeighBridgeLayout
from "../layouts/weighbridgelayout/WeighBridgeLayout";

import GrossWeight
from "../pages/weighbridge/GrossWeight";

import TareWeight
from "../pages/weighbridge/TareWeight";

import WeightSlip
from "../pages/weighbridge/WeightSlip";

import LiveWeight
from "../pages/weighbridge/LiveWeight";

import PendingVehicle
from "../pages/weighbridge/PendingVehicle";

import WeightReports
from "../pages/weighbridge/WeightReports";

const WeighBridgeRoutes = () => {
  return (

    <Route
      path="/weighbridge-module"
      element={<WeighBridgeLayout />}
    >

      <Route
        index
        element={
          <Navigate
            to="gross-weight"
            replace
          />
        }
      />

      <Route
        path="gross-weight"
        element={<GrossWeight />}
      />

      <Route
        path="tare-weight"
        element={<TareWeight />}
      />

      <Route
        path="weight-slip"
        element={<WeightSlip />}
      />

      <Route
        path="live-weight"
        element={<LiveWeight />}
      />

      <Route
        path="pending-vehicle"
        element={<PendingVehicle />}
      />

      <Route
        path="weight-reports"
        element={<WeightReports />}
      />

    </Route>

  );
};

export default WeighBridgeRoutes;