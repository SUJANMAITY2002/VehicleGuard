const express = require("express");
const router  = express.Router();
const ServiceMaster = require("../../models/Master/ServiceMaster");

/* CREATE */
router.post("/create-service-master", async (req, res) => {
  try {
    const doc = new ServiceMaster(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Service Master Saved Successfully", data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* READ ALL */
router.get("/service-master", async (req, res) => {
  try {
    const data = await ServiceMaster.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* UPDATE */
router.put("/service-master/:id", async (req, res) => {
  try {
    const updated = await ServiceMaster.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE */
router.delete("/service-master/:id", async (req, res) => {
  try {
    await ServiceMaster.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;