import React, {
  useEffect,
  useState,
} from "react";

import axios from "axios";

import "./CreateDocumentSequence.css";

import ModuleNavbar from "../../../../../components/ModuleNavbar/ModuleNavbar";

import { useNavigate } from "react-router-dom";

import { API_URL } from "../../../../../config";

const CreateDocumentSequence = () => {

  const navigate = useNavigate();

  const [transactions, setTransactions] =
    useState([]);

  const [categoryList, setCategoryList] =
    useState([]);

  const [formData, setFormData] =
    useState({

      module: "",

      businessEntity: "",

      transactionCategory: "",

      sequenceFormat: "dd/mm/yyyy",

      incrementNo: 1,

    });

  /* POPUP */
  const [showPopup, setShowPopup] =
    useState(false);

  const [generatedCode, setGeneratedCode] =
    useState("");

  /* FETCH TRANSACTION DATA */
  useEffect(() => {

    fetchTransactions();

  }, []);

  const fetchTransactions = async () => {

    try {

      const response =
        await axios.get(
          `${API_URL}/api/transactions`
        );

      setTransactions(response.data);

    } catch (error) {

      console.log(error);

    }

  };

  /* HANDLE CHANGE */
  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setFormData({

      ...formData,

      [name]: value,

    });

    /* FILTER CATEGORY */
    if (
      name === "businessEntity"
    ) {

      const filtered =
        transactions.filter(
          (item) =>
            item.businessEntity ===
            value
        );

      setCategoryList(filtered);

    }

  };

  /* SAVE */
  const handleSave = async () => {

    try {

      const response =
        await axios.post(
          `${API_URL}/api/create-document-sequence`,
          formData
        );

      console.log(response.data);

      setGeneratedCode(
        response.data.generatedCode
      );

      setShowPopup(true);

    } catch (error) {

      console.log(error);

      alert(
        "Error Saving Data"
      );

    }

  };

  return (

    <div className="cds-page">

      <ModuleNavbar />

      {/* HEADER */}
      <div className="cds-header">

        <div className="cds-left">

          <button
            className="back-btn"
            onClick={() =>
              navigate(
                "/document-sequence"
              )
            }
          >
            ←
          </button>

          <h2>
            Create Document Sequence
          </h2>

        </div>

      </div>

      {/* FORM */}
      <div className="cds-card">

        <div className="cds-grid">

          {/* MODULE */}
          <div className="cds-group">

            <label>
              Module
            </label>

            <select
              name="module"
              value={
                formData.module
              }
              onChange={
                handleChange
              }
            >

              <option value="">
                Select
              </option>

              <option>
                Home
              </option>

              <option>
                Procurement
              </option>

              <option>
                Sales
              </option>

              <option>
                Inventory
              </option>

              <option>
                Production
              </option>

              <option>
                Quality
              </option>

            </select>

          </div>

          {/* BUSINESS ENTITY */}
          <div className="cds-group">

            <label>
              Business Entity
            </label>

            <select
              name="businessEntity"
              value={
                formData.businessEntity
              }
              onChange={
                handleChange
              }
            >

              <option value="">
                Select
              </option>

              {
                [
                  ...new Set(
                    transactions.map(
                      (item) =>
                        item.businessEntity
                    )
                  ),
                ].map(
                  (item, index) => (

                    <option
                      key={index}
                    >
                      {item}
                    </option>

                  )
                )
              }

            </select>

          </div>

          {/* TRANSACTION CATEGORY */}
          <div className="cds-group">

            <label>
              Transaction Category
            </label>

            <select
              name="transactionCategory"
              value={
                formData.transactionCategory
              }
              onChange={
                handleChange
              }
            >

              <option value="">
                Select
              </option>

              {
                categoryList.map(
                  (item, index) => (

                    <option
                      key={index}
                      value={
                        item.categoryDescription
                      }
                    >
                      {
                        item.categoryDescription
                      }
                    </option>

                  )
                )
              }

            </select>

          </div>

          {/* SEQUENCE */}
          <div className="cds-group">

            <label>
              Sequence Format
            </label>

            <select
              name="sequenceFormat"
              value={
                formData.sequenceFormat
              }
              onChange={
                handleChange
              }
            >

              <option>
                dd/mm/yyyy
              </option>

              <option>
                mm/dd/yyyy
              </option>

              <option>
                yyyy/mm/dd
              </option>

            </select>

          </div>

          {/* INCREMENT */}
          <div className="cds-group">

            <label>
              Increment No
            </label>

            <input
              type="number"
              name="incrementNo"
              value={
                formData.incrementNo
              }
              onChange={
                handleChange
              }
            />

          </div>

        </div>

        {/* BUTTON */}
        <div className="cds-actions">

          <button
            className="save-btn"
            onClick={handleSave}
          >
            Save
          </button>

        </div>

      </div>

      {/* POPUP */}
      {
        showPopup && (

          <div className="popup-overlay">

            <div className="popup-box">

              <div className="popup-header">
                Transaction Created
              </div>

              <div className="popup-content">

                <p>
                  Transaction Code Generated
                </p>

                <h2>
                  {generatedCode}
                </h2>

              </div>

              <button
                className="popup-btn"
                onClick={() =>
                  setShowPopup(false)
                }
              >
                OK
              </button>

            </div>

          </div>

        )
      }

    </div>

  );

};

export default CreateDocumentSequence;