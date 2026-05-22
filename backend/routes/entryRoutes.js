const express = require("express");
const router = express.Router();
const VehicleEntry = require("../models/VehicleEntry");

/* ── Auto-generate entry number ─────────────── */
async function generateEntryNo() {
  const today = new Date();
  const yy = String(today.getFullYear()).slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const prefix = `VE${yy}${mm}${dd}`;

  // Count today's entries to make sequential suffix
  const count = await VehicleEntry.countDocuments({
    entryNo: { $regex: `^${prefix}` },
  });
  const seq = String(count + 1).padStart(3, "0");
  return `${prefix}${seq}`;
}

/* ── POST /api/entry/add ────────────────────── */
router.post("/add", async (req, res) => {
  try {
    const { entryDate, vehicleNo, particleNo } = req.body;
    const entryNo = await generateEntryNo();

    const entry = new VehicleEntry({ entryNo, entryDate, vehicleNo, particleNo });
    const saved = await entry.save();
    res.status(201).json({ message: "Entry added successfully", entry: saved });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Entry number already exists. Try again." });
    }
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors).map((e) => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: error.message });
  }
});

/* ── GET /api/entry/all ─────────────────────── */
router.get("/all", async (req, res) => {
  try {
    const entries = await VehicleEntry.find().sort({ createdAt: -1 });
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── GET /api/entry/:entryNo ────────────────── */
router.get("/:entryNo", async (req, res) => {
  try {
    const entry = await VehicleEntry.findOne({ entryNo: req.params.entryNo.toUpperCase() });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.status(200).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ── DELETE /api/entry/:id ──────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await VehicleEntry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Entry not found" });
    res.status(200).json({ message: "Entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;