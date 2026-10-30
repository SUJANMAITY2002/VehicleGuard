const express = require("express");
const router = express.Router();

const BundlingProduction =
  require("../../models/Production/BundlingProduction");

/* CREATE */
router.post("/bundling-production", async (req, res) => {
  try {
    const record = new BundlingProduction(req.body);

    await record.save();

    res.status(201).json({
      success: true,
      message: "Bundling Production Saved",
      data: record,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* GET ALL */
router.get("/bundling-production", async (req, res) => {
  try {

    const {
      fromDate,
      toDate,
      bundleEntryNo,
      shift,
      site,
      status,
      product,
    } = req.query;

    const filter = {};

    if (fromDate || toDate) {
      filter.bundleDate = {};

      if (fromDate)
        filter.bundleDate.$gte = fromDate;

      if (toDate)
        filter.bundleDate.$lte = toDate;
    }

    if (bundleEntryNo) {
      filter.bundleEntryNo = {
        $regex: bundleEntryNo,
        $options: "i",
      };
    }

    if (shift)
      filter.shift = shift;

    if (site)
      filter.site = site;

    if (status)
      filter.status = status;

    if (product) {
      filter["inputs.product"] = {
        $regex: product,
        $options: "i",
      };
    }

    const data = await BundlingProduction
      .find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* GET BY ID */
router.get("/bundling-production/:id", async (req, res) => {
  try {

    const data =
      await BundlingProduction.findById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    res.json({
      success: true,
      data,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* UPDATE */
router.put("/bundling-production/:id", async (req, res) => {
  try {

    const updated =
      await BundlingProduction.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          returnDocument: "after",
          runValidators: true,
        }
      );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    res.json({
      success: true,
      message: "Updated Successfully",
      data: updated,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* DELETE */
router.delete("/bundling-production/:id", async (req, res) => {
  try {

    const deleted =
      await BundlingProduction.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    res.json({
      success: true,
      message: "Deleted Successfully",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;