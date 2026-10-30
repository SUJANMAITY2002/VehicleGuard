import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/PartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const initialEditData = {
  siteCode: "",
  siteName: "",
  address: "",
  city: "",
  state: "",
  pinCode: "",
  contactPerson: "",
  mobile: "",
  gstNo: "",
  status: "",
};

const SiteMaster = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filterSiteName, setFilterSiteName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(initialEditData);

  const applyFilters = (sites, siteName, status) => {
    let result = [...sites];
    const nameSearch = siteName.trim().toLowerCase();

    if (nameSearch) {
      result = result.filter((item) =>
        item.siteName?.toLowerCase().includes(nameSearch)
      );
    }

    if (status) {
      result = result.filter((item) => item.status === status);
    }

    setFiltered(result);
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sites`);
      setData(res.data);
      applyFilters(res.data, filterSiteName, filterStatus);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSiteNameChange = (value) => {
    setFilterSiteName(value);
    applyFilters(data, value, filterStatus);
  };

  const handleStatusChange = (value) => {
    setFilterStatus(value);
    applyFilters(data, filterSiteName, value);
  };

  const handleSearch = () => {
    applyFilters(data, filterSiteName, filterStatus);
  };

  const handleReset = () => {
    setFilterSiteName("");
    setFilterStatus("");
    setFiltered(data);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this site?")) return;

    try {
      await axios.delete(`${API_URL}/api/site/${id}`);
      fetchData();
    } catch (err) {
      console.log(err);
    }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      siteCode: item.siteCode || "",
      siteName: item.siteName || "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      pinCode: item.pinCode || "",
      contactPerson: item.contactPerson || "",
      mobile: item.mobile || "",
      gstNo: item.gstNo || "",
      status: item.status || "Active",
    });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/site/${id}`, editData);
      setEditId(null);
      fetchData();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Site Master</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-site")}>
          Create
        </button>
      </div>

      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">
          <div className="form-group">
            <label>Site Name</label>
            <input
              type="text"
              value={filterSiteName}
              onChange={(e) => handleSiteNameChange(e.target.value)}
              placeholder="Type site name..."
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => handleStatusChange(e.target.value)}>
              <option value="">- All -</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <div className="button-group">
          <button className="search-btn" onClick={handleSearch}>Search</button>
          <button className="reset-btn" onClick={handleReset}>Reset</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>S No</th>
                <th>Site Code</th>
                <th>Site Name</th>
                <th>Address</th>
                <th>City</th>
                <th>State</th>
                <th>Pin Code</th>
                <th>Contact Person</th>
                <th>Mobile</th>
                <th>GST No</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item, i) => (
                  <tr key={item._id}>
                    <td>{i + 1}</td>

                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.siteCode}
                          onChange={(e) => setEditData({ ...editData, siteCode: e.target.value })}
                        />
                      ) : item.siteCode || "-"}
                    </td>

                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.siteName}
                          onChange={(e) => setEditData({ ...editData, siteName: e.target.value })}
                        />
                      ) : item.siteName || "-"}
                    </td>

                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.address}
                          onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        />
                      ) : item.address || "-"}
                    </td>

                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.city}
                          onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        />
                      ) : item.city || "-"}
                    </td>

                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.state}
                          onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                        >
                          <option value="">- Select State -</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      ) : item.state || "-"}
                    </td>

                    {["pinCode", "contactPerson", "mobile", "gstNo"].map((field) => (
                      <td key={field}>
                        {editId === item._id ? (
                          <input
                            type="text"
                            value={editData[field] ?? ""}
                            onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                          />
                        ) : item[field] || "-"}
                      </td>
                    ))}

                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                      ) : (
                        <span style={{ color: item.status === "Active" ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                          {item.status}
                        </span>
                      )}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      {editId === item._id ? (
                        <button className="save-btn" onClick={() => handleUpdate(item._id)}>Save</button>
                      ) : (
                        <button className="edit-btn" onClick={() => handleEdit(item)}>Edit</button>
                      )}
                      <button className="delete-btn" onClick={() => handleDelete(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="12" className="no-data">No Data Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SiteMaster;