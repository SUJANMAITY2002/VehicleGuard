import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "../PartyMaster/PartyMaster.css";

const detailFields = [
  { label: "Item Code",      key: "itemCode"      },
  { label: "Item Name",      key: "itemName"      },
  { label: "Item Types",     key: "itemTypes"     },
  { label: "Category",       key: "category"      },
  { label: "Item Group",     key: "itemGroup"     },
  { label: "Date",           key: "date"          },
  { label: "UOM",            key: "uom"           },
  { label: "HSN",            key: "hsn"           },
  { label: "GST %",          key: "gstPercent"    },
  { label: "Item Class",     key: "itemClass"     },
  { label: "Item Tax Class", key: "itemTaxClass"  },
  { label: "Grade",          key: "grade"         },
  { label: "Size",           key: "size"          },
  { label: "Rate Diff",      key: "rateDiff"      },
  { label: "Reference Item", key: "referenceItem" },
  { label: "Status",         key: "status"        },
];

const ItemDetail = () => {
  const { id } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();

  const selectedItem = location.state?.item || null;

  const [item,    setItem]    = useState(selectedItem);
  const [loading, setLoading] = useState(!selectedItem);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (selectedItem) { setLoading(false); return; }

    const fetchItem = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/item/${id}`);
        setItem(res.data);
      } catch (err) {
        setError("Item not found");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, selectedItem]);

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <h1>Item Details</h1>
        <button className="create-btn" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div className="search-container">
        <div className="search-title">Details</div>

        {loading && <p>Loading…</p>}
        {error   && <p>{error}</p>}

        {item && (
          <div className="detail-grid">
            {detailFields.map((field) => (
              <div className="detail-item" key={field.key}>
                <span>{field.label}</span>
                <strong>
                  {field.key === "date"
                    ? item.date
                      ? new Date(item.date).toLocaleDateString()
                      : "—"
                    : item[field.key] || "—"}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetail;