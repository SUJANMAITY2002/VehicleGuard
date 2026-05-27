const express    = require("express");
const router     = express.Router();
const ItemMaster = require("../models/ItemMaster");

/* GET all items */
router.get("/all", async (req, res) => {
  try {
    const items = await ItemMaster.find({ isActive: true }).sort({ itemName: 1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* GET search (for autocomplete) */
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const items = await ItemMaster.find({
      isActive: true,
      itemName: { $regex: q, $options: "i" },
    }).limit(10);
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* POST add item */
router.post("/add", async (req, res) => {
  try {
    const item = new ItemMaster(req.body);
    const saved = await item.save();
    res.status(201).json({ message: "Item added", item: saved });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: "Item code already exists" });
    if (e.name === "ValidationError") {
      const msg = Object.values(e.errors).map(x => x.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: e.message });
  }
});

/* PUT update item */
router.put("/:id", async (req, res) => {
  try {
    const updated = await ItemMaster.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item updated", item: updated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* DELETE item */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await ItemMaster.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;