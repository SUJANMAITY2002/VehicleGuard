const express  = require("express");
const mongoose = require("mongoose");
const router   = express.Router();

const VehicleOutward   = require("../../models/Sales/VehicleOutward");
const DocumentSequence = require("../../models/Master/DocumentSequence");

/* ── 2-digit year date builder — mirrors Sauda / Dispatch / Document
     Sequence routes ── */
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

/*
  Reuse the already-registered "Dispatch" model (registered by
  DispatchRoutes, which is required earlier in server.js). We don't
  import its file directly to avoid guessing its exact path — mongoose
  keeps a single global model registry, so mongoose.model("Dispatch")
  resolves as long as DispatchRoutes has been required at least once,
  which it has by the time requests hit this router.
*/
function getDispatchModel() {
  try {
    return mongoose.model("Dispatch");
  } catch (err) {
    throw new Error(
      "Dispatch model is not registered yet. Make sure VehicleOutwardRoutes is mounted after DispatchRoutes in server.js."
    );
  }
}

/* ── Helpers ── */
const pad = (n, len = 4) => String(n).padStart(len, "0");

/* Legacy simple running-counter fallback — only used when a caller
   doesn't send a gateOutNo at all (e.g. direct API use, or no
   Document Sequence configured yet for Sales / Vehicle Outward). */
async function fallbackGateOutNo() {
  const last = await VehicleOutward.findOne().sort({ createdAt: -1 }).lean();
  let nextNum = 1;
  if (last?.gateOutNo) {
    const match = last.gateOutNo.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return `GO${pad(nextNum)}`;
}

async function loadRecord(id) {
  const record = await VehicleOutward.findById(id);
  if (!record) {
    const err = new Error("Vehicle Outward record not found");
    err.status = 404;
    throw err;
  }
  return record;
}

function requireStage(record, expected) {
  if (record.stage !== expected) {
    const err = new Error(`This record is at stage "${record.stage}", not "${expected}".`);
    err.status = 400;
    throw err;
  }
}

/* ── GET /api/vehicle-outward/next-sequence ──
   Legacy simple-counter preview, kept for back-compat with any direct
   callers. The Create Vehicle Outward page itself now previews the
   Gate Out No. from the Transaction Category's Document Sequence
   instead (same pattern as Create Sauda / Create Dispatch). */
router.get("/vehicle-outward/next-sequence", async (req, res) => {
  try {
    const nextCode = await fallbackGateOutNo();
    res.json({ nextCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET /api/vehicle-outward/source-dispatches ──
   Dispatches that are "Ready" and don't already have a Gate Out
   tracker started against them. */
router.get("/vehicle-outward/source-dispatches", async (req, res) => {
  try {
    const Dispatch = getDispatchModel();
    const dispatches = await Dispatch.find({ status: "Ready" }).sort({ dispatchDate: -1 }).lean();

    const inUse = await VehicleOutward.find({ dispatchId: { $in: dispatches.map((d) => d._id) } })
      .distinct("dispatchId");
    const inUseSet = new Set(inUse.map((id) => String(id)));

    res.json(dispatches.filter((d) => !inUseSet.has(String(d._id))));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET /api/vehicle-outward/source-outwards ──
   Gate Out records that haven't finished the outward journey yet —
   feeds the "Outward No." picker on the Vehicle Outward Weighment
   page (fetch straight from Vehicle Outward, as opposed to
   source-dispatches above which feeds the Gate In page instead). */
router.get("/vehicle-outward/source-outwards", async (req, res) => {
  try {
    const records = await VehicleOutward.find({ stage: { $ne: "Exited" } })
      .sort({ createdAt: -1 })
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET /api/vehicle-outward ── (search / list) */
router.get("/vehicle-outward", async (req, res) => {
  try {
    const { fromDate, toDate, gateOutNo, dispatchNo, vehicleNo, customer, stage } = req.query;
    const q = {};

    if (fromDate || toDate) {
      q.gateInDate = {};
      if (fromDate) q.gateInDate.$gte = fromDate;
      if (toDate)   q.gateInDate.$lte = toDate;
    }
    if (gateOutNo)  q.gateOutNo  = { $regex: gateOutNo,  $options: "i" };
    if (dispatchNo) q.dispatchNo = { $regex: dispatchNo, $options: "i" };
    if (vehicleNo)  q.vehicleNo  = { $regex: vehicleNo,  $options: "i" };
    if (customer)   q.customer   = { $regex: customer,   $options: "i" };
    if (stage)      q.stage      = stage;

    const records = await VehicleOutward.find(q).sort({ createdAt: -1 }).lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET /api/vehicle-outward/:id ── */
router.get("/vehicle-outward/:id", async (req, res) => {
  try {
    const record = await VehicleOutward.findById(req.params.id).lean();
    if (!record) return res.status(404).json({ message: "Vehicle Outward record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── PUT /api/vehicle-outward/:id ──
   Edit the descriptive Gate In details (Vehicle No., Driver, Gate In
   Date/Time) from the Vehicle Outward Details page — the "Continue"
   button on the search page lands here now, not straight on the
   Weighment module. Deliberately whitelisted: doesn't touch
   dispatchId / gateOutNo / stage / weighment fields, which only
   change through their own dedicated stage endpoints below. */
router.put("/vehicle-outward/:id", async (req, res) => {
  try {
    const record = await loadRecord(req.params.id);

    const { vehicleNo, driverName, gateInDate, gateInTime } = req.body;
    if (vehicleNo   !== undefined) record.vehicleNo  = vehicleNo;
    if (driverName  !== undefined) record.driverName = driverName;
    if (gateInDate  !== undefined) {
      if (!gateInDate) return res.status(400).json({ message: "Gate In Date is required." });
      record.gateInDate = gateInDate;
    }
    if (gateInTime  !== undefined) {
      if (!gateInTime) return res.status(400).json({ message: "Gate In Time is required." });
      record.gateInTime = gateInTime;
    }

    await record.save();
    res.json({ success: true, message: "Updated Successfully", data: record });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

const STAGE_ORDER = ["Gate In", "Empty Weighed", "Loaded", "Weighed", "Exited"];
const stageIndex  = (s) => Math.max(0, STAGE_ORDER.indexOf(s));

/* ── PUT /api/vehicle-outward/:id/weighment ──
   Consolidated save for the Vehicle Outward Weighment page — its own
   Transaction Category / Weighment No / Date / Description, the
   Weighment Details block (Vehicle No & Party Code are auto-filled
   from the record and not editable here), and per-item First/Second/
   Net weight capture (same first-weight-then-second-weight pattern
   as WeighmentPages.jsx's item rows).

   Stage auto-advances FORWARD ONLY based on what's been captured —
   it never regresses, and never touches "Exited" (use the dedicated
   /exit endpoint below to finish the record):
     • no item has a First Weight yet        → stage unchanged
     • at least one item has a First Weight  → at least "Empty Weighed"
     • every item that has a First Weight
       also has a Second Weight              → "Loaded" is skipped
       automatically (dispatch flips Ready→Loaded here, same side
       effect the old /loaded endpoint had) straight through to
       "Weighed", with tareWeight/grossWeight/netWeight recomputed
       as the sum across items. */
router.put("/vehicle-outward/:id/weighment", async (req, res) => {
  try {
    const record = await loadRecord(req.params.id);
    if (record.stage === "Exited") {
      return res.status(400).json({ message: "This record has already Exited and can no longer be edited here." });
    }

    const {
      weighmentTransactionCategory, weighmentNo, weighmentDate, description,
      partyCode, weighmentInDate, weighmentInTime, transporterName,
      invoiceNo, invoiceDate, weighmentStatus,
      items,
    } = req.body;

    if (weighmentTransactionCategory !== undefined) record.weighmentTransactionCategory = weighmentTransactionCategory;
    if (weighmentNo                  !== undefined && weighmentNo) record.weighmentNo = weighmentNo;
    if (weighmentDate                !== undefined) record.weighmentDate = weighmentDate;
    if (description                  !== undefined) record.description = description;
    if (partyCode                    !== undefined) record.partyCode = partyCode;
    if (weighmentInDate              !== undefined) record.weighmentInDate = weighmentInDate;
    if (weighmentInTime              !== undefined) record.weighmentInTime = weighmentInTime;
    if (transporterName              !== undefined) record.transporterName = transporterName;
    if (invoiceNo                    !== undefined) record.invoiceNo = invoiceNo;
    if (invoiceDate                  !== undefined) record.invoiceDate = invoiceDate;
    if (weighmentStatus              !== undefined) record.weighmentStatus = weighmentStatus;

    /* ── Merge item weight capture by sNo — everything else about the
       item (itemCode/itemName/size/qty/remarks) is left untouched. ── */
    if (Array.isArray(items)) {
      const bySNo = new Map(items.map((it) => [Number(it.sNo), it]));
      record.items = record.items.map((row) => {
        const incoming = bySNo.get(Number(row.sNo));
        if (!incoming) return row;
        return {
          ...row.toObject?.() ?? row,
          firstWeight:  incoming.firstWeight  !== undefined ? incoming.firstWeight  : row.firstWeight,
          secondWeight: incoming.secondWeight !== undefined ? incoming.secondWeight : row.secondWeight,
          netWeight:    incoming.netWeight    !== undefined ? incoming.netWeight    : row.netWeight,
          remarks:      incoming.remarks      !== undefined ? incoming.remarks      : row.remarks,
        };
      });
    }

    /* ── Auto-advance stage based on captured weights (forward only) ── */
    const weighedItems = record.items.filter((it) => it.firstWeight);
    const anyFirst      = weighedItems.length > 0;
    const allSecondDone  = anyFirst && weighedItems.every((it) => it.secondWeight);

    let targetStage = record.stage;
    if (allSecondDone)      targetStage = "Weighed";
    else if (anyFirst)      targetStage = "Empty Weighed";

    if (stageIndex(targetStage) > stageIndex(record.stage)) {
      /* Moving to "Weighed" passes through "Loaded" — replicate that
         stage's side effect (Dispatch Ready → Loaded) here too, since
         this consolidated page doesn't ask for a separate Loaded step. */
      if (stageIndex(targetStage) >= stageIndex("Loaded")) {
        const Dispatch = getDispatchModel();
        const dispatch = await Dispatch.findById(record.dispatchId);
        if (dispatch && dispatch.status === "Ready") {
          dispatch.status = "Loaded";
          await dispatch.save();
        }
        if (!record.loadedDate) record.loadedDate = weighmentInDate || record.gateInDate;
        if (!record.loadedTime) record.loadedTime = weighmentInTime || record.gateInTime;
      }
      record.stage = targetStage;
    }

    /* ── Aggregate tare/gross/net across items whenever weights exist,
       so the existing summary / search-table fields stay in sync. ── */
    if (anyFirst) {
      const tare  = weighedItems.reduce((sum, it) => sum + (Number(it.firstWeight) || 0), 0);
      record.tareWeight = Number(tare.toFixed(3));
    }
    if (allSecondDone) {
      const gross = weighedItems.reduce((sum, it) => sum + (Number(it.secondWeight) || 0), 0);
      record.grossWeight = Number(gross.toFixed(3));
      record.netWeight   = Number((record.grossWeight - record.tareWeight).toFixed(3));
    }

    await record.save();
    res.json({ success: true, message: "Weighment Saved Successfully", data: record });
  } catch (err) {
    console.error("Vehicle Outward weighment save error:", err);
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── STAGE 1 — POST /api/vehicle-outward/gate-in ──
   Empty truck arrives against a "Ready" Dispatch. */
router.post("/vehicle-outward/gate-in", async (req, res) => {
  try {
    const { dispatchId, vehicleNo, driverName, gateInDate, gateInTime } = req.body;

    if (!dispatchId)  return res.status(400).json({ message: "dispatchId is required." });
    if (!gateInDate)  return res.status(400).json({ message: "Gate In Date is required." });
    if (!gateInTime)  return res.status(400).json({ message: "Gate In Time is required." });

    const Dispatch = getDispatchModel();
    const dispatch = await Dispatch.findById(dispatchId);
    if (!dispatch) return res.status(404).json({ message: "Linked Dispatch not found." });
    if (dispatch.status !== "Ready") {
      return res.status(400).json({
        message: `Dispatch ${dispatch.dispatchNo} is "${dispatch.status}", not "Ready". Only Ready dispatches can start a Gate In.`,
      });
    }

    const existing = await VehicleOutward.findOne({ dispatchId });
    if (existing) {
      return res.status(400).json({ message: `A Gate Out tracker (${existing.gateOutNo}) already exists for this Dispatch.` });
    }

    /* ── Gate Out No. resolution ──
       Mirrors Sauda / Dispatch: the Create Vehicle Outward page now
       generates the number itself, up front, via Transaction Category
       → /api/create-document-sequence — that call already atomically
       advances the sequence, so if the frontend sends a gateOutNo we
       trust it as-is and must NOT generate another one here (that
       would burn two numbers per Gate In).
       The legacy fallback below only runs for callers that don't send
       a gateOutNo at all (e.g. direct API use, or no Document Sequence
       configured yet for Sales / Vehicle Outward). */
    let gateOutNo = req.body.gateOutNo;
    const transactionCategory = req.body.transactionCategory || "";

    if (!gateOutNo) {
      gateOutNo = await fallbackGateOutNo();
    }

    const record = await VehicleOutward.create({
      gateOutNo,
      transactionCategory,
      dispatchId: dispatch._id,
      dispatchNo: dispatch.dispatchNo,
      partyCode:  dispatch.partyCode,
      customer:   dispatch.partyName,
      demandNo:   dispatch.demandNo,
      vehicleNo:  vehicleNo  || dispatch.vehicleNo,
      driverName: driverName || dispatch.driverName,
      items:      dispatch.items || [],
      stage:      "Gate In",
      gateInDate,
      gateInTime,
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── STAGE 2 — PUT /api/vehicle-outward/:id/tare-weight ──
   Empty vehicle weighment. */
router.put("/vehicle-outward/:id/tare-weight", async (req, res) => {
  try {
    const record = await loadRecord(req.params.id);
    requireStage(record, "Gate In");

    const { tareWeight, tareWeightTime } = req.body;
    if (tareWeight === undefined || tareWeight === "" || isNaN(Number(tareWeight))) {
      return res.status(400).json({ message: "A valid Tare Weight (MT) is required." });
    }
    if (!tareWeightTime) return res.status(400).json({ message: "Tare Weight Time is required." });

    record.tareWeight     = Number(tareWeight);
    record.tareWeightTime = tareWeightTime;
    record.stage          = "Empty Weighed";
    await record.save();

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── STAGE 3 — PUT /api/vehicle-outward/:id/loaded ──
   Material loaded against the Dispatch. Flips Dispatch Ready → Loaded. */
router.put("/vehicle-outward/:id/loaded", async (req, res) => {
  try {
    const record = await loadRecord(req.params.id);
    requireStage(record, "Empty Weighed");

    const { loadedDate, loadedTime } = req.body;
    if (!loadedDate) return res.status(400).json({ message: "Loaded Date is required." });
    if (!loadedTime) return res.status(400).json({ message: "Loaded Time is required." });

    const Dispatch = getDispatchModel();
    const dispatch = await Dispatch.findById(record.dispatchId);
    if (!dispatch) return res.status(404).json({ message: "Linked Dispatch not found." });
    if (dispatch.status === "Ready") {
      dispatch.status = "Loaded";
      await dispatch.save();
    }

    record.loadedDate = loadedDate;
    record.loadedTime = loadedTime;
    record.stage       = "Loaded";
    await record.save();

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── STAGE 4 — PUT /api/vehicle-outward/:id/gross-weight ──
   Loaded vehicle weighment. Net weight = gross - tare. */
router.put("/vehicle-outward/:id/gross-weight", async (req, res) => {
  try {
    const record = await loadRecord(req.params.id);
    requireStage(record, "Loaded");

    const { grossWeight, grossWeightTime } = req.body;
    if (grossWeight === undefined || grossWeight === "" || isNaN(Number(grossWeight))) {
      return res.status(400).json({ message: "A valid Gross Weight (MT) is required." });
    }
    if (!grossWeightTime) return res.status(400).json({ message: "Gross Weight Time is required." });

    const gross = Number(grossWeight);
    if (gross <= record.tareWeight) {
      return res.status(400).json({ message: "Gross Weight must be greater than the Tare Weight." });
    }

    record.grossWeight     = gross;
    record.grossWeightTime = grossWeightTime;
    record.netWeight       = Number((gross - record.tareWeight).toFixed(3));
    record.stage            = "Weighed";
    await record.save();

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── STAGE 5 — PUT /api/vehicle-outward/:id/exit ──
   Vehicle leaves the plant. Flips Dispatch Loaded → Vehicle Out. */
router.put("/vehicle-outward/:id/exit", async (req, res) => {
  try {
    const record = await loadRecord(req.params.id);
    requireStage(record, "Weighed");

    const { exitDate, exitTime, remarks } = req.body;
    if (!exitDate) return res.status(400).json({ message: "Exit Date is required." });
    if (!exitTime) return res.status(400).json({ message: "Exit Time is required." });

    const Dispatch = getDispatchModel();
    const dispatch = await Dispatch.findById(record.dispatchId);
    if (dispatch && dispatch.status === "Loaded") {
      dispatch.status = "Vehicle Out";
      await dispatch.save();
    }

    record.exitDate = exitDate;
    record.exitTime = exitTime;
    if (remarks !== undefined) record.remarks = remarks;
    record.stage     = "Exited";
    await record.save();

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── DELETE /api/vehicle-outward/:id ──
   Only allowed while still at "Gate In" (nothing else committed yet). */
router.delete("/vehicle-outward/:id", async (req, res) => {
  try {
    const record = await loadRecord(req.params.id);
    if (record.stage !== "Gate In") {
      return res.status(400).json({ message: `Cannot delete — this record has already progressed to "${record.stage}".` });
    }
    await record.deleteOne();
    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

module.exports = router;