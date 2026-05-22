const express      = require("express");
const router       = express.Router();
const ItemEntry    = require("../models/ItemEntry");
const VehicleEntry = require("../models/VehicleEntry");

/* ── POST /api/item/add ─────────────────────── */
router.post("/add", async (req, res) => {
  try {
    const {
      entryNo,
      itemName,
      itemCategory,
      withoutItemWeight,
      withItemWeight,
      remarks,
    } = req.body;

    if (!entryNo) {
      return res.status(400).json({ message: "Entry No is required" });
    }

    // Look up the vehicle entry
    const vehicleEntry = await VehicleEntry.findOne({
      entryNo: entryNo.toString().toUpperCase().trim(),
    });

    if (!vehicleEntry) {
      return res.status(404).json({ message: "Vehicle entry not found for this Entry No" });
    }

    const without = Number(withoutItemWeight);
    const withIt  = Number(withItemWeight);

    if (isNaN(without) || isNaN(withIt)) {
      return res.status(400).json({ message: "Weights must be valid numbers" });
    }

    // Calculate netWeight here — no pre-save hook needed
    const netWeight = withIt - without;

    const item = new ItemEntry({
      entryNo:           vehicleEntry.entryNo,
      vehicleNo:         vehicleEntry.vehicleNo,
      particleNo:        vehicleEntry.particleNo,
      entryDate:         vehicleEntry.entryDate,
      itemName:          itemName?.trim(),
      itemCategory:      itemCategory || "Other",
      withoutItemWeight: without,
      withItemWeight:    withIt,
      netWeight,
      remarks:           remarks?.trim() || "",
    });

    const saved = await item.save();
    res.status(201).json({ message: "Item entry saved successfully", item: saved });

  } catch (error) {
    console.error("POST /api/item/add error:", error);
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

/* ── GET /api/item/all ──────────────────────── */
router.get("/all", async (req, res) => {
  try {
    const items = await ItemEntry.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error("GET /api/item/all error:", error);
    res.status(500).json({ message: error.message });
  }
});

/* ── DELETE /api/item/:id ───────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await ItemEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item entry not found" });
    res.status(200).json({ message: "Item entry deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/item/:id error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;