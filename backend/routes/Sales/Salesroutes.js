const express = require("express");
const router  = express.Router();
const Sauda            = require("../../models/Sales/Sauda");
const DocumentSequence  = require("../../models/Master/DocumentSequence");

/* ── 2-digit year date builder — mirrors Document Sequence / GIN routes ── */
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

const ALLOWED_STATUS = ["Draft", "Confirmed", "Cancelled", "Completed"];

/* ══════════════════════════════════════════════
   GET — Generate next Sauda number
   Looks up a Document Sequence record for
   module="Sales", businessEntity="Sauda"
══════════════════════════════════════════════ */
router.get("/sauda/next-sequence", async (req, res) => {
  try {
    const { entityPrefix } = req.query;
    const prefix = (entityPrefix || "SD").toString().trim().toUpperCase();

    const lastRecord = await DocumentSequence
      .findOne({ module: "Sales", businessEntity: "Sauda", entityPrefix: prefix })
      .sort({ createdAt: -1 });

    if (!lastRecord) {
      /* Fall back to a simple running count if no sequence master exists yet,
         so the Create Sauda page never blocks on missing master data. */
      const count = await Sauda.countDocuments();
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
    console.error("sauda next-sequence error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   POST — Create new Sauda (Draft or Confirmed,
   depending on which button the frontend used)
══════════════════════════════════════════════ */
router.post("/sauda", async (req, res) => {
  try {
    const status = ALLOWED_STATUS.includes(req.body.status) ? req.body.status : "Draft";
    const newSauda = new Sauda({ ...req.body, status });
    await newSauda.save();
    res.status(201).json({ success: true, message: "Sauda Saved Successfully", data: newSauda });
  } catch (error) {
    console.error("Sauda save error:", error);
    res.status(500).json({ success: false, message: "Error Saving Sauda: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — List / Search Saudas
══════════════════════════════════════════════ */
router.get("/sauda", async (req, res) => {
  try {
    const {
      fromDate, toDate, saudaNo, partyCode, partyName,
      paymentTerms, status,
    } = req.query;

    const query = {};

    if (fromDate || toDate) {
      query.saudaDate = {};
      if (fromDate) query.saudaDate.$gte = fromDate;
      if (toDate)   query.saudaDate.$lte = toDate;
    }

    if (saudaNo)      query.saudaNo      = { $regex: saudaNo,      $options: "i" };
    if (partyCode)    query.partyCode    = { $regex: partyCode,    $options: "i" };
    if (partyName)    query.partyName    = { $regex: partyName,    $options: "i" };
    if (paymentTerms) query.paymentTerms = { $regex: paymentTerms, $options: "i" };
    if (status)       query.status       = status;

    const data = await Sauda.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Sauda fetch error:", error);
    res.status(500).json({ success: false, message: "Error Fetching Data: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Single Sauda by ID
══════════════════════════════════════════════ */
router.get("/sauda/:id", async (req, res) => {
  try {
    const data = await Sauda.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   PUT — Update Sauda by ID
   (also used for status transitions — Confirm /
   Cancel / Complete send { status: "..." })
══════════════════════════════════════════════ */
router.put("/sauda/:id", async (req, res) => {
  try {
    if (req.body.status && !ALLOWED_STATUS.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const updatedData = await Sauda.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedData)
      return res.status(404).json({ success: false, message: "Record Not Found" });

    res.json({ success: true, message: "Updated Successfully", data: updatedData });
  } catch (error) {
    console.error("Sauda update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   DELETE — Remove Sauda by ID
   Only Draft records may be deleted; once Confirmed,
   downstream Demand/Production docs may reference it.
══════════════════════════════════════════════ */
router.delete("/sauda/:id", async (req, res) => {
  try {
    const existing = await Sauda.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Record Not Found" });

    if (existing.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: `Only Draft saudas can be deleted (this one is "${existing.status}"). Cancel it instead.`,
      });
    }

    await Sauda.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;