const express = require("express");
const router = express.Router();

const Transaction = require("../models/Transaction");

/* CREATE */

router.post("/create-transaction", async (req, res) => {
  try {

    const transaction = new Transaction(req.body);

    await transaction.save();

    res.status(201).json({
      success: true,
      message: "Transaction Saved Successfully",
      data: transaction,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
});

/* GET ALL */

router.get("/transactions", async (req, res) => {

  try {

    const transactions =
      await Transaction.find()
      .sort({ createdAt: -1 });

    res.status(200).json(transactions);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

});

/* SEARCH */

router.get("/transactions/search", async (req, res) => {

  try {

    const {
      module,
      businessEntity,
      status,
    } = req.query;

    let query = {};

    if (module) {
      query.module = module;
    }

    if (businessEntity) {
      query.businessEntity = businessEntity;
    }

    if (status) {
      query.status = status;
    }

    const data =
      await Transaction.find(query);

    res.status(200).json(data);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

});

/* DELETE */

router.delete(
  "/transaction/:id",
  async (req, res) => {

    try {

      await Transaction.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
        "Deleted Successfully",
      });

    } catch (error) {

      res.status(500).json({
        message: error.message,
      });

    }

  }
);

module.exports = router;