const express = require("express");
const router  = express.Router();
const Demand = require("../../models/Sales/Demand");
const Sauda  = require("../../models/Sales/Sauda");
const DocumentSequence = require("../../models/Master/DocumentSequence");
const { generateDueProductionRequests, createProductionRequestsForDemand } = require("../../utils/productionRequestGenerator");

const ALLOWED_STATUS = ["Pending", "Production Requested", "Ready", "Dispatched"];

/* ── 2-digit year date builder — mirrors Sauda / Document Sequence routes ── */
const buildDatePart = (format) => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yy = String(today.getFullYear()).slice(-2);

  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    const year   = today.getFullYear();
    const start  = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy    = String(Math.floor((today - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`;
};

/* ══════════════════════════════════════════════
   GET — Confirmed Saudas available to raise a Demand from
   (used by the Sauda-picker on Create Demand)
══════════════════════════════════════════════ */
router.get("/demand/source-saudas", async (req, res) => {
  try {
    const saudas = await Sauda.find({ status: "Confirmed" }).sort({ createdAt: -1 });
    res.json(saudas);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Generate next Demand number
   Looks up a Document Sequence record for
   module="Sales", businessEntity="Demand Entry"
   (this is only a PREVIEW — the counter is actually
   consumed/advanced in POST /demand below)
══════════════════════════════════════════════ */
router.get("/demand/next-sequence", async (req, res) => {
  try {
    const { entityPrefix } = req.query;
    const prefix = (entityPrefix || "DE").toString().trim().toUpperCase();

    const lastRecord = await DocumentSequence
      .findOne({ module: "Sales", businessEntity: "Demand Entry", entityPrefix: prefix })
      .sort({ createdAt: -1 });

    if (!lastRecord) {
      /* Fall back to a simple running count if no sequence master exists yet,
         so the Create Demand page never blocks on missing master data. */
      const count = await Demand.countDocuments();
      const datePart = buildDatePart("dd/mm/yy");
      return res.json({
        success: true,
        nextCode: `${prefix}${datePart}${String(count + 1).padStart(2, "0")}`,
        fallback: true,
      });
    }

    const digits   = Math.max(1, Number(lastRecord.sequenceDigits) || 2);
    const step     = Math.max(1, Number(lastRecord.incrementStep) || 1);
    const nextNo   = Number(lastRecord.incrementNo) + step;
    const paddedNo = String(nextNo).padStart(digits, "0");
    const datePart = lastRecord.useDateFragment ? buildDatePart(lastRecord.sequenceFormat) : "";
    const nextCode = `${prefix}${datePart}${paddedNo}`;

    res.json({ success: true, nextCode, nextIncrement: nextNo, sequenceId: lastRecord._id });
  } catch (error) {
    console.error("demand next-sequence error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   POST — Create new Demand (from a Confirmed Sauda)
══════════════════════════════════════════════ */
router.post("/demand", async (req, res) => {
  try {
    const prefix = (req.body.entityPrefix || "DE").toString().trim().toUpperCase();

    /* ── Demand No. resolution ──
       Create Demand now generates the number itself, up front, via
       Transaction Category → /api/create-document-sequence (same
       pattern Create Inward/Outward uses for the GIN No., and Create
       Sauda now uses for the Sauda No.) — that call already atomically
       advances the sequence, so if the frontend sends a demandNo we
       trust it as-is and must NOT increment again here.
       The legacy auto-generate block below only runs as a fallback for
       callers that don't send a demandNo at all (e.g. direct API use). */
    let demandNo = req.body.demandNo;

    if (!demandNo) {
      const seqRecord = await DocumentSequence
        .findOne({ module: "Sales", businessEntity: "Demand Entry", entityPrefix: prefix })
        .sort({ createdAt: -1 });

      if (seqRecord) {
        const digits = Math.max(1, Number(seqRecord.sequenceDigits) || 2);
        const step   = Math.max(1, Number(seqRecord.incrementStep) || 1);

        const advanced = await DocumentSequence.findByIdAndUpdate(
          seqRecord._id,
          { $inc: { incrementNo: step } },
          { new: true }
        );

        const paddedNo = String(advanced.incrementNo).padStart(digits, "0");
        const datePart = advanced.useDateFragment ? buildDatePart(advanced.sequenceFormat) : "";
        demandNo = `${prefix}${datePart}${paddedNo}`;

        advanced.generatedCode = demandNo;
        await advanced.save();
      } else {
        const count = await Demand.countDocuments();
        const datePart = buildDatePart("dd/mm/yy");
        demandNo = `${prefix}${datePart}${String(count + 1).padStart(2, "0")}`;
      }
    }

    const newDemand = new Demand({ ...req.body, demandNo, status: "Pending" });
    await newDemand.save();

    /* ── Generate Production Requests right away, one per item row ──
       Previously this only happened once the Dispatch Date became
       tomorrow (see productionRequestGenerator.js's scheduled check).
       Wrapped in its own try/catch so a PR-generation hiccup never
       blocks the Demand save itself — the daily check still exists
       as a fallback in case this ever fails silently. */
    try {
      await createProductionRequestsForDemand(newDemand);
    } catch (genErr) {
      console.error("Immediate production request generation failed:", genErr.message);
    }

    res.status(201).json({ success: true, message: "Demand Saved Successfully", data: newDemand });
  } catch (error) {
    console.error("Demand save error:", error);
    res.status(500).json({ success: false, message: "Error Saving Demand: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — List / Search Demands
══════════════════════════════════════════════ */
router.get("/demand", async (req, res) => {
  try {
    const { fromDate, toDate, demandNo, saudaNo, partyName, partyCode, priority, status } = req.query;
    const query = {};

    if (fromDate || toDate) {
      query.demandDate = {};
      if (fromDate) query.demandDate.$gte = fromDate;
      if (toDate)   query.demandDate.$lte = toDate;
    }

    if (demandNo)  query.demandNo  = { $regex: demandNo,  $options: "i" };
    if (saudaNo)   query.saudaNo   = { $regex: saudaNo,   $options: "i" };
    if (partyName) query.partyName = { $regex: partyName, $options: "i" };
    if (partyCode) query.partyCode = { $regex: partyCode, $options: "i" };
    if (priority)  query.priority  = priority;
    if (status)    query.status    = status;

    const data = await Demand.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Demand fetch error:", error);
    res.status(500).json({ success: false, message: "Error Fetching Data: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Single Demand by ID
══════════════════════════════════════════════ */
router.get("/demand/:id", async (req, res) => {
  try {
    const data = await Demand.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   PUT — Update Demand by ID (also used for status changes)
══════════════════════════════════════════════ */
router.put("/demand/:id", async (req, res) => {
  try {
    if (req.body.status && !ALLOWED_STATUS.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    const updatedData = await Demand.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!updatedData) return res.status(404).json({ success: false, message: "Record Not Found" });
    res.json({ success: true, message: "Updated Successfully", data: updatedData });
  } catch (error) {
    console.error("Demand update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   DELETE — Remove Demand by ID (Pending only)
══════════════════════════════════════════════ */
router.delete("/demand/:id", async (req, res) => {
  try {
    const existing = await Demand.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Record Not Found" });

    if (existing.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Only Pending demands can be deleted (this one is "${existing.status}").`,
      });
    }

    await Demand.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   POST — Manually trigger the auto Production Request
   generator (the same job also runs on a timer from
   server.js). Handy for testing / an admin "Run now" button.
══════════════════════════════════════════════ */
router.post("/demand/run-production-request-check", async (req, res) => {
  try {
    const created = await generateDueProductionRequests();
    res.json({ success: true, createdCount: created.length, data: created });
  } catch (error) {
    console.error("Production request generation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;