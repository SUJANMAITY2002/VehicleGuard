import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../MasterShared.css";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";

const today = new Date().toISOString().split("T")[0];
const fmt = (value) => Number(value || 0).toLocaleString("en-IN");

const SchemeMaster = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [filters, setFilters] = useState({
    schemeName: "",
    item: "",
    activeDate: today,
    cost: "",
  });
  const [calcResult, setCalcResult] = useState(null);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/schemes`);
      setData(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchItemTypes = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/item-types`);
      setItemTypes(res.data.filter((item) => item.status === "Active"));
    } catch (err) {
      console.log("Error loading item types:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchItemTypes();
  }, []);

  const isActiveOnDate = (row, date) => {
    if (!date) return true;
    const startsBefore = !row.startDate || row.startDate <= date;
    const endsAfter = !row.endDate || row.endDate >= date;
    return startsBefore && endsAfter;
  };

  const applyFilters = (nextFilters) => {
    let result = [...data];

    if (nextFilters.schemeName) {
      result = result.filter((row) =>
        row.schemeName?.toLowerCase().includes(nextFilters.schemeName.toLowerCase())
      );
    }

    if (nextFilters.item) {
      result = result.filter((row) =>
        row.item?.toLowerCase().includes(nextFilters.item.toLowerCase())
      );
    }

    if (nextFilters.activeDate) {
      result = result.filter((row) => isActiveOnDate(row, nextFilters.activeDate));
    }

    setFiltered(result);
    return result;
  };

  const handleFilterChange = (field, value) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    setCalcResult(null);
    applyFilters(nextFilters);
  };

  const handleSearch = () => {
    applyFilters(filters);
  };

  const handleReset = () => {
    const resetFilters = { schemeName: "", item: "", activeDate: today, cost: "" };
    setFilters(resetFilters);
    setCalcResult(null);
    setFiltered(data.filter((row) => isActiveOnDate(row, today)));
  };

  const handleCalculate = () => {
    if (!filters.schemeName || !filters.item || !filters.activeDate || !filters.cost) {
      return alert("Fill Scheme, Item, Date and Cost.");
    }

    const activePlan = data.find((row) =>
      row.schemeName?.toLowerCase() === filters.schemeName.toLowerCase() &&
      row.item?.toLowerCase() === filters.item.toLowerCase() &&
      row.status === "Active" &&
      isActiveOnDate(row, filters.activeDate)
    );

    if (!activePlan) {
      return alert("No active plan found for this Scheme, Item and Date.");
    }

    const cost = Number(filters.cost);
    const logicAmount = Number(activePlan.logicAmount || 0);
    setCalcResult({
      schemeName: activePlan.schemeName,
      description: activePlan.description,
      item: activePlan.item,
      cost,
      logicAmount,
      finalPrice: cost + logicAmount,
    });
  };

  return (
    <div className="transaction-page">
      <ModuleNavbar />

      <div className="transaction-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate(-1)}>←</button>
          <h1>Scheme Master</h1>
        </div>
        <button className="create-btn" onClick={() => navigate("/create-scheme")}>
          Create
        </button>
      </div>

      <div className="search-container">
        <div className="search-title">Active Plan Search</div>

        <div className="search-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="form-group">
            <label>Scheme</label>
            <input
              type="text"
              value={filters.schemeName}
              onChange={(e) => handleFilterChange("schemeName", e.target.value)}
              placeholder="e.g. Raipur"
            />
          </div>

          <div className="form-group">
            <label>Item</label>
            <select
              value={filters.item}
              onChange={(e) => handleFilterChange("item", e.target.value)}
            >
              <option value="">- Select Item -</option>
              {itemTypes.map((itemType) => (
                <option key={itemType._id} value={itemType.itemTypes}>
                  {itemType.itemTypes}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={filters.activeDate}
              onChange={(e) => handleFilterChange("activeDate", e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Cost</label>
            <input
              type="number"
              value={filters.cost}
              onChange={(e) => handleFilterChange("cost", e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
        </div>

        <div className="button-group">
          <button className="search-btn" onClick={handleSearch}>Search</button>
          <button className="search-btn" onClick={handleCalculate}>Calculate</button>
          <button className="reset-btn" onClick={handleReset}>Reset</button>
        </div>

        {calcResult && (
          <div className="calc-result-box">
            <div className="calc-result-row">
              <span className="calc-label">Active Plan</span>
              <span className="calc-value">{calcResult.schemeName} / Item {calcResult.item}</span>
            </div>
            <div className="calc-result-row">
              <span className="calc-label">Description</span>
              <span className="calc-value">{calcResult.description || "-"}</span>
            </div>
            <div className="calc-result-row">
              <span className="calc-label">Cost</span>
              <span className="calc-value">Rs {fmt(calcResult.cost)}</span>
            </div>
            <div className="calc-result-row">
              <span className="calc-label">Logic</span>
              <span className="calc-value offset-add">X + {fmt(calcResult.logicAmount)}</span>
            </div>
            <div className="calc-result-row total-row">
              <span className="calc-label">Final Price</span>
              <span className="calc-value final-price">Rs {fmt(calcResult.finalPrice)}</span>
            </div>
          </div>
        )}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>S No</th>
                <th>Scheme</th>
                <th>Description</th>
                <th>Item</th>
                <th>Logic</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((row, index) => (
                  <tr key={row._id}>
                    <td>{index + 1}</td>
                    <td>{row.schemeName}</td>
                    <td>{row.description || "-"}</td>
                    <td>{row.item}</td>
                    <td>X + {fmt(row.logicAmount)}</td>
                    <td>{row.startDate || "-"}</td>
                    <td>{row.endDate || "-"}</td>
                    <td>{isActiveOnDate(row, filters.activeDate) && row.status === "Active" ? "Active Plan" : row.status}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="no-data">No Active Plan Found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SchemeMaster;