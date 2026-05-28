import React from "react";

import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home";

import Signin from "../pages/auth/Signin";
import Signup from "../pages/auth/Signup";

import PurchaseRoutes from "./PurchaseRoutes";
import GateEntryRoutes from "./GateEntryRoutes";
import WeighBridgeRoutes from "./WeighBridgeRoutes";
import QualityRoutes from "./QualityRoutes";
import StockRoutes from "./StockRoutes";
import CCMRoutes from "./CCMRoutes";

const AppRoutes = () => {
  return (
    <Routes>

      {/* AUTH */}

      <Route path="/signin" element={<Signin />} />

      <Route path="/signup" element={<Signup />} />

      {/* HOME */}

      <Route path="/" element={<Home />} />

      {/* MODULE ROUTES */}

      {PurchaseRoutes()}

      {GateEntryRoutes()}

      {WeighBridgeRoutes()}

      {QualityRoutes()}

      {StockRoutes()}

      {CCMRoutes()}

    </Routes>
  );
};

export default AppRoutes;