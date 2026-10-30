import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";
import { API_URL } from "../../../../config";
import "./Heat.css";

const FURNACES    = ["F1", "F2", "F3", "F4"];
const FURNACE_NOS = ["1", "2"];

const Heat = () => {
  const navigate = useNavigate();
  const [heats,    setHeats]    = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [srchFromDate,  setSrchFromDate]  = useState("");
  const [srchToDate,    setSrchToDate]    = useState("");
  const [srchHeatNo,    setSrchHeatNo]    = useState("");
  const [srchFurnace,   setSrchFurnace]   = useState("");
  const [srchFurnaceNo, setSrchFurnaceNo] = useState("");

  const fetchHeats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/heats`);
      setHeats(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => { fetchHeats(); }, []);

  const handleSearch = async () => {
    try {
      const params = {};
      if (srchFromDate)  params.fromDate  = srchFromDate;
      if (srchToDate)    params.toDate    = srchToDate;
      if (srchHeatNo)    params.heatNo    = srchHeatNo;
      if (srchFurnace)   params.furnace   = srchFurnace;
      if (srchFurnaceNo) params.furnaceNo = srchFurnaceNo;
      const res = await axios.get(`${API_URL}/api/heats`, { params });
      setFiltered(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleReset = () => {
    setSrchFromDate("");
    setSrchToDate("");
    setSrchHeatNo("");
    setSrchFurnace("");
    setSrchFurnaceNo("");
    setFiltered(heats);
  };

  return (
    <div className="heat-page">
      <ModuleNavbar />

      {/* TOP BAR */}
      <div className="heat-topbar">
        <div className="heat-topbar-left">
          <button className="heat-back-btn" onClick={() => navigate("/production")}>←</button>
          <h1 className="heat-title">Heat</h1>
        </div>
        <button className="heat-create-btn" onClick={() => navigate("/create-heat")}>
          + Create Heat
        </button>
      </div>

      {/* SEARCH CARD */}
      <div className="heat-search-card">
        <div className="heat-search-title">Search</div>
        <div className="heat-search-grid">

          <div className="heat-field">
            <label>From Date</label>
            <input type="date" className="heat-search-input" value={srchFromDate}
              onChange={(e) => setSrchFromDate(e.target.value)} />
          </div>

          <div className="heat-field">
            <label>To Date</label>
            <input type="date" className="heat-search-input" value={srchToDate}
              onChange={(e) => setSrchToDate(e.target.value)} />
          </div>

          <div className="heat-field">
            <label>Heat No</label>
            <input type="text" className="heat-search-input" value={srchHeatNo}
              onChange={(e) => setSrchHeatNo(e.target.value)} placeholder="Search Heat No…" />
          </div>

          <div className="heat-field">
            <label>Furnace</label>
            <select className="heat-search-input" value={srchFurnace}
              onChange={(e) => setSrchFurnace(e.target.value)}>
              <option value="">- All -</option>
              {FURNACES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="heat-field">
            <label>Furnace No</label>
            <select className="heat-search-input" value={srchFurnaceNo}
              onChange={(e) => setSrchFurnaceNo(e.target.value)}>
              <option value="">- All -</option>
              {FURNACE_NOS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

        </div>
        <div className="heat-search-btns">
          <button className="heat-btn-search" onClick={handleSearch}>Search</button>
          <button className="heat-btn-reset"  onClick={handleReset}>Reset</button>
        </div>
      </div>

      {/* TABLE */}
      <div className="heat-table-card">
        <div className="heat-table-wrap">
          <table className="heat-table">
            <thead>
              <tr>
                <th>S No</th>
                <th>Heat No</th>
                <th>Date</th>
                <th>Furnace</th>
                <th>Furnace No</th>
                <th>Start</th>
                <th>End</th>
                <th>Total Time</th>
                <th>Consume</th>
                <th>Weight</th>
                <th>C</th>
                <th>Si</th>
                <th>Mn</th>
                <th>S</th>
                <th>P</th>
                <th>Attachment</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((h, i) => (
                  <tr
                    key={h._id}
                    onClick={() => navigate(`/heat-detail/${h._id}`)}
                    style={{ cursor: "pointer" }}
                    title="Click to view details"
                  >
                    <td>{i + 1}</td>
                    <td><span className="heat-no-link">{h.heatNo}</span></td>
                    <td>{h.heatDate ? h.heatDate.slice(0, 10) : ""}</td>
                    <td>{h.furnace}</td>
                    <td>{h.furnaceNo}</td>
                    <td>{h.startTime}</td>
                    <td>{h.endTime}</td>
                    <td>{h.totalTime}</td>
                    <td>{h.currentConsume}</td>
                    <td>{h.weight}</td>
                    <td>{h.quality?.c}</td>
                    <td>{h.quality?.si}</td>
                    <td>{h.quality?.mn}</td>
                    <td>{h.quality?.s}</td>
                    <td>{h.quality?.p}</td>
                    <td>
                      {h.attachment?.filePath ? (
                        <a
                          href={`${API_URL}${h.attachment.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          File
                        </a>
                      ) : "-"}
                    </td>
                    <td>{h.remarks || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="17" className="heat-no-data">No Heats found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Heat;