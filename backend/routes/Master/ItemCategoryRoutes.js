const express = require("express");
const router = express.Router();
const ItemCategory = require("../../models/Master/ItemCategory");

/* CREATE */
router.post("/create-item-category", async (req, res) => {
  try {
    const doc = new ItemCategory(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Item Category Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ALL */
router.get("/item-categories", async (req, res) => {
  try {
    const data = await ItemCategory.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* UPDATE */
router.put("/item-category/:id", async (req, res) => {
  try {
    const updated = await ItemCategory.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DELETE */
router.delete("/item-category/:id", async (req, res) => {
  try {
    await ItemCategory.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;