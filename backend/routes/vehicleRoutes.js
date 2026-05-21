const express = require("express");
const router  = express.Router();
const Vehicle = require("../models/Vehicle");

/* ── POST /api/vehicle/add ──────────────────── */
router.post("/add", async (req, res) => {
  try {
    const entry = new Vehicle(req.body);
    const saved = await entry.save();
    res.status(201).json({ message: "Entry added successfully", entry: saved });
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: error.message });
  }
});

/* ── GET /api/vehicle/all ───────────────────── */
// Optional query: ?date=YYYY-MM-DD  →  filter by entryDate
router.get("/all", async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      filter.entryDate = req.query.date;   // exact match on "YYYY-MM-DD"
    }
    const entries = await Vehicle.find(filter).sort({ entryDate: -1, entryTime: -1 });
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── DELETE /api/vehicle/delete/:id ─────────── */
router.delete("/delete/:id", async (req, res) => {
  try {
    const deleted = await Vehicle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });
    res.status(200).json({ message: "Entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;