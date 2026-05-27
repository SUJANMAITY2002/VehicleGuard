import React from "react";

import {
  Route,
  Navigate,
} from "react-router-dom";

import QualityLayout
from "../layouts/QualityLayout";

import IncomingQC
from "../pages/quality/IncomingQC";

import GradeCheck
from "../pages/quality/GradeCheck";

import LabReport
from "../pages/quality/LabReport";

import QCApproval
from "../pages/quality/QCApproval";

import RejectedMaterial
from "../pages/quality/RejectedMaterial";

import QCReports
from "../pages/quality/QCReports";

const QualityRoutes = () => {
  return (

    <Route
      path="/quality-module"
      element={<QualityLayout />}
    >

      <Route
        index
        element={
          <Navigate
            to="incoming-qc"
            replace
          />
        }
      />

      <Route
        path="incoming-qc"
        element={<IncomingQC />}
      />

      <Route
        path="grade-check"
        element={<GradeCheck />}
      />

      <Route
        path="lab-report"
        element={<LabReport />}
      />

      <Route
        path="qc-approval"
        element={<QCApproval />}
      />

      <Route
        path="rejected-material"
        element={<RejectedMaterial />}
      />

      <Route
        path="qc-reports"
        element={<QCReports />}
      />

    </Route>

  );
};

export default QualityRoutes;