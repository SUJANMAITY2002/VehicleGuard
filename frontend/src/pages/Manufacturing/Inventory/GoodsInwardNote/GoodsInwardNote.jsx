import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GoodsInwardNote.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

const GoodsInwardNote = () => {

  const navigate = useNavigate();
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [filters, setFilters] = useState({

    fromDate: "",
    toDate: "",
    vendorCode: "",
    status: "",
    vendorName: "",
    itemType: "",
    itemCategoryCode: "",
    lcBgTrackingNo: "",
    projectCode: "",
    challanDate: "",
    transactionCategory: "",
    itemName: "",
    poCpoNo: "",
    itemGroup: "",
    itemCode: "",
    ginDescription: "",
    ginNumber: "",
    ginType: "",
    site: "",
    challanInvoiceNo: "",

  });

  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {

    setFilters((prev) => ({

      ...prev,
      [e.target.name]: e.target.value,

    }));

  };

  const handleApply = async () => {

    setLoading(true);

    try {

      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {

        if (value) {

          params.append(key, value);

        }

      });

      const response = await fetch(
        `/api/goods-inward-note?${params.toString()}`
      );

      const data = await response.json();

      setResults(Array.isArray(data) ? data : []);

    } catch (error) {

      console.log(error);

      setResults([]);

    } finally {

      setLoading(false);
      setSearched(true);

    }

  };

  const handleReset = () => {

    setFilters({

      fromDate: "",
      toDate: "",
      vendorCode: "",
      status: "",
      vendorName: "",
      itemType: "",
      itemCategoryCode: "",
      lcBgTrackingNo: "",
      projectCode: "",
      challanDate: "",
      transactionCategory: "",
      itemName: "",
      poCpoNo: "",
      itemGroup: "",
      itemCode: "",
      ginDescription: "",
      ginNumber: "",
      ginType: "",
      site: "",
      challanInvoiceNo: "",

    });

    setResults([]);
    setSearched(false);

  };

  const handleDelete = async (id) => {

  if (
    !window.confirm(
      "Delete this record?"
    )
  ) return;

  try {

    await fetch(
      `http://localhost:5000/api/goods-inward-note/${id}`,
      {
        method: "DELETE",
      }
    );

    setResults(
      results.filter(
        (item) => item._id !== id
      )
    );

  } catch (error) {

    console.log(error);

    alert("Delete Failed");

  }

};

const handleUpdate = async () => {

  try {

    console.log("EDIT ID:", editId);
    console.log("EDIT DATA:", editData);

    const response = await fetch(
      `http://localhost:5000/api/goods-inward-note/${editId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editData)
      }
    );

    const data = await response.json();

    console.log("SERVER RESPONSE:", data);

    if (!response.ok) {

      alert(data.message);

      return;

    }

    setResults(

      results.map((item) =>

        item._id === editId
          ? data.data
          : item

      )

    );

    setEditId(null);

    alert("Updated Successfully");

  } catch (error) {

    console.log(error);

    alert("Update Failed");

  }

};

  return (

    <div className="gin-search-page">

      <ModuleNavbar />

      {/* HEADER */}

      <div className="gin-search-header">

        <h2>Goods Inward Note</h2>

        <button
          className="create-btn"
          onClick={() =>
            navigate("/create-goods-inward-note")
          }
        >
          + Create
        </button>

      </div>

      <div className="gin-body">

        {/* FILTER PANEL */}

        <div className="filter-panel">

          <div className="filter-section-title">

            Search Filters

          </div>

          {/* GRID */}

          <div className="filter-grid">

            {/* FROM DATE */}
            <div className="filter-group">

              <label>From Date</label>

              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleChange}
              />

            </div>

            {/* TO DATE */}
            <div className="filter-group">

              <label>To Date</label>

              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleChange}
              />

            </div>

            {/* VENDOR CODE */}
            <div className="filter-group">

              <label>Vendor Code</label>

              <input
                type="text"
                name="vendorCode"
                value={filters.vendorCode}
                onChange={handleChange}
              />

            </div>

            {/* STATUS */}
            <div className="filter-group">

              <label>Status</label>

              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
              >

                <option value="">All</option>
                <option>Open</option>
                <option>Closed</option>

              </select>

            </div>

            {/* VENDOR NAME */}
            <div className="filter-group">

              <label>Vendor Name</label>

              <input
                type="text"
                name="vendorName"
                value={filters.vendorName}
                onChange={handleChange}
              />

            </div>

            {/* ITEM TYPE */}
            <div className="filter-group">

              <label>Item Type</label>

              <select
                name="itemType"
                value={filters.itemType}
                onChange={handleChange}
              >

                <option value="">Select</option>

                <option>
                  Raw Material
                </option>

                <option>
                  Finished Goods
                </option>

              </select>

            </div>

            {/* ITEM CATEGORY */}
            <div className="filter-group">

              <label>Item Category</label>

              <input
                type="text"
                name="itemCategoryCode"
                value={filters.itemCategoryCode}
                onChange={handleChange}
              />

            </div>

            {/* TRACKING NO */}
            <div className="filter-group">

              <label>LC/BG Tracking No</label>

              <input
                type="text"
                name="lcBgTrackingNo"
                value={filters.lcBgTrackingNo}
                onChange={handleChange}
              />

            </div>

            {/* PROJECT CODE */}
            <div className="filter-group">

              <label>Project Code</label>

              <input
                type="text"
                name="projectCode"
                value={filters.projectCode}
                onChange={handleChange}
              />

            </div>

            {/* CHALLAN DATE */}
            <div className="filter-group">

              <label>Challan Date</label>

              <input
                type="date"
                name="challanDate"
                value={filters.challanDate}
                onChange={handleChange}
              />

            </div>

            {/* TRANSACTION CATEGORY */}
            <div className="filter-group">

              <label>Transaction Category</label>

              <input
                type="text"
                name="transactionCategory"
                value={filters.transactionCategory}
                onChange={handleChange}
              />

            </div>

            {/* ITEM NAME */}
            <div className="filter-group">

              <label>Item Name</label>

              <input
                type="text"
                name="itemName"
                value={filters.itemName}
                onChange={handleChange}
              />

            </div>

            {/* PO/CPO NO */}
            <div className="filter-group">

              <label>PO/CPO No</label>

              <input
                type="text"
                name="poCpoNo"
                value={filters.poCpoNo}
                onChange={handleChange}
              />

            </div>

            {/* ITEM GROUP */}
            <div className="filter-group">

              <label>Item Group</label>

              <input
                type="text"
                name="itemGroup"
                value={filters.itemGroup}
                onChange={handleChange}
              />

            </div>

            {/* ITEM CODE */}
            <div className="filter-group">

              <label>Item Code</label>

              <input
                type="text"
                name="itemCode"
                value={filters.itemCode}
                onChange={handleChange}
              />

            </div>

            {/* GIN DESCRIPTION */}
            <div className="filter-group">

              <label>GIN Description</label>

              <input
                type="text"
                name="ginDescription"
                value={filters.ginDescription}
                onChange={handleChange}
              />

            </div>

            {/* GIN NUMBER */}
            <div className="filter-group">

              <label>GIN Number</label>

              <input
                type="text"
                name="ginNumber"
                value={filters.ginNumber}
                onChange={handleChange}
              />

            </div>

            {/* GIN TYPE */}
            <div className="filter-group">

              <label>GIN Type</label>

              <select
                name="ginType"
                value={filters.ginType}
                onChange={handleChange}
              >

                <option value="">Select</option>

                <option>
                  Domestic
                </option>

                <option>
                  International
                </option>

              </select>

            </div>

            {/* SITE */}
            <div className="filter-group">

              <label>Site</label>

              <select
                name="site"
                value={filters.site}
                onChange={handleChange}
              >

                <option value="">
                  Select
                </option>

                <option>
                  Factory Office-GYPMART INDIA
                </option>

              </select>

            </div>

            {/* CHALLAN INVOICE */}
            <div className="filter-group">

              <label>
                Challan Invoice No
              </label>

              <input
                type="text"
                name="challanInvoiceNo"
                value={filters.challanInvoiceNo}
                onChange={handleChange}
              />

            </div>

          </div>

          {/* BUTTONS */}

          <div className="filter-actions">

            <button
              className="reset-btn"
              onClick={handleReset}
            >
              Reset
            </button>

            <button
              className="apply-btn"
              onClick={handleApply}
            >
              {loading
                ? "Searching..."
                : "Apply"}
            </button>

          </div>

        </div>

        {/* RESULT AREA */}

        <div className="result-area">

          {!searched ? (

            <div className="result-placeholder">

              Use filters and click Apply

            </div>

          ) : (

            <div className="result-table-wrap">

              <table>

                <thead>

            <tr>

              <th>#</th>
              <th>GIN No</th>
              <th>GIN Date</th>
              <th>PO/CPO No</th>
              <th>Transaction Category</th>
              <th>Vendor Code</th>
              <th>Vendor Name</th>
              <th>Manufacturer Code</th>
              <th>Manufacturer Name</th>
              <th>Vehicle No</th>
              <th>Delivery Mode</th>
              <th>GIN Type</th>
              <th>Site</th>
              <th>Status</th>
              <th>Challan No</th>
              <th>Challan Date</th>
              <th>Bill Date</th>
              <th>Remarks</th>
              <th>Actions</th>

                    </tr>

                        </thead>

                        <tbody>

                          {results.length > 0 ? (

                            results.map((row, index) => (

                    <tr key={row._id || index}>

                      <td>{index + 1}</td>

                      <td>{row.ginNo}</td>

                       <td>
                        {editId === row._id ? (
                          <input
                            value={editData.ginDate || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                ginDate: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.ginDate
                        )}
                      </td>

                      <td>{row.poCpoNo || "-"}</td>

                      <td>{row.transactionCategory || "-"}</td>

                    <td>
                        {editId === row._id ? (
                          <input
                            value={editData.vendorCode || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                vendorCode: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.vendorCode
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.vendorName || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                vendorName: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.vendorName
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.manufacturerCode || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                manufacturerCode: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.manufacturerCode
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.manufacturerName || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                manufacturerName: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.manufacturerName
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.vehicleNo || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                vehicleNo: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.vehicleNo
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.deliveryMode || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                deliveryMode: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.deliveryMode
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <select
                            value={editData.ginType || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                ginType: e.target.value
                              })
                            }
                          >
                            <option>Domestic</option>
                            <option>International</option>
                          </select>
                        ) : (
                          row.ginType
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.site || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                site: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.site
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <select
                            value={editData.status || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                status: e.target.value
                              })
                            }
                          >
                            <option>Open</option>
                            <option>Closed</option>
                          </select>
                        ) : (
                          row.status
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.challanInvoiceNo || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                challanInvoiceNo: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.challanInvoiceNo
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            type="date"
                            value={editData.challanDate || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                challanDate: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.challanDate
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            type="date"
                            value={editData.billDate || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                billDate: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.billDate
                        )}
                      </td>

                      {/* EDITABLE */}
                      <td>
                        {editId === row._id ? (
                          <input
                            value={editData.remarks || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                remarks: e.target.value
                              })
                            }
                          />
                        ) : (
                          row.remarks
                        )}
                      </td>

                          <td>

                            {editId === row._id ? (

                              <button
                                className="save-btn"
                                onClick={handleUpdate}
                              >
                                Save
                              </button>

                            ) : (

                              <button
                                className="edit-btn"
                                onClick={() => {

                                  setEditId(row._id);

                                  setEditData(row);

                                }}
                              >
                                Edit
                              </button>

                            )}

                            <button
                              className="delete-btn"
                              onClick={() =>
                                handleDelete(row._id)
                              }
                            >
                              Delete
                            </button>

                          </td>

                    </tr>

                    ))

                  ) : (

                    <tr>

                      <td
                        colSpan="19"
                        className="no-data"
                      >
                        No records found
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};

export default GoodsInwardNote;