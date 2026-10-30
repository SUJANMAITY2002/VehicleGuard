const express = require("express");
const router = express.Router();
const ProductionRequest = require("../../models/Production/ProductionRequest");
const ALLOWED_STATUS = ["Pending", "In Production", "Completed"];

/* ══════════════════════════════════════════════
   GET — List / Search Production Requests
══════════════════════════════════════════════ */
router.get("/production-request", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      productionRequestNo,
      demandNo,
      saudaNo,
      itemType,
      itemName,
      status,
    } = req.query;

    const query = {};

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }

    if (productionRequestNo)
      query.productionRequestNo = { $regex: productionRequestNo, $options: "i" };
    if (demandNo) query.demandNo = { $regex: demandNo, $options: "i" };
    if (saudaNo) query.saudaNo = { $regex: saudaNo, $options: "i" };
    if (itemType) query.itemType = { $regex: itemType, $options: "i" };
    if (itemName) query.itemName = { $regex: itemName, $options: "i" };
    if (status) query.status = status;

    const data = await ProductionRequest.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Production Request fetch error:", error);
    res.status(500).json({ success: false, message: "Error Fetching Data: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Single Production Request by ID
══════════════════════════════════════════════ */
router.get("/production-request/:id", async (req, res) => {
  try {
    const data = await ProductionRequest.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   PUT — Update status (Pending → In Production → Completed)
══════════════════════════════════════════════ */
router.put("/production-request/:id", async (req, res) => {
  try {
    if (req.body.status && !ALLOWED_STATUS.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    const updated = await ProductionRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Record Not Found" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    console.error("Production Request update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;