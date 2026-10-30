import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../PartyMaster/PartyMaster.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const UOMMaster = () => {
  const navigate = useNavigate();

  const [uoms, setUoms] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [uomName, setUomName] = useState("");
  const [status, setStatus] = useState("");

  const [editId, setEditId] = useState(null);

  const [editData, setEditData] = useState({
    uomName: "",
    status: "",
  });

  const fetchUOMs = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/uoms`);

      setUoms(res.data);
      setFilteredData(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchUOMs();
  }, []);

  /* Dropdown values from database */
  const uomOptions = [
    ...new Set(
      uoms
        .map((item) => item.uomName)
        .filter(Boolean)
    ),
  ].sort();

  const handleSearch = () => {
    let filtered = [...uoms];

    if (uomName) {
      filtered = filtered.filter(
        (item) => item.uomName === uomName
      );
    }

    if (status) {
      filtered = filtered.filter(
        (item) => item.status === status
      );
    }

    setFilteredData(filtered);
  };

  const handleReset = () => {
    setUomName("");
    setStatus("");
    setFilteredData(uoms);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this UOM?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(
        `${API_URL}/api/uom/${id}`
      );

      fetchUOMs();
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = (item) => {
    setEditId(item._id);

    setEditData({
      uomName: item.uomName,
      status: item.status,
    });
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(
        `${API_URL}/api/uom/${id}`,
        editData
      );

      setEditId(null);

      fetchUOMs();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>UOM Master</h1>
        </div>

        <button
          className="create-btn"
          onClick={() =>
            navigate("/create-uom")
          }
        >
          Create ▼
        </button>
      </div>

      <div className="search-container">

        <div className="search-title">
          Search
        </div>

        <div className="search-grid">

          <div className="form-group">
            <label>UOM Name</label>

            <select
              value={uomName}
              onChange={(e) =>
                setUomName(e.target.value)
              }
            >
              <option value="">
                - Select -
              </option>

              {uomOptions.map((uom) => (
                <option
                  key={uom}
                  value={uom}
                >
                  {uom}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              <option value="">
                - Select -
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>

        </div>

        <div className="button-group">

          <button
            className="search-btn"
            onClick={handleSearch}
          >
            Search
          </button>

          <button
            className="reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>

        </div>

        <div className="table-container">

          <table>

            <thead>
              <tr>
                <th>S No</th>
                <th>UOM Name</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredData.length > 0 ? (

                filteredData.map(
                  (item, index) => (
                    <tr key={item._id}>

                      <td>
                        {index + 1}
                      </td>

                      <td>
                        {editId === item._id ? (
                          <input
                            type="text"
                            value={
                              editData.uomName
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                uomName:
                                  e.target.value,
                              })
                            }
                          />
                        ) : (
                          item.uomName
                        )}
                      </td>

                      <td>
                        {editId === item._id ? (
                          <select
                            value={
                              editData.status
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                status:
                                  e.target.value,
                              })
                            }
                          >
                            <option value="Active">
                              Active
                            </option>

                            <option value="Inactive">
                              Inactive
                            </option>
                          </select>
                        ) : (
                          item.status
                        )}
                      </td>

                      <td>

                        {editId === item._id ? (
                          <button
                            className="save-btn"
                            onClick={() =>
                              handleUpdate(
                                item._id
                              )
                            }
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            className="edit-btn"
                            onClick={() =>
                              handleEdit(
                                item
                              )
                            }
                          >
                            Edit
                          </button>
                        )}

                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              item._id
                            )
                          }
                        >
                          Delete
                        </button>

                      </td>

                    </tr>
                  )
                )

              ) : (

                <tr>
                  <td
                    colSpan="4"
                    className="no-data"
                  >
                    No Data Found
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>
    </div>
  );
};

export default UOMMaster;