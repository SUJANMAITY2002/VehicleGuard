const express        = require("express");
const router         = express.Router();
const ItemTaxClass   = require("../../models/Master/ItemTaxClass");

/* CREATE */
router.post("/create-item-tax-class", async (req, res) => {
  try {
    const doc = new ItemTaxClass(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Item Tax Class Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ALL */
router.get("/item-tax-classes", async (req, res) => {
  try {
    const docs = await ItemTaxClass.find().sort({ createdAt: -1 });
    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ONE */
router.get("/item-tax-class/:id", async (req, res) => {
  try {
    const doc = await ItemTaxClass.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Item Tax Class not found" });
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* UPDATE */
router.put("/item-tax-class/:id", async (req, res) => {
  try {
    const updated = await ItemTaxClass.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* DELETE */
router.delete("/item-tax-class/:id", async (req, res) => {
  try {
    await ItemTaxClass.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;