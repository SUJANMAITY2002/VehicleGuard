const express = require("express");
const router = express.Router();
const ProductionDetails = require("../../models/Master/ProductionDetails");

router.post("/create-production-details", async (req, res) => {
  try {
    const doc = new ProductionDetails(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Production Details Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/production-details", async (req, res) => {
  try {
    const data = await ProductionDetails.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/production-details/:id", async (req, res) => {
  try {
    const updated = await ProductionDetails.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/production-details/:id", async (req, res) => {
  try {
    await ProductionDetails.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;