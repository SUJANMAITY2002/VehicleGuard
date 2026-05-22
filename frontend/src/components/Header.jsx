import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Header.css";

function Header() {
  const [user, setUser]         = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    setUser(storedUser);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/signin");
  };

  const isAuth = location.pathname === "/signin" || location.pathname === "/signup";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-logo">
        <Link to="/">
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">VehicleGuard</span>
        </Link>
      </div>

      {/* Page navigation links */}
      {!isAuth && user && (
        <div className="nav-links">
          <Link to="/"        className={`nav-link ${location.pathname === "/"        ? "active" : ""}`}>
            🚛 Vehicle Entry
          </Link>
          <Link to="/item"    className={`nav-link ${location.pathname === "/item"    ? "active" : ""}`}>
            📦 Item Entry
          </Link>
          <Link to="/records" className={`nav-link ${location.pathname === "/records" ? "active" : ""}`}>
            📋 Records
          </Link>
        </div>
      )}

      <div className="nav-buttons">
        {!isAuth && user ? (
          <>
            <div className="user-chip">
              <span className="user-avatar">{user.name?.charAt(0).toUpperCase()}</span>
              <span className="user-name">{user.name}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </>
        ) : !isAuth ? (
          <>
            <Link to="/signin" className="btn-login">Login</Link>
            <Link to="/signup" className="btn-signup">Sign Up</Link>
          </>
        ) : null}
      </div>
    </nav>
  );
}

export default Header;