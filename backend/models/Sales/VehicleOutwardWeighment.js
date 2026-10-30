const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    sNo:  Number,
    size: String,
    qty:  Number,
    unit: String,
    bundle: Number,
    productionRequestNo: String,
  },
  { _id: false }
);

const STAGES = ["Gate In", "Empty Weighed", "Loaded", "Weighed", "Exited"];
const STATUSES = ["Open", "Completed", "Cancelled"];

const vehicleOutwardWeighmentSchema = new mongoose.Schema(
  {
    // Link back to the Gate In record (VehicleOutward collection) — this is
    // still needed because Gate Out No / Vehicle No / items are FETCHED from
    // Vehicle Outward, and because we sync the linked Dispatch's status as
    // the vehicle moves through the weighbridge. It is NOT used to walk any
    // further back into Demand/Sauda anymore.
    vehicleOutwardId: { type: mongoose.Schema.Types.ObjectId, ref: "VehicleOutward", required: true, unique: true },
    dispatchId:       { type: mongoose.Schema.Types.ObjectId, ref: "Dispatch" },

    // Own document number for this weighment record — auto-generated off
    // the Document Sequence master (Master/DocumentSequence), same way
    // every other document number in the system is generated.
    weighmentNo: { type: String, required: true, unique: true },

    /* ── Header (matches the Weighment slip) ───────────────────── */
    description: String,          // free-text description
    date:        String,          // yyyy-mm-dd — weighment header date

    // Transaction Category — from Master/Transaction (module: "Sales",
    // businessEntity: "Vehicle Outward Weighment"). Stored as the code.
    transactionCategory: String,

    // Sales Party — from Master/SalesParty. Party Name is auto-fetched
    // from the Party Code and snapshotted here.
    partyCode: String,
    partyName: String,

    vehicleNo:  String,
    driverName: String,
    transporterName: String,

    // Gate Out / Outward No — fetched from Vehicle Outward (required)
    gateOutNo:  String,
    dispatchNo: String, // snapshot only, no longer used to trace Demand/Sauda

    gateInDate: String, // yyyy-mm-dd
    gateInTime: String, // HH:mm
    items:      [itemSchema],

    stage: { type: String, enum: STAGES, default: "Gate In" },

    // Empty (tare) weighment
    tareWeight:     Number, // MT
    tareWeightTime: String, // HH:mm

    // Loaded
    loadedDate: String,
    loadedTime: String,

    // Loaded (gross) weighment
    grossWeight:     Number, // MT
    grossWeightTime: String, // HH:mm
    netWeight:       Number, // MT — grossWeight - tareWeight

    // Weight-in header stamp (when the vehicle first came onto the
    // weighbridge for this record)
    weightInDate: String,
    weightInTime: String,

    // Exit
    exitDate: String,
    exitTime: String,

    // Invoice
    invoiceNo:   String,
    invoiceDate: String,

    status: { type: String, enum: STATUSES, default: "Open" },

    remarks: String,
  },
  { timestamps: true }
);

vehicleOutwardWeighmentSchema.statics.STAGES   = STAGES;
vehicleOutwardWeighmentSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model(
  "VehicleOutwardWeighment",
  vehicleOutwardWeighmentSchema,
  "vehicleoutwardweighments"
);