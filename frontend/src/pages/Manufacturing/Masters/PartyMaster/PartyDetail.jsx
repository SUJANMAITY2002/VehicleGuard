import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./PartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const detailFields = [
  { label: "Party Code", key: "partyCode" },
  { label: "Party Name", key: "partyName" },
  { label: "Type", key: "type" },
  { label: "City", key: "city" },
  {
    label: "Address Line 1",
    key: [
      "addressLine1",
      "address1",
      "address_1",
      "address line 1",
      "Address Line 1",
    ],
  },
  {
    label: "Address Line 2",
    key: [
      "addressLine2",
      "address2",
      "address_2",
      "address line 2",
      "Address Line 2",
    ],
  },
  {
    label: "Pin",
    key: [
      "pin",
      "pincode",
      "pinCode",
      "pinNo",
      "Pin",
      "PIN",
      "Pin Code",
    ],
  },
  { label: "GST No", key: "gstNo" },
  { label: "Mobile", key: "mobile" },
  { label: "Pay Terms", key: "payTerms" },
  { label: "Credit Days", key: "creditDays" },
  { label: "Status", key: "status" },
];

/* Type is a fixed list — no longer sourced from a Type master */
const PARTY_TYPE_OPTIONS = ["Supplier", "Customer", "Both"];

const getValue = (item, keys) => {
  const keyList = Array.isArray(keys) ? keys : [keys];

  const value = keyList
    .map((key) => item?.[key])
    .find(
      (fieldValue) =>
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldValue.toString().trim() !== ""
    );

  return value || "";
};

const PartyDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedParty = location.state?.party || null;

  const [party, setParty] = useState(selectedParty);
  const [formData, setFormData] = useState(selectedParty || {});
  const [loading, setLoading] = useState(!selectedParty);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (selectedParty) {
      setParty(selectedParty);
      setFormData(selectedParty);
      setLoading(false);
      return;
    }

    const fetchParty = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/party/${encodeURIComponent(id)}`
        );

        setParty(res.data);
        setFormData(res.data);
      } catch (err) {
        console.log(err);
        setError(
          err.response?.data?.message || "Party details not found."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchParty();
  }, [id, selectedParty]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      const partyId = party?._id || party?.id;

      const res = await axios.put(
        `${API_URL}/api/party/${partyId}`,
        formData
      );

      setParty(res.data.data);
      setFormData(res.data.data);
      setIsEditing(false);

      alert("Party Updated Successfully");
    } catch (err) {
      console.log(err);
      alert("Update Failed");
    }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <h1>Party Details</h1>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          {!isEditing ? (
            <button
              className="create-btn"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          ) : (
            <button
              className="create-btn"
              onClick={handleSave}
            >
              Save
            </button>
          )}

          <button
            className="create-btn"
            onClick={() => navigate("/party-master", { replace: true })}
          >
            Back
          </button>
        </div>
      </div>

      <div className="search-container">
        <div className="search-title">Details</div>

        {loading && (
          <div className="detail-message">
            Loading...
          </div>
        )}

        {!loading && error && (
          <div className="detail-message">
            {error}
          </div>
        )}

        {!loading && party && (
          <div className="detail-grid">
            {detailFields.map((field) => {
              const fieldKey = Array.isArray(field.key)
                ? field.key[0]
                : field.key;

              return (
                <div
                  className="detail-item"
                  key={fieldKey}
                >
                  <span>{field.label}</span>

                  {isEditing ? (
                    fieldKey === "type" ? (
                      <select
                        name={fieldKey}
                        value={formData[fieldKey] || ""}
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          marginTop: "5px",
                        }}
                      >
                        <option value="">- Select -</option>
                        {PARTY_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name={fieldKey}
                        value={formData[fieldKey] || ""}
                        onChange={handleChange}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          marginTop: "5px",
                        }}
                      />
                    )
                  ) : (
                    <strong>
                      {getValue(party, field.key) || "-"}
                    </strong>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyDetail;