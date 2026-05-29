import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";

import { useNavigate } from "react-router-dom";

import "./Transaction.css";

import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

const Transaction = () => {

  const navigate = useNavigate();

  /* ALL DATA */
  const [transactions, setTransactions] =
    useState([]);

  /* FILTERED DATA */
  const [filteredData, setFilteredData] =
    useState([]);

  /* SEARCH FIELDS */
  const [module, setModule] =
    useState("");

  const [businessEntity, setBusinessEntity] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [transactionCode, setTransactionCode] =
    useState("");

  const [description, setDescription] =
    useState("");

  /* EDIT STATES */
  const [editId, setEditId] =
    useState(null);

  const [editData, setEditData] =
    useState({
      module: "",
      businessEntity: "",
      transactionCategoryCode: "",
      categoryDescription: "",
      status: "",
    });

  /* FETCH DATA */
  const fetchTransactions = async () => {

    try {

      const response = await axios.get(
        "http://localhost:5000/api/transactions"
      );

      setTransactions(response.data);

      setFilteredData(response.data);

    } catch (error) {

      console.log(error);

    }

  };

  useEffect(() => {

    fetchTransactions();

  }, []);

  /* SEARCH */
  const handleSearch = () => {

    let filtered = [...transactions];

    /* MODULE */
    if (module) {

      filtered = filtered.filter(
        (item) =>

          item.module &&
          item.module
            .toLowerCase()
            .includes(
              module.toLowerCase()
            )
      );

    }

    /* BUSINESS ENTITY */
    if (businessEntity) {

      filtered = filtered.filter(
        (item) =>

          item.businessEntity &&
          item.businessEntity
            .toLowerCase()
            .includes(
              businessEntity.toLowerCase()
            )
      );

    }

    /* STATUS */
    if (status) {

      filtered = filtered.filter(
        (item) =>

          item.status &&
          item.status
            .toLowerCase()
            .includes(
              status.toLowerCase()
            )
      );

    }

    /* TRANSACTION CATEGORY CODE */
    if (transactionCode) {

      filtered = filtered.filter(
        (item) =>

          item.transactionCategoryCode &&
          item.transactionCategoryCode
            .toLowerCase()
            .includes(
              transactionCode.toLowerCase()
            )
      );

    }

    /* DESCRIPTION */
    if (description) {

      filtered = filtered.filter(
        (item) =>

          item.categoryDescription &&
          item.categoryDescription
            .toLowerCase()
            .includes(
              description.toLowerCase()
            )
      );

    }

    setFilteredData(filtered);

  };

  /* RESET */
  const handleReset = () => {

    setModule("");

    setBusinessEntity("");

    setStatus("");

    setTransactionCode("");

    setDescription("");

    setFilteredData(transactions);

  };

  /* DELETE */
  const handleDelete = async (id) => {

    try {

      await axios.delete(
        `http://localhost:5000/api/transactions/${id}`
      );

      fetchTransactions();

    } catch (error) {

      console.log(error);

    }

  };

  /* EDIT */
  const handleEdit = (item) => {

    setEditId(item._id);

    setEditData({
      module: item.module,
      businessEntity:
        item.businessEntity,

      transactionCategoryCode:
        item.transactionCategoryCode,

      categoryDescription:
        item.categoryDescription,

      status: item.status,
    });

  };

  /* UPDATE */
  const handleUpdate = async (id) => {

    try {

      await axios.put(
        `http://localhost:5000/api/transactions/${id}`,
        editData
      );

      setEditId(null);

      fetchTransactions();

    } catch (error) {

      console.log(error);

    }

  };

  return (
    <div className="transaction-page">

      <ModuleNavbar />

      {/* TOPBAR */}
      <div className="transaction-topbar">

        <h1>
          Transaction Category
        </h1>

        <button
          className="create-btn"
          onClick={() =>
            navigate("/create-transaction")
          }
        >
          Create ▼
        </button>

      </div>

      {/* SEARCH */}
      <div className="search-container">

        <div className="search-title">
          Search
        </div>

        <div className="search-grid">

          {/* MODULE */}
          <div className="form-group">

            <label>
              Module
            </label>

            <select
              value={module}
              onChange={(e) =>
                setModule(
                  e.target.value
                )
              }
            >

              <option value="">
                - Select -
              </option>

              <option value="Home">
                Home
              </option>

              <option value="Procurement">
                Procurement
              </option>

              <option value="Sales">
                Sales
              </option>

              <option value="Inventory">
                Inventory
              </option>

              <option value="Production">
                Production
              </option>

              <option value="Quality">
                Quality
              </option>

            </select>

          </div>

          {/* BUSINESS ENTITY */}
          <div className="form-group">

            <label>
              Business Entity
            </label>

            <select
              value={businessEntity}
              onChange={(e) =>
                setBusinessEntity(
                  e.target.value
                )
              }
            >

              <option value="">
                - Select -
              </option>

              <option value="Direct GRN">
                Direct GRN
              </option>

              <option value="Bin Transfer">
                Bin Transfer
              </option>

              <option value="Document Upload">
                Document Upload
              </option>

              <option value="FG Revaluation">
                FG Revaluation
              </option>

            </select>

          </div>

          {/* STATUS */}
          <div className="form-group">

            <label>
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            >

              <option value="">
                - Select -
              </option>

              <option value="Open">
                Open
              </option>

              <option value="Closed">
                Closed
              </option>

            </select>

          </div>

          {/* TRANSACTION CATEGORY CODE */}
          <div className="form-group">

            <label>
              Transaction Category Code
            </label>

            <input
              type="text"
              value={transactionCode}
              onChange={(e) =>
                setTransactionCode(
                  e.target.value
                )
              }
            />

          </div>

          {/* DESCRIPTION */}
          <div className="form-group">

            <label>
              Category Description
            </label>

            <input
              type="text"
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            />

          </div>

        </div>

        {/* BUTTONS */}
        <div className="search-buttons">

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

        {/* TABLE */}
        <div className="table-container">

          <table>

            <thead>

              <tr>

                <th>S No</th>

                <th>Module</th>

                <th>Business Entity</th>

                <th>
                  Transaction Category Code
                </th>

                <th>Description</th>

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

                      {/* MODULE */}
                      <td>

                        {editId === item._id ? (

                          <input
                            type="text"
                            value={
                              editData.module
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                module:
                                  e.target.value,
                              })
                            }
                          />

                        ) : (

                          item.module

                        )}

                      </td>

                      {/* BUSINESS ENTITY */}
                      <td>

                        {editId === item._id ? (

                          <input
                            type="text"
                            value={
                              editData.businessEntity
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                businessEntity:
                                  e.target.value,
                              })
                            }
                          />

                        ) : (

                          item.businessEntity

                        )}

                      </td>

                      {/* TRANSACTION CATEGORY CODE */}
                      <td>

                        {editId === item._id ? (

                          <input
                            type="text"
                            value={
                              editData.transactionCategoryCode
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                transactionCategoryCode:
                                  e.target.value,
                              })
                            }
                          />

                        ) : (

                          item.transactionCategoryCode

                        )}

                      </td>

                      {/* DESCRIPTION */}
                      <td>

                        {editId === item._id ? (

                          <input
                            type="text"
                            value={
                              editData.categoryDescription
                            }
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                categoryDescription:
                                  e.target.value,
                              })
                            }
                          />

                        ) : (

                          item.categoryDescription

                        )}

                      </td>

                      {/* STATUS */}
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

                            <option value="Open">
                              Open
                            </option>

                            <option value="Closed">
                              Closed
                            </option>

                          </select>

                        ) : (

                          item.status

                        )}

                      </td>

                      {/* ACTION */}
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
                    colSpan="7"
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

export default Transaction;