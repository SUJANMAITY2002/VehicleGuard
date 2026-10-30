const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const Heat        = require("../../models/Production/Heat");
const HeatCounter = require("../../models/Production/HeatCounter");

/* ════════════════════════════════════════════
   FILE UPLOAD — attachments saved to /uploads/heat
   server.js must serve this folder statically:
     app.use("/uploads", express.static(path.join(__dirname, "uploads")));
════════════════════════════════════════════ */
const uploadDir = path.join(__dirname, "..", "..", "uploads", "heat");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */

/* 3-digit day-of-year, same convention already used elsewhere in this app
   (Document Sequence "julian" format): Jan 1 → 001 */
const julianDay = (d) => {
  const start  = new Date(d.getFullYear(), 0, 0);
  const oneDay = 1000 * 60 * 60 * 24;
  return String(Math.floor((d - start) / oneDay)).padStart(3, "0");
};

const dateKey = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/* EX-HE 212 F1 1 01 → EX-HE212F1101 */
const buildHeatNo = (doy, furnace, furnaceNo, seq) =>
  `EX-HE${doy}${furnace}${furnaceNo}${String(seq).padStart(2, "0")}`;

const computeTotalTime = (start, end) => {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // crosses midnight
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

/* ════════════════════════════════════════════
   GET /api/heats — search / list
   Query: fromDate, toDate, heatNo, furnace, furnaceNo
════════════════════════════════════════════ */
router.get("/heats", async (req, res) => {
  try {
    const { fromDate, toDate, heatNo, furnace, furnaceNo } = req.query;
    const q = {};
    if (heatNo)    q.heatNo    = { $regex: heatNo, $options: "i" };
    if (furnace)   q.furnace   = furnace;
    if (furnaceNo) q.furnaceNo = furnaceNo;
    if (fromDate || toDate) {
      q.heatDate = {};
      if (fromDate) q.heatDate.$gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate)   q.heatDate.$lte = new Date(`${toDate}T23:59:59.999Z`);
    }
    const heats = await Heat.find(q).sort({ heatDate: -1, createdAt: -1 });
    res.json(heats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ════════════════════════════════════════════
   GET /api/heats/next-heat-no — PREVIEW ONLY
   Does not reserve a number. The authoritative Heat No is
   assigned atomically inside POST /api/heats.
════════════════════════════════════════════ */
router.get("/heats/next-heat-no", async (req, res) => {
  try {
    const { furnace, furnaceNo } = req.query;
    if (!furnace || !furnaceNo) {
      return res.status(400).json({ message: "furnace and furnaceNo are required" });
    }
    const now = new Date();
    const counter = await HeatCounter.findOne({ dateKey: dateKey(now) });
    const nextSeq = (counter?.seq || 0) + 1;
    res.json({ heatNo: buildHeatNo(julianDay(now), furnace, furnaceNo, nextSeq) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ════════════════════════════════════════════
   GET /api/heats/:id
════════════════════════════════════════════ */
router.get("/heats/:id", async (req, res) => {
  try {
    const heat = await Heat.findById(req.params.id);
    if (!heat) return res.status(404).json({ message: "Heat not found" });
    res.json(heat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ════════════════════════════════════════════
   POST /api/heats — create
   multipart/form-data (attachment is optional)
════════════════════════════════════════════ */
router.post("/heats", upload.single("attachment"), async (req, res) => {
  try {
    const {
      furnace, furnaceNo, startTime, endTime,
      currentConsume, weight, c, si, mn, s, p, remarks,
    } = req.body;

    if (!furnace)   return res.status(400).json({ message: "Furnace is required" });
    if (!furnaceNo) return res.status(400).json({ message: "Furnace No is required" });
    if (!startTime) return res.status(400).json({ message: "Start Time is required" });
    if (!endTime)   return res.status(400).json({ message: "End Time is required" });

    const now = new Date();
    const key = dateKey(now);

    /* Atomic per-day increment — safe under concurrent "Save" clicks.
       Each day starts a fresh sequence from 1 (dateKey changes daily). */
    const counter = await HeatCounter.findOneAndUpdate(
      { dateKey: key },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );

    const doy    = julianDay(now);
    const heatNo = buildHeatNo(doy, furnace, furnaceNo, counter.seq);

    const heat = await Heat.create({
      heatNo,
      heatDate: now,
      julianDay: Number(doy),
      seqNo: counter.seq,
      furnace,
      furnaceNo,
      startTime,
      endTime,
      totalTime: computeTotalTime(startTime, endTime),
      currentConsume: Number(currentConsume) || 0,
      weight: Number(weight) || 0,
      quality: {
        c:  Number(c)  || 0,
        si: Number(si) || 0,
        mn: Number(mn) || 0,
        s:  Number(s)  || 0,
        p:  Number(p)  || 0,
      },
      attachment: req.file
        ? { fileName: req.file.originalname, filePath: `/uploads/heat/${req.file.filename}` }
        : undefined,
      remarks: remarks || "",
    });

    res.status(201).json(heat);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate Heat No — please try saving again." });
    }
    res.status(500).json({ message: err.message });
  }
});

/* ════════════════════════════════════════════
   PUT /api/heats/:id — edit
   Heat No / julianDay / seqNo are never regenerated on edit.
════════════════════════════════════════════ */
router.put("/heats/:id", upload.single("attachment"), async (req, res) => {
  try {
    const heat = await Heat.findById(req.params.id);
    if (!heat) return res.status(404).json({ message: "Heat not found" });

    const {
      furnace, furnaceNo, startTime, endTime,
      currentConsume, weight, c, si, mn, s, p, remarks,
    } = req.body;

    if (furnace)   heat.furnace   = furnace;
    if (furnaceNo) heat.furnaceNo = furnaceNo;
    if (startTime) heat.startTime = startTime;
    if (endTime)   heat.endTime   = endTime;
    heat.totalTime = computeTotalTime(heat.startTime, heat.endTime);

    if (currentConsume !== undefined) heat.currentConsume = Number(currentConsume) || 0;
    if (weight !== undefined)         heat.weight         = Number(weight) || 0;

    heat.quality = {
      c:  c  !== undefined ? Number(c)  || 0 : heat.quality?.c  || 0,
      si: si !== undefined ? Number(si) || 0 : heat.quality?.si || 0,
      mn: mn !== undefined ? Number(mn) || 0 : heat.quality?.mn || 0,
      s:  s  !== undefined ? Number(s)  || 0 : heat.quality?.s  || 0,
      p:  p  !== undefined ? Number(p)  || 0 : heat.quality?.p  || 0,
    };

    if (remarks !== undefined) heat.remarks = remarks;
    if (req.file) {
      heat.attachment = { fileName: req.file.originalname, filePath: `/uploads/heat/${req.file.filename}` };
    }

    await heat.save();
    res.json(heat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ════════════════════════════════════════════
   DELETE /api/heats/:id
════════════════════════════════════════════ */
router.delete("/heats/:id", async (req, res) => {
  try {
    const heat = await Heat.findByIdAndDelete(req.params.id);
    if (!heat) return res.status(404).json({ message: "Heat not found" });
    res.json({ message: "Heat deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;