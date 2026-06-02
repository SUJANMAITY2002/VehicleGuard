import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";

import "./DocumentSequence.css";

import ModuleNavbar from "../../../../components/ModuleNavbar/ModuleNavbar";

import { useNavigate } from "react-router-dom";

const DocumentSequence = () => {

  const navigate = useNavigate();

  const [allData, setAllData] =
    useState([]);

  const [filteredData, setFilteredData] =
    useState([]);

  /* SEARCH STATES */
  const [module, setModule] =
    useState("");

  const [businessEntity,
    setBusinessEntity] =
    useState("");

  const [transactionCategory,
    setTransactionCategory] =
    useState("");

  const [transactionCode,
    setTransactionCode] =
    useState("");

  /* FETCH */
  useEffect(() => {

    fetchData();

  }, []);

  const fetchData = async () => {

    try {

      const response =
        await axios.get(
          "/api/document-sequence"
        );

      setAllData(response.data);

      setFilteredData(response.data);

    } catch (error) {

      console.log(error);

    }

  };

  /* SEARCH */
  const handleSearch = () => {

    const result =
      allData.filter((item) => {

        const moduleMatch =

          module === "" ||

          item.module
            ?.toLowerCase()
            .includes(
              module.toLowerCase()
            );

        const businessMatch =

          businessEntity === "" ||

          item.businessEntity
            ?.toLowerCase()
            .includes(
              businessEntity.toLowerCase()
            );

        const categoryMatch =

          transactionCategory === "" ||

          item.transactionCategory
            ?.toLowerCase()
            .includes(
              transactionCategory.toLowerCase()
            );

        const codeMatch =

          transactionCode === "" ||

          item.generatedCode
            ?.toLowerCase()
            .includes(
              transactionCode.toLowerCase()
            );

        return (

          moduleMatch &&
          businessMatch &&
          categoryMatch &&
          codeMatch

        );

      });

    setFilteredData(result);

  };

  /* RESET */
  const handleReset = () => {

    setModule("");

    setBusinessEntity("");

    setTransactionCategory("");

    setTransactionCode("");

    setFilteredData(allData);

  };

  return (

    <div className="document-page">

      <ModuleNavbar />

      {/* HEADER */}
      <div className="document-header">

        <h2>
          Document Sequence
        </h2>

        <button
          className="create-btn"
          onClick={() =>
            navigate(
              "/create-document-sequence"
            )
          }
        >
          Create ▼
        </button>

      </div>

      {/* SEARCH CARD */}
      <div className="document-card">

        <div className="document-grid">

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
                All
              </option>

              {
                [
                  ...new Set(
                    allData.map(
                      item =>
                      item.module
                    )
                  )
                ].map((item,index)=>(

                  <option
                    key={index}
                    value={item}
                  >
                    {item}
                  </option>

                ))
              }

            </select>

          </div>

          {/* BUSINESS ENTITY */}
          <div className="form-group">

            <label>
              Business Entity
            </label>

            <select
              value={businessEntity}
              onChange={(e)=>
                setBusinessEntity(
                  e.target.value
                )
              }
            >

              <option value="">
                All
              </option>

              {
                [
                  ...new Set(
                    allData.map(
                      item =>
                      item.businessEntity
                    )
                  )
                ].map((item,index)=>(

                  <option
                    key={index}
                    value={item}
                  >
                    {item}
                  </option>

                ))
              }

            </select>

          </div>

          {/* TRANSACTION CATEGORY */}
          <div className="form-group">

            <label>
              Transaction Category
            </label>

            <select
              value={transactionCategory}
              onChange={(e)=>
                setTransactionCategory(
                  e.target.value
                )
              }
            >

              <option value="">
                All
              </option>

              {
                [
                  ...new Set(
                    allData.map(
                      item =>
                      item.transactionCategory
                    )
                  )
                ].map((item,index)=>(

                  <option
                    key={index}
                    value={item}
                  >
                    {item}
                  </option>

                ))
              }

            </select>

          </div>

          {/* TRANSACTION CODE */}
          <div className="form-group">

            <label>
              Transaction Code
            </label>

            <input
              type="text"
              value={transactionCode}
              onChange={(e)=>
                setTransactionCode(
                  e.target.value
                )
              }
              placeholder="Enter Code"
            />

          </div>

        </div>

        {/* BUTTONS */}
        <div className="button-section">

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

      </div>

      {/* TABLE */}
      <div className="result-table">

        <table>

          <thead>

            <tr>

              <th>
                Module
              </th>

              <th>
                Business Entity
              </th>

              <th>
                Transaction Category
              </th>

              <th>
                Sequence Format
              </th>

              <th>
                Increment
              </th>

              <th>
                Transaction Code
              </th>

            </tr>

          </thead>

          <tbody>

            {
              filteredData.length > 0
              ? (

                filteredData.map(
                  (item) => (

                    <tr key={item._id}>

                      <td>
                        {item.module}
                      </td>

                      <td>
                        {
                          item.businessEntity
                        }
                      </td>

                      <td>
                        {
                          item.transactionCategory
                        }
                      </td>

                      <td>
                        {
                          item.sequenceFormat
                        }
                      </td>

                      <td>
                        {
                          item.incrementNo
                        }
                      </td>

                      <td className="code-cell">
                        {
                          item.generatedCode
                        }
                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan="6"
                    className="no-data"
                  >
                    No Data Found
                  </td>

                </tr>

              )
            }

          </tbody>

        </table>

      </div>

    </div>

  );

};

export default DocumentSequence;