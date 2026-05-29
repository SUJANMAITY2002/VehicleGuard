import React from "react";
import { NavLink } from "react-router-dom";
import "./ModuleNavbar.css";

const ModuleNavbar = () => {

  const modules = [
    {
      title: "Home",
      path: "/",
    },
    {
      title: "Procurement",
      path: "/procurement",
    },
    {
      title: "Inventory",
      path: "/inventory",
    },
    {
      title: "Production",
      path: "/production",
    },
    {
      title: "Sales",
      path: "/sales",
    },
    {
      title: "Masters",
      path: "/masters",
    },
  ];

  return (
    <div className="module-navbar">

      <div className="module-nav-left">

        {modules.map((module, index) => (
          <NavLink
            key={index}
            to={module.path}
            className={({ isActive }) =>
              isActive
                ? "module-link active"
                : "module-link"
            }
          >
            {module.title}
          </NavLink>
        ))}

      </div>

      <div className="module-nav-right">
        <span>🔍</span>
        <span>📤</span>
        <span>⚙️</span>
      </div>

    </div>
  );
};

export default ModuleNavbar;