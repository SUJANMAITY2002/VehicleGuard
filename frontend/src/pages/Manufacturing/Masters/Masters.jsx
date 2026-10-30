import React from "react";
import { useNavigate } from "react-router-dom";
import "./Masters.css";
import ModuleNavbar from "../../../components/ModuleNavbar/ModuleNavbar";

const Masters = () => {
  const navigate = useNavigate();

  const masterModules = [
    { icon: "🔄", title: "Transaction Module",       subtitle: "Manage Transactions",        code: "TR001", path: "/transaction-module"       },
    { icon: "📄", title: "Document Sequence",        subtitle: "Manage Document Numbers",    code: "DS002", path: "/document-sequence"        },
    { icon: "🏢", title: "Party Master",             subtitle: "Manage Parties",             code: "PM001", path: "/party-master"             },
    // { icon: "🏷️", title: "Party Type",               subtitle: "Manage Party Types",         code: "PT001", path: "/party-type"               },
    { icon: "📦", title: "Item Master",              subtitle: "Manage Items",               code: "IM001", path: "/item-master"              },
    { icon: "🗂️", title: "Item Category",            subtitle: "Manage Item Categories",     code: "IC001", path: "/item-category"            },
    { icon: "🔩", title: "Item Group",               subtitle: "Manage Item Group",          code: "IG001", path: "/item-group"                },
    { icon: "🔩", title: "Item Class",               subtitle: "Manage Item Class",          code: "ITC001", path: "/item-class"                },
    { icon: "🧮", title: "Item Tax Class",            subtitle: "Manage Item Tax Classes",    code: "ITC002", path: "/item-tax-class"            },
    { icon: "⚖️", title: "UOM Master",               subtitle: "Units of Measure",           code: "UM001", path: "/uom-master"               },
    { icon: "🧾", title: "Tax Details",              subtitle: "Tax Type, Code & Rate",      code: "TD001", path: "/tax-details"              },
    { icon: "🛠️", title: "Service Master",           subtitle: "SAC Code & Tax Class",       code: "SV001", path: "/service-master"           },
    { icon: "💰", title: "Charges / Discount Master",subtitle: "Charges & Discount Setup",   code: "CD001", path: "/charges-master"           },
    { icon: "⚙️", title: "Production Details",       subtitle: "Grade, Size, Dimensions",    code: "PD001", path: "/production-details"       },
    { icon: "📊", title: "Scheme Master",            subtitle: "Pricing Schemes",            code: "SM001", path: "/scheme-master"            },
    { icon: "📍", title: "Site Master",              subtitle: "Manage Sites / Locations",   code: "ST001", path: "/site-master"              },
    { icon: "🔁", title: "Item Conversion",          subtitle: "Manage Item Conversion",     code: "IC002", path: "/item-conversion-master"   },
    { icon: "🏷️", title: "Sales Party Master",       subtitle: "Sales Party Master",         code: "SP001", path: "/Sales-party-master"       },
    { icon: "🏷️", title: "Sales Item Type",          subtitle: "Manage Sales Item Types",    code: "SIT001", path: "/sales-item-type"          },
    { icon: "📦", title: "Item Name Master",         subtitle: "Manage Item Names",          code: "IN001", path: "/item-name-master"          },
  ];

  return (
    <div className="module-page">
      <ModuleNavbar />
      <div className="inventory-header">
        <h1>Masters</h1>
      </div>
      <div className="inventory-grid">
        {masterModules.map((item, index) => (
          <div key={index} className="inventory-card" onClick={() => navigate(item.path)}>
            <div className="card-left">
              <div className="inventory-icon">{item.icon}</div>
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