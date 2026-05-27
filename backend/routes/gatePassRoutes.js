const express  = require("express");
const router   = express.Router();
const GatePass = require("../models/GatePass");

/* ── Auto-generate gate pass number ───────────────
   Format: PREFIX + DDMMYYYY + 4-digit seq
   e.g.  ABC220520260001  or  XYZ220520260001
────────────────────────────────────────────────── */
async function generateGatePassNo(prefix) {
  const p = (prefix || "ABC").toUpperCase();
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2, "0");
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const dateStr = `${dd}${mm}${yyyy}`;          // DDMMYYYY
  const base    = `${p}${dateStr}`;             // e.g. ABC22052026

  // Count how many with same prefix+date exist today
  const count = await GatePass.countDocuments({
    gatePassNo: { $regex: `^${base}` },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `${base}${seq}`;                       // e.g. ABC220520260001
}

/* GET auto-generate number  →  /api/gatepass/generate?prefix=ABC */
router.get("/generate", async (req, res) => {
  try {
    const no = await generateGatePassNo(req.query.prefix || "ABC");
    res.json({ gatePassNo: no });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* GET all */
router.get("/all", async (req, res) => {
  try {
    const list = await GatePass.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* GET by gatePassNo */
router.get("/:gatePassNo", async (req, res) => {
  try {
    const doc = await GatePass.findOne({
      gatePassNo: req.params.gatePassNo.toUpperCase(),
    });
    if (!doc) return res.status(404).json({ message: "Gate pass not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* POST save */
router.post("/save", async (req, res) => {
  try {
    const rows = (req.body.rows || []).map((r, i) => ({
      ...r,
      slNo:  i + 1,
      net:   (Number(r.gross) || 0) - (Number(r.tare) || 0),
    }));
    const doc   = new GatePass({ ...req.body, rows });
    const saved = await doc.save();
    res.status(201).json({ message: "Saved successfully", gatePass: saved });
  } catch (e) {
    if (e.code === 11000)
      return res.status(400).json({ message: "Gate Pass No already exists" });
    if (e.name === "ValidationError") {
      const msg = Object.values(e.errors).map(x => x.message).join(", ");
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: e.message });
  }
});

/* PUT update */
router.put("/:id", async (req, res) => {
  try {
    const rows = (req.body.rows || []).map((r, i) => ({
      ...r,
      slNo: i + 1,
      net:  (Number(r.gross) || 0) - (Number(r.tare) || 0),
    }));
    const updated = await GatePass.findByIdAndUpdate(
      req.params.id,
      { ...req.body, rows },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Updated successfully", gatePass: updated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* DELETE */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await GatePass.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted successfully" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;