const express = require("express");
const router  = express.Router();
const ItemClass = require("../../models/Master/ItemClass");

/* CREATE */
router.post("/create-item-class", async (req, res) => {
  try {
    const doc = new ItemClass(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Item Class Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ALL */
router.get("/item-classes", async (req, res) => {
  try {
    const data = await ItemClass.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* UPDATE */
router.put("/item-class/:id", async (req, res) => {
  try {
    const updated = await ItemClass.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DELETE */
router.delete("/item-class/:id", async (req, res) => {
  try {
    await ItemClass.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;