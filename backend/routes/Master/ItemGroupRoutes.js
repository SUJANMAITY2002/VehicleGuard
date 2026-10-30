const express = require("express");
const router = express.Router();
const ItemType = require("../../models/Master/ItemGroup");

router.post("/create-item-group", async (req, res) => {
  try {
    const doc = new ItemType(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Item Type Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/item-group", async (req, res) => {
  try {
    const data = await ItemType.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/item-group/:id", async (req, res) => {
  try {
    const updated = await ItemType.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/item-group/:id", async (req, res) => {
  try {
    await ItemType.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;