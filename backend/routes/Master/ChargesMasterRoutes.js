const express = require("express");
const router  = express.Router();
const ChargesMaster = require("../../models/Master/ChargesMaster");

/* CREATE */
router.post("/create-charges-master", async (req, res) => {
  try {
    const doc = new ChargesMaster(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Charges/Discount Master Saved Successfully", data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* READ ALL */
router.get("/charges-master", async (req, res) => {
  try {
    const data = await ChargesMaster.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* UPDATE */
router.put("/charges-master/:id", async (req, res) => {
  try {
    const updated = await ChargesMaster.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE */
router.delete("/charges-master/:id", async (req, res) => {
  try {
    await ChargesMaster.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;