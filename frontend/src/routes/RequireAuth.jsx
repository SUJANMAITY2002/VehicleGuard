import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

// Wrap protected routes with this. If there's no auth token in
// localStorage, the user is bounced straight to /signin instead of
// seeing any page content. Once they sign in, they land back on the
// page they originally tried to visit.
const RequireAuth = () => {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;