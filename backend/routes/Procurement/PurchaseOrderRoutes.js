const express = require("express");
const router  = express.Router();
const PurchaseOrder    = require("../../models/Procurement/PurchaseOrder");
const DocumentSequence = require("../../models/Master/DocumentSequence");
const { syncRowsForDoc, deleteDocFromSheet } = require("../../utils/googleSheets");

/* ── Google Sheets: "PO" tab row mapping ── */
const PO_HEADERS = [
  "DB ID", "PO No", "PO Date", "PO Type", "Site", "Party Code", "Party Name",
  "Status", "S No", "Item Code", "Item Name", "UOM", "Qty", "Rate",
  "Basic Amount", "Net Amount", "Remarks",
];

function poToRows(po) {
  const base = [
    String(po._id), po.poNo, po.poDate, po.poType, po.site,
    po.partyCode, po.partyName, po.status,
  ];
  if (!po.items || !po.items.length) {
    return [[...base, "", "", "", "", "", "", "", po.remarks || ""]];
  }
  return po.items.map((it) => [
    ...base, it.sNo, it.itemCode, it.itemName, it.uom, it.qty, it.rate,
    it.basicAmount, it.netAmount, po.remarks || "",
  ]);
}

/* ── sanitize helper: converts any value to a safe Number ── */
const toNum = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/* ── sanitize a full PO body before save/update ── */
const sanitizePO = (body) => {
  const items = (body.items || []).map((it, idx) => ({
    sNo: it.sNo ?? idx + 1,
    itemCode: it.itemCode || "",
    itemCategory: it.itemCategory || "",
    itemName: it.itemName || "",
    uom: it.uom || "",
    serviceCharge: toNum(it.serviceCharge),
    charges: toNum(it.charges),
    discount: toNum(it.discount),
    qty: toNum(it.qty),
    rate: toNum(it.rate),
    basicAmount: toNum(it.basicAmount),
    netAmount: toNum(it.netAmount),
  }));

  const serviceRows = (body.serviceRows || []).map((row, idx) => ({
    sNo: row.sNo ?? idx + 1,
    serviceCode: row.serviceCode || "",
    serviceName: row.serviceName || "",
    qty: toNum(row.qty),
    rate: toNum(row.rate),
    amount: toNum(row.amount),
  }));

  const chargeRows = (body.chargeRows || []).map((row, idx) => ({
    sNo: row.sNo ?? idx + 1,
    code: row.code || "",
    description: row.description || "",
    amount: toNum(row.amount),
  }));

  const taxRows = (body.taxRows || []).map((row, idx) => ({
    sNo: row.sNo ?? idx + 1,
    taxType: row.taxType || "",
    taxCode: row.taxCode || "",
    taxName: row.taxName || "",
    totalTax: row.totalTax || "",
    amount: toNum(row.amount),
  }));

  return {
    poNo: body.poNo || "",
    poDate: body.poDate || "",
    poType: body.poType || "",
    transactionCategory: body.transactionCategory || "",
    site: body.site || "",
    partyCode: body.partyCode || "",
    partyName: body.partyName || "",
    mobileNo: body.mobileNo || "",
    paymentMode: body.paymentMode || "",
    eta: body.eta || "",
    dueDate: body.dueDate || "",
    status: body.status || "Ordered",
    remarks: body.remarks || "",
    basicAmount: toNum(body.basicAmount),
    netAmount: toNum(body.netAmount),
    totalQty: toNum(body.totalQty),

    items,
    serviceRows,
    chargeRows,
    taxRows,
  };
};
/* ════════════════════════════════════════
   GET — next PO sequence number
   /api/purchase-order/next-sequence
════════════════════════════════════════ */
router.get("/purchase-order/next-sequence", async (req, res) => {
  try {
    const { module, businessEntity, entityPrefix } = req.query;
    const prefix = (entityPrefix || "").toString().trim().toUpperCase();

    if (!module || !businessEntity || !prefix) {
      return res.status(400).json({
        success: false,
        message: "module, businessEntity and entityPrefix are required",
      });
    }

    const records = await DocumentSequence.find({ module, businessEntity, entityPrefix: prefix });

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No document sequence found for module="${module}", entity="${businessEntity}", prefix="${prefix}". Please create one first.`,
      });
    }

    const lastRecord = records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const digits     = Math.max(1, Number(lastRecord.sequenceDigits) || 2);
    const step       = Math.max(1, Number(lastRecord.incrementStep) || 1);
    const nextNo     = Math.max(...records.map((r) => Number(r.incrementNo))) + step;
    const paddedNo   = String(nextNo).padStart(digits, "0");

    const buildDate = (fmt) => {
      const d  = new Date();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(new Date().getFullYear()).slice(-2); // 2-digit year e.g. '26'
      if (fmt === "mm/dd/yy") return `${mm}${dd}${yy}`;
      if (fmt === "yy/mm/dd") return `${yy}${mm}${dd}`;
      if (fmt === "julian") {
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

    const datePart = lastRecord.useDateFragment ? buildDate(lastRecord.sequenceFormat) : "";
    const nextCode = `${prefix}${datePart}${paddedNo}`;

    res.json({ success: true, nextCode, nextIncrement: nextNo, sequenceId: lastRecord._id });
  } catch (error) {
    console.error("PO next-sequence error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   CREATE  POST /api/create-purchase-order
════════════════════════════════════════ */
router.post("/create-purchase-order", async (req, res) => {
  try {
    const po = new PurchaseOrder(sanitizePO(req.body));
    await po.save();

    try {
      await syncRowsForDoc("PO", PO_HEADERS, po._id, poToRows(po));
    } catch (sheetErr) {
      console.error("Sheet sync failed (PO create):", sheetErr.message);
    }

    res.status(201).json({ success: true, message: "Purchase Order Saved Successfully", data: po });
  } catch (error) {
    console.error("Create PO error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   GET ALL  GET /api/purchase-orders
════════════════════════════════════════ */
router.get("/purchase-orders", async (req, res) => {
  try {
    const data = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Get all POs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   GET BY ID  GET /api/purchase-order/:id
════════════════════════════════════════ */
router.get("/purchase-order/:id", async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json(po);
  } catch (error) {
    console.error("Get PO by ID error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   UPDATE  PUT /api/purchase-order/:id
════════════════════════════════════════ */
router.put("/purchase-order/:id", async (req, res) => {
  try {
    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      sanitizePO(req.body),
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });

    try {
      await syncRowsForDoc("PO", PO_HEADERS, updated._id, poToRows(updated));
    } catch (sheetErr) {
      console.error("Sheet sync failed (PO update):", sheetErr.message);
    }

    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    console.error("Update PO error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   DELETE  DELETE /api/purchase-order/:id
════════════════════════════════════════ */
router.delete("/purchase-order/:id", async (req, res) => {
  try {
    const deleted = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });

    try {
      await deleteDocFromSheet("PO", req.params.id);
    } catch (sheetErr) {
      console.error("Sheet sync failed (PO delete):", sheetErr.message);
    }

    res.json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    console.error("Delete PO error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;