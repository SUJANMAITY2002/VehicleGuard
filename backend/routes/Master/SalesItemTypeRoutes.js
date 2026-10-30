const express = require("express");
const router = express.Router();
const SalesItemType = require("../../models/Master/SalesItemType");

/* CREATE */
router.post("/create-sales-item-type", async (req, res) => {
  try {
    const doc = new SalesItemType(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Sales Item Type Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ALL */
router.get("/sales-item-types", async (req, res) => {
  try {
    const data = await SalesItemType.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ONE by id or itemTypeCode */
router.get("/sales-item-type/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const doc = await SalesItemType.findOne({
      $or: [{ _id: identifier }, { itemTypeCode: identifier }],
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Sales Item Type not found" });
    }
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* UPDATE */
router.put("/sales-item-type/:id", async (req, res) => {
  try {
    const updated = await SalesItemType.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DELETE */
router.delete("/sales-item-type/:id", async (req, res) => {
  try {
    await SalesItemType.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;