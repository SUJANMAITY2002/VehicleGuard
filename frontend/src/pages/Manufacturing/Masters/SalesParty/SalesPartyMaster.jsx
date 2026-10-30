import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./SalesPartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import UploadModal from "../../../../components/UploadModal/UploadModal";

/* Fields definition used by the UploadModal */
const SALES_PARTY_FIELDS = [
  { key: "partyCode", label: "Party Code", required: true },
  { key: "partyName", label: "Party Name", required: true },
  { key: "location",  label: "Location",   required: false },
  { key: "city",      label: "City",       required: false },
  { key: "district",  label: "District",   required: false },
  { key: "state",     label: "State",      required: false },
  { key: "pinCode",   label: "Pin Code",   required: false },
  { key: "status",    label: "Status",     required: false, default: "Active" },
];

const SalesPartyMaster = () => {
  const navigate = useNavigate();

  const [parties, setParties] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  /* SEARCH FIELDS */
  const [partyCode, setPartyCode] = useState("");
  const [partyName, setPartyName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");

  /* EDIT */
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({
    partyCode: "", partyName: "", location: "", city: "",
    district: "", state: "", pinCode: "", status: "Active",
  });

  /* FETCH */
  const fetchParties = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sales-parties`);
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
    if (city) filtered = filtered.filter((i) => i.city?.toLowerCase().includes(city.toLowerCase()));
    if (state) filtered = filtered.filter((i) => i.state?.toLowerCase().includes(state.toLowerCase()));
    if (status) filtered = filtered.filter((i) => i.status === status);
    setFilteredData(filtered);
  };

  /* RESET */
  const handleReset = () => {
    setPartyCode("");
    setPartyName("");
    setCity("");
    setState("");
    setStatus("");
    setFilteredData(parties);
  };

  /* ── CRUD ─────────────────────────────────────────────────────────── */
  const handleEdit = (item, rowId) => {
    setEditId(rowId);
    setEditData({
      partyCode: item.partyCode || "",
      partyName: item.partyName || "",
      location:  item.location  || "",
      city:      item.city      || "",
      district:  item.district  || "",
      state:     item.state     || "",
      pinCode:   item.pinCode   || "",
      status:    item.status    || "Active",
    });
  };

  const handleCancelEdit = () => setEditId(null);

  const handleUpdate = async (item) => {
    const partyId = item._id || item.id;
    if (!partyId) { alert("Cannot update: this record has no id."); return; }
    try {
      await axios.put(`${API_URL}/api/sales-party/${partyId}`, editData);
      setEditId(null);
      fetchParties();
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Error updating sales party");
    }
  };

  const handleDelete = async (item) => {
    const partyId = item._id || item.id;
    if (!partyId) { alert("Cannot delete: this record has no id."); return; }
    if (!window.confirm("Delete this sales party?")) return;
    try {
      await axios.delete(`${API_URL}/api/sales-party/${partyId}`);
      fetchParties();
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Error deleting sales party");
    }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      {/* TOPBAR */}
      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Sales Party Master</h1>
        </div>
        <div className="topbar-actions">
          <button className="upload-btn" onClick={() => setUploadOpen(true)}>
            Upload
          </button>
          <button className="create-btn" onClick={() => navigate("/create-sales-party")}>
            Create
          </button>
        </div>
      </div>

      {/* UPLOAD MODAL */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={fetchParties}
        entityType="sales-party"
        fields={SALES_PARTY_FIELDS}
        bulkEndpoint="/api/bulk-create-sales-parties"
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
            <label>City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="form-group">
            <label>State</label>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
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
                <th>Location</th>
                <th>City</th>
                <th>District</th>
                <th>State</th>
                <th>Pin Code</th>
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
                          to={`/sales-party-detail/${encodeURIComponent(partyIdentifier)}`}
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
                      ) : item.partyName}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.location}
                          onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                        />
                      ) : item.location}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.city}
                          onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        />
                      ) : item.city}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.district}
                          onChange={(e) => setEditData({ ...editData, district: e.target.value })}
                        />
                      ) : item.district}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.state}
                          onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                        />
                      ) : item.state}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.pinCode}
                          onChange={(e) => setEditData({ ...editData, pinCode: e.target.value })}
                        />
                      ) : item.pinCode}
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
                      ) : item.status}
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
                <tr><td colSpan="10" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesPartyMaster;