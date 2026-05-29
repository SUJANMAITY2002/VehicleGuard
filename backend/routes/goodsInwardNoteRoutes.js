const express = require("express");
const router = express.Router();

const GoodsInwardNote =
require("../models/GoodsInwardNote");

/* TEST ROUTE */

router.get(
  "/test-gin",
  (req, res) => {

    res.json({
      success: true,
      message:
      "Goods Inward Note Route Working"
    });

  }
);

/* SAVE */

router.post(
  "/goods-inward-note",
  async (req, res) => {

    try {

      const newGIN =
      new GoodsInwardNote(req.body);

      await newGIN.save();

      res.status(201).json({

        success: true,

        message:
        "Goods Inward Note Saved Successfully",

        data: newGIN

      });

    }
    catch (error) {

      console.log(error);

      res.status(500).json({

        success: false,

        message:
        "Error Saving Goods Inward Note"

      });

    }

  }
);

/* GET ALL WITH FILTERS */

router.get(
  "/goods-inward-note",
  async (req, res) => {

    try {

      const {
        fromDate,
        toDate,
        vendorCode,
        status,
        vendorName,
        transactionCategory,
        poCpoNo,
        ginDescription,
        ginNumber,
        ginType,
        site,
        challanInvoiceNo,
        challanDate,
        itemType,
        itemCategoryCode,
        lcBgTrackingNo,
        projectCode,
        itemName,
        itemGroup,
        itemCode,
      } = req.query;

      const query = {};

      /* DATE RANGE ON ginDate */
      if (fromDate || toDate) {
        query.ginDate = {};
        if (fromDate) query.ginDate.$gte = fromDate;
        if (toDate) query.ginDate.$lte = toDate;
      }

      if (vendorCode)
        query.vendorCode = { $regex: vendorCode, $options: "i" };

      if (status)
        query.status = status;

      if (vendorName)
        query.vendorName = { $regex: vendorName, $options: "i" };

      if (transactionCategory)
        query.transactionCategory = { $regex: transactionCategory, $options: "i" };

      if (poCpoNo)
        query.poCpoNo = { $regex: poCpoNo, $options: "i" };

      if (ginDescription)
        query.ginDescription = { $regex: ginDescription, $options: "i" };

      if (ginNumber)
        query.ginNo = { $regex: ginNumber, $options: "i" };

      if (ginType)
        query.ginType = ginType;

      if (site)
        query.site = site;

      if (challanInvoiceNo)
        query.challanInvoiceNo = { $regex: challanInvoiceNo, $options: "i" };

      if (challanDate)
        query.challanDate = challanDate;

      const data =
        await GoodsInwardNote.find(query)
        .sort({ createdAt: -1 });

      res.status(200).json(data);

    }
    catch (error) {

      res.status(500).json({

        success: false,

        message:
        "Error Fetching Data"

      });

    }

  }
);

/* GET SINGLE */

router.get(
  "/goods-inward-note/:id",
  async (req, res) => {

    try {

      const data =
      await GoodsInwardNote.findById(
        req.params.id
      );

      res.json(data);

    }
    catch (error) {

      res.status(500).json({

        success: false,

        message:
        error.message

      });

    }

  }
);

/* DELETE */

router.delete(
  "/goods-inward-note/:id",
  async (req, res) => {

    try {

      await GoodsInwardNote.findByIdAndDelete(
        req.params.id
      );

      res.json({

        success: true,

        message:
        "Deleted Successfully"

      });

    }
    catch (error) {

      res.status(500).json({

        success: false,

        message:
        error.message

      });

    }

  }
);
router.put(
  "/goods-inward-note/:id",
  async (req, res) => {

    try {

      console.log("PUT REQUEST");
      console.log("ID:", req.params.id);
      console.log("BODY:", req.body);

      const updatedData =
      await GoodsInwardNote.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedData) {

        return res.status(404).json({
          success: false,
          message: "Record Not Found"
        });

      }

      res.json({
        success: true,
        message: "Updated Successfully",
        data: updatedData
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

  }
);

module.exports = router;