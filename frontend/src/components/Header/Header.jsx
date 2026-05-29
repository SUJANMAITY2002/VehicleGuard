import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Header.css";

function Header() {
  const [user,     setUser]     = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user") || "null"));
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
  const path   = location.pathname;

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>

      {/* Logo */}
      <div className="nav-logo">
        <Link to="/">
          <span className="logo-icon">🛡️</span>
          <span className="logo-text">SMS</span>
        </Link>
      </div>

   <div className="nav-center">
    <h2>Steel Manufacturing Solution</h2>
  </div>

      {/* Right side: user chip + logout OR login/signup */}
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