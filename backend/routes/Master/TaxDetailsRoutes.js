const express = require("express");
const router  = express.Router();
const TaxDetails = require("../../models/Master/TaxDetails");

/* CREATE */
router.post("/create-tax-details", async (req, res) => {
  try {
    const doc = new TaxDetails(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Tax Details Saved Successfully", data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* READ ALL */
router.get("/tax-details", async (req, res) => {
  try {
    const data = await TaxDetails.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* UPDATE */
router.put("/tax-details/:id", async (req, res) => {
  try {
    const updated = await TaxDetails.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE */
router.delete("/tax-details/:id", async (req, res) => {
  try {
    await TaxDetails.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;