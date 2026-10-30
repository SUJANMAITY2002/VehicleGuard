const express  = require("express");
const mongoose = require("mongoose");
const router   = express.Router();

const VehicleOutwardWeighment = require("../../models/Sales/VehicleOutwardWeighment");
const VehicleOutward           = require("../../models/Sales/VehicleOutward");
const SalesParty                = require("../../models/Master/SalesParty");
const DocumentSequence          = require("../../models/Master/DocumentSequence");

/*
  Reuse the already-registered "Dispatch" model — mongoose keeps one
  global model registry, so this resolves fine as long as
  DispatchRoutes has been required earlier in server.js (it has).
  Only used here to flip Dispatch status as the vehicle moves through
  the weighbridge — the weighment header itself no longer traces back
  through Demand/Sauda for its own fields.
*/
function getDispatchModel() {
  try {
    return mongoose.model("Dispatch");
  } catch (err) {
    throw new Error(
      "Dispatch model is not registered yet. Make sure VehicleOutwardWeighmentRoutes is mounted after DispatchRoutes in server.js."
    );
  }
}

/* ── Document Sequence — auto weighment numbering ──────────────────
   Same upsert pattern as POST /api/create-document-sequence, done
   in-process so every Weighment number keeps advancing the same
   Document Sequence record (module: "Sales", businessEntity:
   "Vehicle Outward Weighment", entityPrefix: "WGH"). This replaces
   the old manual WGH0001/WGH0002 counter. */
const WGH_MODULE          = "Sales";
const WGH_BUSINESS_ENTITY = "Vehicle Outward Weighment";
const WGH_PREFIX          = "WGH";

async function nextWeighmentNo() {
  const last = await DocumentSequence.findOne({
    module: WGH_MODULE,
    businessEntity: WGH_BUSINESS_ENTITY,
    entityPrefix: WGH_PREFIX,
  });

  const digits = last ? Math.max(1, Number(last.sequenceDigits) || 4) : 4;
  const step   = last ? Math.max(1, Number(last.incrementStep) || 1) : 1;
  const nextNumber = last ? Number(last.incrementNo) + step : 1;
  const paddedNo   = String(nextNumber).padStart(digits, "0");
  const generatedCode = `${WGH_PREFIX}${paddedNo}`;

  await DocumentSequence.findOneAndUpdate(
    { module: WGH_MODULE, businessEntity: WGH_BUSINESS_ENTITY, entityPrefix: WGH_PREFIX },
    {
      $set: {
        sequenceFormat:  last?.sequenceFormat  ?? "dd/mm/yy",
        useDateFragment: last?.useDateFragment ?? false,
        sequenceDigits:  digits,
        incrementNo:     nextNumber,
        incrementStep:   step,
        generatedCode,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return generatedCode;
}

function requireStage(record, expected) {
  if (record.stage !== expected) {
    const err = new Error(`This record is at stage "${record.stage}", not "${expected}".`);
    err.status = 400;
    throw err;
  }
}

/*
  Find the weighment record for a given vehicleOutwardId, creating it
  lazily. The header snapshot only pulls what Vehicle Outward itself
  carries (Gate Out No, Dispatch No as a reference, vehicle/driver,
  items, dispatchId for status-sync). Transaction Category, Party
  Code/Name, Transporter Name, Description, Invoice details are filled
  in afterwards on the header panel — they no longer come from walking
  back through Dispatch → Demand → Sauda.
*/
async function getOrCreateWeighment(vehicleOutwardId) {
  let record = await VehicleOutwardWeighment.findOne({ vehicleOutwardId });
  if (record) return record;

  const outward = await VehicleOutward.findById(vehicleOutwardId);
  if (!outward) {
    const err = new Error("Vehicle Outward (Gate In) record not found");
    err.status = 404;
    throw err;
  }

  const weighmentNo = await nextWeighmentNo();
  const today = new Date().toISOString().split("T")[0];

  record = await VehicleOutwardWeighment.create({
    vehicleOutwardId: outward._id,
    dispatchId:       outward.dispatchId,
    weighmentNo,

    date: today,

    gateOutNo:  outward.gateOutNo,
    dispatchNo: outward.dispatchNo,

    vehicleNo:       outward.vehicleNo,
    driverName:      outward.driverName,
    transporterName: outward.transportName || "",

    gateInDate: outward.gateInDate,
    gateInTime: outward.gateInTime,
    items:      outward.items || [],
    stage:      "Gate In",
    status:     "Open",
  });

  return record;
}

/* Keep the VehicleOutward list (Search page) in sync with the
   weighment's progress, so /api/vehicle-outward still reports the
   right stage badge without the search page needing to change. */
async function syncOutwardStage(vehicleOutwardId, stage) {
  await VehicleOutward.findByIdAndUpdate(vehicleOutwardId, { stage });
}

/* ── GET /api/vehicle-outward-weighment/:vehicleOutwardId ──
   Fetch (or lazily create) the weighment record for a Gate Out. */
router.get("/vehicle-outward-weighment/:vehicleOutwardId", async (req, res) => {
  try {
    const record = await getOrCreateWeighment(req.params.vehicleOutwardId);
    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── PUT /api/vehicle-outward-weighment/:vehicleOutwardId/header ──
   Header panel: Description, Date, Transaction Category, Party Code
   (Party Name auto-fetched from Master/SalesParty), Transporter Name,
   Invoice No/Date. Editable independently of the stage workflow. */
router.put("/vehicle-outward-weighment/:vehicleOutwardId/header", async (req, res) => {
  try {
    const record = await getOrCreateWeighment(req.params.vehicleOutwardId);

    const {
      description, date, transactionCategory,
      partyCode, transporterName,
      invoiceNo, invoiceDate, status,
    } = req.body;

    let partyName = record.partyName;
    if (partyCode !== undefined) {
      if (partyCode) {
        const party = await SalesParty.findOne({ partyCode });
        if (!party) return res.status(400).json({ message: `Sales Party with code "${partyCode}" not found.` });
        partyName = party.partyName;
      } else {
        partyName = "";
      }
      record.partyCode = partyCode;
    }

    if (description         !== undefined) record.description = description;
    if (date                !== undefined) record.date = date;
    if (transactionCategory !== undefined) record.transactionCategory = transactionCategory;
    if (transporterName     !== undefined) record.transporterName = transporterName;
    if (invoiceNo           !== undefined) record.invoiceNo = invoiceNo;
    if (invoiceDate         !== undefined) record.invoiceDate = invoiceDate;
    if (status              !== undefined) record.status = status;
    record.partyName = partyName;

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── GET /api/vehicle-outward-weighment/party-lookup/:partyCode ──
   Convenience lookup used by the Party Code field to auto-fill Party
   Name before the header is saved. */
router.get("/vehicle-outward-weighment/party-lookup/:partyCode", async (req, res) => {
  try {
    const party = await SalesParty.findOne({ partyCode: req.params.partyCode });
    if (!party) return res.status(404).json({ message: "Sales Party not found" });
    res.json({ partyCode: party.partyCode, partyName: party.partyName });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── STAGE — PUT /api/vehicle-outward-weighment/:vehicleOutwardId/tare-weight ──
   Empty vehicle weighment. */
router.put("/vehicle-outward-weighment/:vehicleOutwardId/tare-weight", async (req, res) => {
  try {
    const record = await getOrCreateWeighment(req.params.vehicleOutwardId);
    requireStage(record, "Gate In");

    const { tareWeight, tareWeightTime, weightInDate, weightInTime } = req.body;
    if (tareWeight === undefined || tareWeight === "" || isNaN(Number(tareWeight))) {
      return res.status(400).json({ message: "A valid Tare Weight (MT) is required." });
    }
    if (!tareWeightTime) return res.status(400).json({ message: "Tare Weight Time is required." });

    record.tareWeight     = Number(tareWeight);
    record.tareWeightTime = tareWeightTime;
    record.weightInDate   = weightInDate || record.date;
    record.weightInTime   = weightInTime || tareWeightTime;
    record.stage          = "Empty Weighed";
    await record.save();
    await syncOutwardStage(record.vehicleOutwardId, record.stage);

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── STAGE — PUT /api/vehicle-outward-weighment/:vehicleOutwardId/loaded ──
   Material loaded against the Dispatch. Flips Dispatch Ready → Loaded. */
router.put("/vehicle-outward-weighment/:vehicleOutwardId/loaded", async (req, res) => {
  try {
    const record = await getOrCreateWeighment(req.params.vehicleOutwardId);
    requireStage(record, "Empty Weighed");

    const { loadedDate, loadedTime } = req.body;
    if (!loadedDate) return res.status(400).json({ message: "Loaded Date is required." });
    if (!loadedTime) return res.status(400).json({ message: "Loaded Time is required." });

    if (record.dispatchId) {
      const Dispatch = getDispatchModel();
      const dispatch = await Dispatch.findById(record.dispatchId);
      if (dispatch && dispatch.status === "Ready") {
        dispatch.status = "Loaded";
        await dispatch.save();
      }
    }

    record.loadedDate = loadedDate;
    record.loadedTime = loadedTime;
    record.stage       = "Loaded";
    await record.save();
    await syncOutwardStage(record.vehicleOutwardId, record.stage);

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── STAGE — PUT /api/vehicle-outward-weighment/:vehicleOutwardId/gross-weight ──
   Loaded vehicle weighment. Net weight = gross - tare. */
router.put("/vehicle-outward-weighment/:vehicleOutwardId/gross-weight", async (req, res) => {
  try {
    const record = await getOrCreateWeighment(req.params.vehicleOutwardId);
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
    await syncOutwardStage(record.vehicleOutwardId, record.stage);

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

/* ── STAGE — PUT /api/vehicle-outward-weighment/:vehicleOutwardId/exit ──
   Vehicle leaves the plant. Flips Dispatch Loaded → Vehicle Out. */
router.put("/vehicle-outward-weighment/:vehicleOutwardId/exit", async (req, res) => {
  try {
    const record = await getOrCreateWeighment(req.params.vehicleOutwardId);
    requireStage(record, "Weighed");

    const { exitDate, exitTime, remarks } = req.body;
    if (!exitDate) return res.status(400).json({ message: "Exit Date is required." });
    if (!exitTime) return res.status(400).json({ message: "Exit Time is required." });

    if (record.dispatchId) {
      const Dispatch = getDispatchModel();
      const dispatch = await Dispatch.findById(record.dispatchId);
      if (dispatch && dispatch.status === "Loaded") {
        dispatch.status = "Vehicle Out";
        await dispatch.save();
      }
    }

    record.exitDate = exitDate;
    record.exitTime = exitTime;
    if (remarks !== undefined) record.remarks = remarks;
    record.stage     = "Exited";
    record.status    = "Completed";
    await record.save();
    await syncOutwardStage(record.vehicleOutwardId, record.stage);

    res.json(record);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

module.exports = router;