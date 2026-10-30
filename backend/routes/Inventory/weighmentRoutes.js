const express  = require("express");
const router   = express.Router({ mergeParams: true });
const Weighment = require("../../models/Inventory/Weighment");
const { syncRowsForDoc, deleteDocFromSheet } = require("../../utils/googleSheets");

const WT_HEADERS = ["DB ID","Weighment No","Date","Transaction Type","Vehicle No","Party Code","Party Name","Status","First Weight","Second Weight","Net Weight","S No","Item Code","Item Name","UOM","Remarks"];

function weighmentToRows(wt) {
  const base = [String(wt._id), wt.weighmentNo, wt.weighmentDate, wt.transactionType, wt.vehicleNo, wt.partyCode, wt.partyName, wt.status, wt.firstWeight, wt.secondWeight, wt.netWeight];
  if (!wt.items || !wt.items.length) return [[...base, "", "", "", "", wt.remarks || ""]];
  return wt.items.map((it) => [...base, it.sNo, it.itemCode, it.itemName, it.uom, wt.remarks || ""]);
}

/* ─────────────────────────────────────────────────────────────
   Helper — generate next weighment number from document sequence
   Pattern:
     Inward  → IN{YYMMDD}{2-digit seq zero-padded}   e.g. IN2506150001
     Outward → OT{YYMMDD}{2-digit seq}               e.g. OT2506150001
     General → GN{YYMMDD}{2-digit seq}               e.g. GN2506150001
───────────────────────────────────────────────────────────── */
const prefixMap = {
  Inward:  "IN",
  Outward: "OT",
  General: "GN",
};

/* ─── ALLOWED STATUSES ───────────────────────────────────────────────────────
   "Draft"   = first weight captured only
   "Saved"   = both weights captured (weighment complete)
   "Convert" = IC has been started from this weighment (locked)
   "Open"    = no weight yet
   "Closed"  = fully processed (GRN approved)
   We accept all of these and pass them straight through — no enum restriction
   at the route level so the model enum (if any) is bypassed via $set on PUT
   and handled by sanitizebody on POST.
─────────────────────────────────────────────────────────────────────────────── */
const VALID_STATUSES = ["Open", "Draft", "Saved", "Convert", "Closed"];

const sanitizeBody = (body) => {
  const out = { ...body };
  /* Ensure status is one of our allowed values; fall back to "Open" */
  if (!VALID_STATUSES.includes(out.status)) out.status = "Open";
  return out;
};

const getNextWeighmentNo = async (transactionType) => {
  const prefix = prefixMap[transactionType] || "GN";

  const now   = new Date();
  const yy    = String(now.getFullYear()).slice(2);
  const mm    = String(now.getMonth() + 1).padStart(2, "0");
  const dd    = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yy}${mm}${dd}`;

  const pattern = `^${prefix}${dateStr}`;
  const count   = await Weighment.countDocuments({
    weighmentNo: { $regex: pattern },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${dateStr}${seq}`;
};

/* GET /next-no?transactionType=Inward — get next sequence number */
router.get("/next-no", async (req, res) => {
  try {
    const { transactionType = "General" } = req.query;
    const no = await getNextWeighmentNo(transactionType);
    res.status(200).json({ success: true, weighmentNo: no });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* POST / — create new weighment */
router.post("/", async (req, res) => {
  try {
    const body = sanitizeBody(req.body);
    /* Auto-assign weighment number if not provided */
    if (!body.weighmentNo && body.transactionType) {
      body.weighmentNo = await getNextWeighmentNo(body.transactionType);
    }
    const weighment = new Weighment(body);
    await weighment.save();
    await syncRowsForDoc("Weightment", WT_HEADERS, weighment._id, weighmentToRows(weighment));
    res.status(201).json({ success: true, message: "Weighment Saved", data: weighment });
  } catch (error) {
    console.error("Weighment POST error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET / — search / list weighments with optional filters */
router.get("/", async (req, res) => {
  try {
    const {
      fromDate, toDate, weighmentNo, vehicleNo,
      inwardOutwardNoteNo, status, partyName, site,
      transactionType, transactionCategory,
    } = req.query;
    /* statusIn is read directly from req.query below — not destructured here */

    const query = {};

    if (weighmentNo)         query.weighmentNo         = { $regex: weighmentNo, $options: "i" };
    if (vehicleNo)           query.vehicleNo           = { $regex: vehicleNo, $options: "i" };
    if (inwardOutwardNoteNo) query.inwardOutwardNoteNo = { $regex: inwardOutwardNoteNo, $options: "i" };
    if (partyName)           query.partyName           = { $regex: partyName, $options: "i" };
    if (site)                query.site                = { $regex: site, $options: "i" };
    if (transactionType)     query.transactionType     = transactionType;
    if (transactionCategory) query.transactionCategory = transactionCategory;

    /* ── STATUS FILTER ───────────────────────────────────────────────────────
       Three ways the frontend can pass status:
       1. status=Open          → single exact match
       2. statusIn=Open&statusIn=Draft  → array of values ($in)
       3. nothing              → no status filter (fetch all)
    ──────────────────────────────────────────────────────────────────────── */
    const statusIn = req.query.statusIn
      ? (Array.isArray(req.query.statusIn) ? req.query.statusIn : [req.query.statusIn])
      : null;

    if (status) {
      query.status = status;
    } else if (statusIn && statusIn.length > 0) {
      query.status = { $in: statusIn };
    }
    /* else: no status filter — return all records */

    if (fromDate || toDate) {
      query.weighmentDate = {};
      if (fromDate) query.weighmentDate.$gte = fromDate;
      if (toDate)   query.weighmentDate.$lte = toDate;
    }

    const data = await Weighment.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET /:id — get single weighment by ID */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Weighment.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* PUT /:id — update a weighment */
router.put("/:id", async (req, res) => {
  try {
    const body = sanitizeBody(req.body);
    const updated = await Weighment.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      /* runValidators: false — we sanitize manually above so enum on
         the Mongoose model never blocks Draft / Saved / Convert */
      { returnDocument: "after", runValidators: false }
    );
    if (!updated)
      return res.status(404).json({ success: false, message: "Record not found" });
    if (updated) await syncRowsForDoc("Weightment", WT_HEADERS, updated._id, weighmentToRows(updated));
    res.status(200).json({ success: true, message: "Weighment Updated", data: updated });
  } catch (error) {
    console.error("Weighment PUT error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* DELETE /:id — delete a weighment */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Weighment.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Record not found" });
    await deleteDocFromSheet("Weightment", req.params.id);
    res.status(200).json({ success: true, message: "Weighment Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;