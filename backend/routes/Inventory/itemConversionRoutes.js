const express = require("express");
const router  = express.Router();
const ItemConversion       = require("../../models/Inventory/ItemConversion");
const ItemConversionMaster = require("../../models/Master/ItemConversionMaster");
const DocumentSequence     = require("../../models/Master/DocumentSequence");
const { syncRowsForDoc, deleteDocFromSheet } = require("../../utils/googleSheets");

const IC_HEADERS = ["DB ID","IC No","Conversion Date","PO No","Vehicle No","Party Code","Party Name","Base Item Code","Base Item Desc","Base Qty","Status","S No","Conv Item Code","Conv Qty","Rate","Amount","Remarks"];

function icToRows(ic) {
  const base = [String(ic._id), ic.icNo, ic.conversionDate, ic.poNo, ic.vehicleNo, ic.partyCode, ic.partyName, ic.itemCode, ic.itemDescription, ic.baseQty, ic.status];
  if (!ic.conversionRows || !ic.conversionRows.length) return [[...base, "", "", "", "", "", ic.remarks || ""]];
  return ic.conversionRows.map((row) => [
    ...base, row.sNo, row.inventoryCode, row.raQty, row.rate, row.amount, ic.remarks || "",
  ]);
}

/* ── 2-digit year date builder ── */
const buildDatePart = (format) => {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    /* Julian: YY + DDD (3-digit day-of-year, 1-indexed) — matches
       documentSequenceRoutes.js's buildDatePart, e.g. 01-Jan-2026 → 26001 */
    const year   = d.getFullYear();
    const start  = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy    = String(Math.floor((d - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`;
};

/* ══════════════════════════════════════════════
   ITEM CONVERSION MASTER routes
══════════════════════════════════════════════ */

/* GET all masters */
router.get("/item-conversion-masters", async (req, res) => {
  try {
    const data = await ItemConversionMaster.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* POST create master */
router.post("/create-item-conversion-master", async (req, res) => {
  try {
    const { conversionTypeName, description, status } = req.body;
    if (!conversionTypeName?.trim())
      return res.status(400).json({ success: false, message: "Conversion Type Name is required." });
    const doc = new ItemConversionMaster({ conversionTypeName: conversionTypeName.trim(), description, status });
    await doc.save();
    res.status(201).json({ success: true, message: "Item Conversion Type Saved", data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* PUT update master */
router.put("/item-conversion-master/:id", async (req, res) => {
  try {
    const updated = await ItemConversionMaster.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* DELETE master */
router.delete("/item-conversion-master/:id", async (req, res) => {
  try {
    await ItemConversionMaster.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ══════════════════════════════════════════════
   ITEM CONVERSION document sequence — next IC No
   GET /api/item-conversion/next-sequence
══════════════════════════════════════════════ */
router.get("/item-conversion/next-sequence", async (req, res) => {
  try {
    const records = await DocumentSequence.find({
      module: "Inventory",
      businessEntity: "Item Conversion",
    });

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No document sequence found for Item Conversion. Please create one in Document Sequence settings.",
      });
    }

    const last     = records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const digits   = Math.max(1, Number(last.sequenceDigits) || 2);
    const step     = Math.max(1, Number(last.incrementStep) || 1);
    const nextNo   = Math.max(...records.map((r) => Number(r.incrementNo))) + step;
    const datePart = last.useDateFragment ? buildDatePart(last.sequenceFormat || "dd/mm/yy") : "";
    const prefix   = last.entityPrefix || "IC";
    const nextCode = `${prefix}${datePart}${String(nextNo).padStart(digits, "0")}`;

    res.json({ success: true, nextCode, nextIncrement: nextNo });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ══════════════════════════════════════════════
   ITEM CONVERSION CRUD
══════════════════════════════════════════════ */

/* POST create */
router.post("/item-conversion", async (req, res) => {
  try {
    const doc = new ItemConversion(req.body);
    await doc.save();
    await syncRowsForDoc("Item Conversion", IC_HEADERS, doc._id, icToRows(doc));

    /* NOTE: The document sequence increment for this IC No is already
       committed by the frontend's call to POST /api/create-document-sequence
       (see CreateItemConversion.jsx persistIC) BEFORE this route is hit.
       Incrementing it again here would double-advance the counter and skip
       numbers, so no sequence mutation happens in this handler. */

    res.status(201).json({ success: true, message: "Item Conversion Saved Successfully", data: doc });
  } catch (e) {
    console.error("IC save error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

/* GET all with filters */
router.get("/item-conversion", async (req, res) => {
  try {
    const { fromDate, toDate, icNo, vehicleNo, itemCode, status, transactionCategory } = req.query;
    const q = {};
    if (fromDate || toDate) {
      q.conversionDate = {};
      if (fromDate) q.conversionDate.$gte = fromDate;
      if (toDate)   q.conversionDate.$lte = toDate;
    }
    if (icNo)                q.icNo               = { $regex: icNo,                $options: "i" };
    if (vehicleNo)           q.vehicleNo          = { $regex: vehicleNo,           $options: "i" };
    if (itemCode)            q.itemCode           = { $regex: itemCode,            $options: "i" };
    if (status)              q.status             = { $regex: status,              $options: "i" };
    if (transactionCategory) q.transactionCategory = { $regex: transactionCategory, $options: "i" };

    const data = await ItemConversion.find(q).sort({ createdAt: -1 });
    res.json(data);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* GET single */
router.get("/item-conversion/:id", async (req, res) => {
  try {
    const doc = await ItemConversion.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* PUT update */
router.put("/item-conversion/:id", async (req, res) => {
  try {
    const updated = await ItemConversion.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (updated) await syncRowsForDoc("Item Conversion", IC_HEADERS, updated._id, icToRows(updated));
    res.json({ success: true, data: updated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* DELETE */
router.delete("/item-conversion/:id", async (req, res) => {
  try {
    await ItemConversion.findByIdAndDelete(req.params.id);
    await deleteDocFromSheet("Item Conversion", req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;