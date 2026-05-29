const express = require("express");

const router = express.Router();

const DocumentSequence =
  require("../models/DocumentSequence");

/* CREATE DOCUMENT SEQUENCE */
router.post(
  "/create-document-sequence",
  async (req, res) => {

    try {

      const {
        module,
        businessEntity,
        transactionCategory,
        sequenceFormat,
        incrementNo,
      } = req.body;

      /* DATE */
      const today = new Date();

      const dd = String(
        today.getDate()
      ).padStart(2, "0");

      const mm = String(
        today.getMonth() + 1
      ).padStart(2, "0");

      const yyyy =
        today.getFullYear();

      /* LAST RECORD */
      const lastRecord =
        await DocumentSequence
          .findOne({
            transactionCategory,
          })
          .sort({ createdAt: -1 });

      let nextNumber = incrementNo;

      if (lastRecord) {

        nextNumber =
          Number(
            lastRecord.incrementNo
          ) + 1;

      }

      /* 0001 */
      const paddedNo =
        String(nextNumber)
          .padStart(4, "0");

      /* DATE FORMAT */
      let datePart = "";

      if (
        sequenceFormat ===
        "dd/mm/yyyy"
      ) {

        datePart =
          `${dd}${mm}${yyyy}`;

      }

      if (
        sequenceFormat ===
        "mm/dd/yyyy"
      ) {

        datePart =
          `${mm}${dd}${yyyy}`;

      }

      if (
        sequenceFormat ===
        "yyyy/mm/dd"
      ) {

        datePart =
          `${yyyy}${mm}${dd}`;

      }

      /* FINAL CODE */
      const generatedCode =
        `${transactionCategory}${datePart}${paddedNo}`;

      /* SAVE */
      const newData =
        new DocumentSequence({

          module,

          businessEntity,

          transactionCategory,

          sequenceFormat,

          incrementNo: nextNumber,

          generatedCode,

        });

      await newData.save();

      res.status(201).json({

        success: true,

        message:
          "Document Sequence Saved",

        generatedCode: generatedCode,

      });

    } catch (error) {

      res.status(500).json({

        success: false,

        message: error.message,

      });

    }

  }
);

/* GET ALL */
router.get(
  "/document-sequence",
  async (req, res) => {

    try {

      const data =
        await DocumentSequence.find();

      res.json(data);

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }

  }
);

module.exports = router;