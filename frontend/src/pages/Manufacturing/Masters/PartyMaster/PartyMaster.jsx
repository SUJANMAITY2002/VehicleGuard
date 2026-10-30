import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./PartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import UploadModal from "../../../../components/UploadModal/UploadModal";

/* Fields definition used by the UploadModal */
const PARTY_FIELDS = [
  { key: "partyCode", label: "Party Code", required: true },
  { key: "partyName", label: "Party Name", required: true },
  { key: "type", label: "Type", required: false },
  { key: "city", label: "City", required: false },
  { key: "addressLine1", label: "Address Line 1", required: false },
  { key: "addressLine2", label: "Address Line 2", required: false },
  { key: "pin", label: "Pin", required: false },
  { key: "gstNo", label: "GST No", required: false },
  { key: "mobile", label: "Mobile", required: false },
  { key: "payTerms", label: "Pay Terms", required: false },
  { key: "creditDays", label: "Credit Days", required: false },
  { key: "status", label: "Status", required: false, default: "Active" },
];

/* Type is a fixed list — no longer sourced from a Type master */
const PARTY_TYPE_OPTIONS = ["Supplier", "Customer", "Both"];

const getValue = (item, keys) => {
  const keyList = Array.isArray(keys) ? keys : [keys];
  const value = keyList
    .map((key) => item?.[key])
    .find((fieldValue) => fieldValue !== undefined && fieldValue !== null && fieldValue.toString().trim() !== "");

  return value || "";
};

const PartyMaster = () => {
  const navigate = useNavigate();

  const [parties, setParties] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  /* SEARCH FIELDS */
  const [partyCode, setPartyCode] = useState("");
  const [partyName, setPartyName] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  /* EDIT */
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({
    partyCode: "", partyName: "", type: "", city: "",
    addressLine1: "", addressLine2: "", pin: "", gstNo: "",
    mobile: "", payTerms: "", creditDays: "", status: "Active",
  });

  /* FETCH */
  const fetchParties = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/parties`);
      setParties(res.data);
      setFilteredData(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  /* SEARCH */
  const handleSearch = () => {
    let filtered = [...parties];
    if (partyCode) filtered = filtered.filter((i) => i.partyCode?.toLowerCase().includes(partyCode.toLowerCase()));
    if (partyName) filtered = filtered.filter((i) => i.partyName?.toLowerCase().includes(partyName.toLowerCase()));
    if (type) filtered = filtered.filter((i) => i.type === type);
    if (status) filtered = filtered.filter((i) => i.status === status);
    setFilteredData(filtered);
  };

  /* RESET */
  const handleReset = () => {
    setPartyCode("");
    setPartyName("");
    setType("");
    setStatus("");
    setFilteredData(parties);
  };

  /* ── CRUD ─────────────────────────────────────────────────────────── */
  const handleEdit = (item, rowId) => {
    setEditId(rowId);
    setEditData({
      partyCode:    item.partyCode || "",
      partyName:    getValue(item, "partyName"),
      type:         getValue(item, "type"),
      city:         getValue(item, "city"),
      addressLine1: getValue(item, ["addressLine1", "address1", "address_1", "address line 1", "Address Line 1"]),
      addressLine2: getValue(item, ["addressLine2", "address2", "address_2", "address line 2", "Address Line 2"]),
      pin:          getValue(item, ["pin", "pincode", "pinCode", "pinNo", "Pin", "PIN", "Pin Code"]),
      gstNo:        getValue(item, "gstNo"),
      mobile:       getValue(item, "mobile"),
      payTerms:     getValue(item, "payTerms"),
      creditDays:   getValue(item, "creditDays"),
      status:       getValue(item, "status") || "Active",
    });
  };

  const handleCancelEdit = () => setEditId(null);

  const handleUpdate = async (item) => {
    const partyId = item._id || item.id;
    if (!partyId) { alert("Cannot update: this record has no id."); return; }
    try {
      await axios.put(`${API_URL}/api/party/${partyId}`, editData);
      setEditId(null);
      fetchParties();
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Error updating party");
    }
  };

  const handleDelete = async (item) => {
    const partyId = item._id || item.id;
    if (!partyId) { alert("Cannot delete: this record has no id."); return; }
    if (!window.confirm("Delete this party?")) return;
    try {
      await axios.delete(`${API_URL}/api/party/${partyId}`);
      fetchParties();
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Error deleting party");
    }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      {/* TOPBAR */}
      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Party Master</h1>
        </div>
        <div className="topbar-actions">
          <button className="upload-btn" onClick={() => setUploadOpen(true)}>
            Upload
          </button>
          <button className="create-btn" onClick={() => navigate("/create-party")}>
            Create
          </button>
        </div>
      </div>

      {/* UPLOAD MODAL */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={fetchParties}
        entityType="party"
        fields={PARTY_FIELDS}
        bulkEndpoint="/api/bulk-create-parties"
      />

      {/* SEARCH */}
      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">
          <div className="form-group">
            <label>Party Code</label>
            <input type="text" value={partyCode} onChange={(e) => setPartyCode(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Party Name</label>
            <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">- Select -</option>
              {PARTY_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">- Select -</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="button-group">
          <button className="search-btn" onClick={handleSearch}>Search</button>
          <button className="reset-btn" onClick={handleReset}>Reset</button>
        </div>

        {/* TABLE */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>S No</th>
                <th>Party Code</th>
                <th>Party Name</th>
                <th>Type</th>
                <th>City</th>
                <th>Address Line 1</th>
                <th>Address Line 2</th>
                <th>Pin</th>
                <th>GST No</th>
                <th>Mobile</th>
                <th>Pay Terms</th>
                <th>Credit Days</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => {
                  const partyIdentifier = item._id || item.id || item.partyCode;
                  const isEditing = editId === partyIdentifier;

                  return (
                  <tr key={partyIdentifier} className={isEditing ? "editing-row" : ""}>
                    <td>{index + 1}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.partyCode}
                          onChange={(e) => setEditData({ ...editData, partyCode: e.target.value })}
                        />
                      ) : (
                        <Link
                          className="party-code-link"
                          to={`/party-detail/${encodeURIComponent(partyIdentifier)}`}
                          state={{ party: item }}
                        >
                          {item.partyCode}
                        </Link>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.partyName}
                          onChange={(e) => setEditData({ ...editData, partyName: e.target.value })}
                        />
                      ) : getValue(item, "partyName")}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editData.type}
                          onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                        >
                          <option value="">- Select -</option>
                          {PARTY_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : getValue(item, "type")}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.city}
                          onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        />
                      ) : getValue(item, "city")}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.addressLine1}
                          onChange={(e) => setEditData({ ...editData, addressLine1: e.target.value })}
                        />
                      ) : getValue(item, ["addressLine1", "address1", "address_1", "address line 1", "Address Line 1"])}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.addressLine2}
                          onChange={(e) => setEditData({ ...editData, addressLine2: e.target.value })}
                        />
                      ) : getValue(item, ["addressLine2", "address2", "address_2", "address line 2", "Address Line 2"])}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.pin}
                          onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                        />
                      ) : getValue(item, ["pin", "pincode", "pinCode", "pinNo", "Pin", "PIN", "Pin Code"])}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.gstNo}
                          onChange={(e) => setEditData({ ...editData, gstNo: e.target.value })}
                        />
                      ) : getValue(item, "gstNo")}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.mobile}
                          onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                        />
                      ) : getValue(item, "mobile")}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editData.payTerms}
                          onChange={(e) => setEditData({ ...editData, payTerms: e.target.value })}
                        >
                          <option value="">- Select -</option>
                          <option>Advance</option>
                          <option>Credit</option>
                          <option>COD</option>
                        </select>
                      ) : getValue(item, "payTerms")}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editData.creditDays}
                          onChange={(e) => setEditData({ ...editData, creditDays: e.target.value })}
                        />
                      ) : getValue(item, "creditDays")}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      ) : getValue(item, "status")}
                    </td>

                    {/* ACTION */}
                    <td className="action-cell">
                      {isEditing ? (
                        <>
                          <button className="save-btn" onClick={() => handleUpdate(item)}>Save</button>
                          <button className="cancel-edit-btn" onClick={handleCancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <button className="edit-btn" onClick={() => handleEdit(item, partyIdentifier)}>Edit</button>
                      )}
                      <button className="delete-btn" onClick={() => handleDelete(item)}>Delete</button>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr><td colSpan="14" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartyMaster;