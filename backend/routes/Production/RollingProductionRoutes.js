const express = require("express");
const router  = express.Router();
const RollingProduction = require("../../models/Production/RollingProduction");

/* ── CREATE ── */
router.post("/rolling-production", async (req, res) => {
  try {
    const { rollingNo, inputs, outputs } = req.body;
    if (!rollingNo)            return res.status(400).json({ success: false, message: "Rolling No is required" });
    if (!inputs?.length)       return res.status(400).json({ success: false, message: "At least one input billet is required" });
    if (!outputs?.length)      return res.status(400).json({ success: false, message: "At least one output product is required" });
    if (await RollingProduction.findOne({ rollingNo }))
      return res.status(400).json({ success: false, message: "Rolling No already exists" });

    const rec = new RollingProduction(req.body);
    await rec.save();
    res.status(201).json({ success: true, message: "Rolling Production saved", data: rec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET ALL (with filters) ── */
router.get("/rolling-production", async (req, res) => {
  try {
    const { fromDate, toDate, rollingNo, shift, site, status, product } = req.query;
    const filter = {};
    if (fromDate || toDate) {
      filter.rollingDate = {};
      if (fromDate) filter.rollingDate.$gte = fromDate;
      if (toDate)   filter.rollingDate.$lte = toDate;
    }
    if (rollingNo) filter.rollingNo = { $regex: rollingNo, $options: "i" };
    if (shift)     filter.shift     = shift;
    if (site)      filter.site      = site;
    if (status)    filter.status    = status;
    if (product)   filter["outputs.productName"] = { $regex: product, $options: "i" };

    const data = await RollingProduction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET BY ID ── */
router.get("/rolling-production/:id", async (req, res) => {
  try {
    const data = await RollingProduction.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── UPDATE ── */
router.put("/rolling-production/:id", async (req, res) => {
  try {
    const updated = await RollingProduction.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after", runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Updated successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── DELETE ── */
router.delete("/rolling-production/:id", async (req, res) => {
  try {
    const deleted = await RollingProduction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;