import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Transaction.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import {
  MODULE_BUSINESS_MAP,
  MODULES,
  SOLUTION_MAP,
} from "../../../../module/moduleBusinessMap";

const Transaction = () => {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  /* SEARCH FIELDS */
  const [module, setModule]                   = useState("");
  const [businessEntity, setBusinessEntity]   = useState("");
  const [status, setStatus]                   = useState("");
  const [transactionCode, setTransactionCode] = useState("");
  const [description, setDescription]         = useState("");

  /* EDIT STATE */
  const [editId, setEditId]     = useState(null);
  const [editData, setEditData] = useState({
    module: "",
    businessEntity: "",
    transactionCategoryCode: "",
    categoryDescription: "",
    status: "",
  });

  /* Cascade helpers */
  const searchEntities = module ? MODULE_BUSINESS_MAP[module] || [] : [];
  const editEntities   = editData.module ? MODULE_BUSINESS_MAP[editData.module] || [] : [];

  /* FETCH */
  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/transactions`);
      setTransactions(res.data);
      setFilteredData(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchTransactions(); }, []);

  /* SEARCH */
  const handleSearch = () => {
    let f = [...transactions];
    if (module)          f = f.filter((i) => i.module === module);
    if (businessEntity)  f = f.filter((i) => i.businessEntity === businessEntity);
    if (status)          f = f.filter((i) => i.status?.toLowerCase().includes(status.toLowerCase()));
    if (transactionCode) f = f.filter((i) => i.transactionCategoryCode?.toLowerCase().includes(transactionCode.toLowerCase()));
    if (description)     f = f.filter((i) => i.categoryDescription?.toLowerCase().includes(description.toLowerCase()));
    setFilteredData(f);
  };

  /* RESET */
  const handleReset = () => {
    setModule(""); setBusinessEntity(""); setStatus("");
    setTransactionCode(""); setDescription("");
    setFilteredData(transactions);
  };

  /* DELETE */
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/transaction/${id}`);
      fetchTransactions();
    } catch (err) { console.log(err); }
  };

  /* EDIT */
  const handleEdit = (item) => {
    setEditId(item._id);
    setEditData({
      module:                  item.module,
      businessEntity:          item.businessEntity,
      transactionCategoryCode: item.transactionCategoryCode,
      categoryDescription:     item.categoryDescription,
      status:                  item.status,
    });
  };

  /* UPDATE */
  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/api/transaction/${id}`, editData);
      setEditId(null);
      fetchTransactions();
    } catch (err) { console.log(err); }
  };

  /* Grouped <optgroup> module selector — reused in search + edit */
  const ModuleSelect = ({ value, onChange, placeholder = "- Select -" }) => (
    <select value={value} onChange={onChange}>
      <option value="">{placeholder}</option>
      {Object.entries(SOLUTION_MAP).map(([solution, mods]) => (
        <optgroup key={solution} label={`── ${solution} ──`}>
          {mods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      {/* TOPBAR */}
      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Transaction Category</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-transaction")}>
          Create ▼
        </button>
      </div>

      {/* SEARCH BOX */}
      <div className="search-container">
        <div className="search-title">Search</div>

        <div className="search-grid">

          {/* MODULE — grouped by solution */}
          <div className="form-group">
            <label>Module</label>
            <ModuleSelect
              value={module}
              onChange={(e) => { setModule(e.target.value); setBusinessEntity(""); }}
            />
          </div>

          {/* BUSINESS ENTITY — cascades from module */}
          <div className="form-group">
            <label>Business Entity</label>
            <select
              value={businessEntity}
              onChange={(e) => setBusinessEntity(e.target.value)}
              disabled={!module}
            >
              <option value="">
                {module ? "- Select -" : "- Select Module first -"}
              </option>
              {searchEntities.map((be) => (
                <option key={be} value={be}>{be}</option>
              ))}
            </select>
          </div>

          {/* STATUS */}
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">- Select -</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* TRANSACTION CODE */}
          <div className="form-group">
            <label>Transaction Category Code</label>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
            />
          </div>

          {/* DESCRIPTION */}
          <div className="form-group">
            <label>Category Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                <th>Module</th>
                <th>Business Entity</th>
                <th>Transaction Category Code</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={item._id}>
                    <td>{index + 1}</td>

                    {/* MODULE inline edit */}
                    <td>
                      {editId === item._id ? (
                        <ModuleSelect
                          value={editData.module}
                          onChange={(e) =>
                            setEditData({ ...editData, module: e.target.value, businessEntity: "" })
                          }
                        />
                      ) : item.module}
                    </td>

                    {/* BUSINESS ENTITY inline edit — cascades */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.businessEntity}
                          onChange={(e) =>
                            setEditData({ ...editData, businessEntity: e.target.value })
                          }
                          disabled={!editData.module}
                        >
                          <option value="">- Select -</option>
                          {editEntities.map((be) => (
                            <option key={be} value={be}>{be}</option>
                          ))}
                        </select>
                      ) : item.businessEntity}
                    </td>

                    {/* TRANSACTION CODE */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.transactionCategoryCode}
                          onChange={(e) =>
                            setEditData({ ...editData, transactionCategoryCode: e.target.value })
                          }
                        />
                      ) : item.transactionCategoryCode}
                    </td>

                    {/* DESCRIPTION */}
                    <td>
                      {editId === item._id ? (
                        <input
                          type="text"
                          value={editData.categoryDescription}
                          onChange={(e) =>
                            setEditData({ ...editData, categoryDescription: e.target.value })
                          }
                        />
                      ) : item.categoryDescription}
                    </td>

                    {/* STATUS */}
                    <td>
                      {editId === item._id ? (
                        <select
                          value={editData.status}
                          onChange={(e) =>
                            setEditData({ ...editData, status: e.target.value })
                          }
                        >
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                        </select>
                      ) : item.status}
                    </td>

                    {/* ACTION */}
                    <td>
                      {editId === item._id ? (
                        <button className="save-btn" onClick={() => handleUpdate(item._id)}>
                          Save
                        </button>
                      ) : (
                        <button className="edit-btn" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                      )}
                      <button className="delete-btn" onClick={() => handleDelete(item._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">No Data Found</td>
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