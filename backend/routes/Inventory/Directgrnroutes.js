const express = require("express");
const router  = express.Router();
const DirectGRN        = require("../../models/Inventory/Directgrn");
const DocumentSequence = require("../../models/Master/DocumentSequence"); // same model used by Document Sequence master
const { syncRowsForDoc, deleteDocFromSheet } = require("../../utils/googleSheets");

const GRN_HEADERS = ["DB ID","GRN No","GRN Date","Status","Vendor Code","Vendor Name","PO No","Vehicle No","S No","Item Code","Item Name","UOM","Qty","Rate","Total Amount","Remarks"];

function grnToRows(grn) {
  const base = [String(grn._id), grn.grnNo, grn.grnDate, grn.status, grn.vendorCode, grn.vendorName, grn.poNo, grn.vehicleNo];
  if (!grn.items || !grn.items.length) return [[...base, "", "", "", "", "", "", grn.remarks || ""]];
  return grn.items.map((it) => [
    ...base, it.sNo, it.itemCode, it.itemName, it.uom, it.qty, it.rate, it.totalAmount, grn.remarks || "",
  ]);
}

/* ── Document Sequence master for Direct GRN is configured as:
   Module = "Inventory", Business Entity = "GRN"
   (see CreateDocumentSequence.jsx / documentSequenceRoutes.js).
   This MUST match exactly, or the lookup below finds nothing. ── */
const GRN_SEQ_MODULE         = "Inventory";
const GRN_SEQ_BUSINESS_ENTITY = "GRN";

/* ── date fragment builder — identical to documentSequenceRoutes.js,
   so the code generated here matches the "Generated No (Preview)"
   shown on the Document Sequence screen exactly. ── */
const buildDatePart = (format) => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yy = String(today.getFullYear()).slice(-2);

  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    /* Julian: YY + DDD (3-digit day-of-year, 1-indexed)
       e.g. 01-Jan-2026 → 26001, 31-Dec-2026 → 26365 */
    const year   = today.getFullYear();
    const start  = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy    = String(Math.floor((today - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`; // default dd/mm/yy
};

/* ─────────────────────────────────────────────────────────────
   HELPER — generate next GRN No from the configured DocumentSequence
   record. Reads the SAME record the Document Sequence master shows
   (Module: Inventory, Business Entity: GRN), builds the code using
   its prefix / format / digits, then advances incrementNo by 1.
───────────────────────────────────────────────────────────── */
async function generateGrnNo(transactionCategory = "") {
  const filter = { module: GRN_SEQ_MODULE, businessEntity: GRN_SEQ_BUSINESS_ENTITY };
  if (transactionCategory) filter.transactionCategory = transactionCategory;

  let seq = await DocumentSequence.findOne(filter).sort({ createdAt: -1 });
  if (!seq && transactionCategory) {
    // No row for this specific transaction category — fall back to any
    // GRN sequence row so GRN creation still works.
    seq = await DocumentSequence
      .findOne({ module: GRN_SEQ_MODULE, businessEntity: GRN_SEQ_BUSINESS_ENTITY })
      .sort({ createdAt: -1 });
  }

  if (!seq) {
    // No Document Sequence configured at all yet — safe fallback (not saved).
    const datePart = buildDatePart("dd/mm/yy");
    return `GRN${datePart}01`;
  }

  const digits   = Math.max(1, Number(seq.sequenceDigits) || 2);
  const datePart = seq.useDateFragment ? buildDatePart(seq.sequenceFormat) : "";
  const padded   = String(Number(seq.incrementNo) || 1).padStart(digits, "0");
  const prefix   = (seq.entityPrefix || "GRN").toString().trim().toUpperCase();
  const grnNo    = `${prefix}${datePart}${padded}`;

  seq.incrementNo   = (Number(seq.incrementNo) || 1) + 1;
  seq.generatedCode = grnNo;
  await seq.save();

  return grnNo;
}

/* ══════════════════════════════════════════════════════════════
   GET /preview-grn-no
   Returns the NEXT GRN No WITHOUT consuming the sequence.
   Frontend calls this on mount to show a read-only preview.
   MUST be declared before /:id to avoid route collision.
══════════════════════════════════════════════════════════════ */
router.get("/preview-grn-no", async (req, res) => {
  try {
    const { transactionCategory = "" } = req.query;
    const filter = { module: GRN_SEQ_MODULE, businessEntity: GRN_SEQ_BUSINESS_ENTITY };
    if (transactionCategory) filter.transactionCategory = transactionCategory;

    let seq = await DocumentSequence.findOne(filter).sort({ createdAt: -1 });
    if (!seq && transactionCategory) {
      seq = await DocumentSequence
        .findOne({ module: GRN_SEQ_MODULE, businessEntity: GRN_SEQ_BUSINESS_ENTITY })
        .sort({ createdAt: -1 });
    }

    if (!seq) {
      const datePart = buildDatePart("dd/mm/yy");
      return res.json({ success: true, grnNo: `GRN${datePart}01` });
    }

    const digits   = Math.max(1, Number(seq.sequenceDigits) || 2);
    const datePart = seq.useDateFragment ? buildDatePart(seq.sequenceFormat) : "";
    const padded   = String(Number(seq.incrementNo) || 1).padStart(digits, "0");
    const prefix   = (seq.entityPrefix || "GRN").toString().trim().toUpperCase();
    const grnNo    = `${prefix}${datePart}${padded}`;

    res.json({ success: true, grnNo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /  — create
   Generates authoritative grnNo server-side from DocumentSequence.
══════════════════════════════════════════════════════════════ */
router.post("/", async (req, res) => {
  try {
    const grnNo = await generateGrnNo(req.body.transactionCategory || "");
    const doc   = new DirectGRN({ ...req.body, grnNo });
    await doc.save();

    try {
      await syncRowsForDoc("GRN", GRN_HEADERS, doc._id, grnToRows(doc));
    } catch (sheetErr) {
      console.error("Sheet sync failed (GRN create):", sheetErr.message);
    }

    res.status(201).json({ success: true, message: "Direct GRN Saved Successfully", data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /  — search with filters
══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const {
      fromDate, toDate, grnNo, status,
      vendorCode, vendorName, vehicleNo, site,
      invoiceNo, invoiceDate, transactionCategory,
      deliveryMode, grnType, poNo,
    } = req.query;

    const query = {};
    if (grnNo)               query.grnNo               = { $regex: grnNo,               $options: "i" };
    if (status)              query.status               = status;
    if (vendorCode)          query.vendorCode           = { $regex: vendorCode,          $options: "i" };
    if (vendorName)          query.vendorName           = { $regex: vendorName,          $options: "i" };
    if (vehicleNo)           query.vehicleNo            = { $regex: vehicleNo,           $options: "i" };
    if (site)                query.site                 = { $regex: site,                $options: "i" };
    if (invoiceNo)           query.challanInvoiceNo     = { $regex: invoiceNo,           $options: "i" };
    if (invoiceDate)         query.challanDate          = invoiceDate;
    if (transactionCategory) query.transactionCategory  = { $regex: transactionCategory, $options: "i" };
    if (deliveryMode)        query.deliveryMode         = deliveryMode;
    if (grnType)             query.grnType              = grnType;
    if (poNo)                query.poNo                 = { $regex: poNo,                $options: "i" };

    if (fromDate || toDate) {
      query.grnDate = {};
      if (fromDate) query.grnDate.$gte = fromDate;
      if (toDate)   query.grnDate.$lte = toDate;
    }

    const data = await DirectGRN.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   GET /:id  — single record
══════════════════════════════════════════════════════════════ */
router.get("/:id", async (req, res) => {
  try {
    const doc = await DirectGRN.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not Found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   PUT /:id  — update
══════════════════════════════════════════════════════════════ */
router.put("/:id", async (req, res) => {
  try {
    const updated = await DirectGRN.findByIdAndUpdate(
      req.params.id, req.body, { returnDocument: "after", runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Record Not Found" });

    try {
      await syncRowsForDoc("GRN", GRN_HEADERS, updated._id, grnToRows(updated));
    } catch (sheetErr) {
      console.error("Sheet sync failed (GRN update):", sheetErr.message);
    }

    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   DELETE /:id  — delete
══════════════════════════════════════════════════════════════ */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await DirectGRN.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Record Not Found" });

    try {
      await deleteDocFromSheet("GRN", req.params.id);
    } catch (sheetErr) {
      console.error("Sheet sync failed (GRN delete):", sheetErr.message);
    }

    res.json({ success: true, message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;