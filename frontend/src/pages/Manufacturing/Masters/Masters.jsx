import React from "react";
import { useNavigate } from "react-router-dom";
import "./Masters.css";
import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";

const Masters = () => {

  const navigate = useNavigate();

  const masterModules = [
    {
      icon: "🔄",
      title: "Transaction Module",
      subtitle: "Manage Transactions",
      code: "TR001",
      path: "/transaction-module",
    },
    {
      icon: "📄",
      title: "Document Sequence",
      subtitle: "Manage Document Numbers",
      code: "DS002",
      path: "/document-sequence",
    },
  ];

  return (
    <div className="module-page">

      <ModuleNavbar />

      <div className="inventory-header">
        <h1>Masters</h1>
      </div>

      <div className="inventory-grid">

        {masterModules.map((item, index) => (
          <div
            key={index}
            className="inventory-card"
            onClick={() => navigate(item.path)}
          >

            <div className="card-left">

              <div className="inventory-icon">
                {item.icon}
              </div>

              <div>
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
              </div>

            </div>

            <div className="card-right">
              <span>{item.code}</span>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default Masters;