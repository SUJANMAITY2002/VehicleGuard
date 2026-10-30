const mongoose = require("mongoose");

/*
  VEHICLE OUTWARD (Gate Outward) — Step 6
  ─────────────────────────────────────────
  A gate-to-gate tracker for the truck that comes to pick up a
  "Ready" Dispatch. Stages, in order:

    1. Gate In         — empty truck arrives, record created
    2. Empty Weighed    — tare weight captured
    3. Loaded           — material loaded against the Dispatch
                           (Dispatch status flips Ready → Loaded)
    4. Weighed          — gross weight captured, net weight computed
    5. Exited           — truck leaves the plant
                           (Dispatch status flips Loaded → Vehicle Out)
*/

/* ── Item sub-schema — MUST mirror Dispatch's item shape (see
     Dispatch.js) since gate-in copies dispatch.items straight across.
     Mongoose strips any field not declared here, so if this drifts
     from Dispatch's shape again, item names/codes silently vanish on
     save even though they were present in the source Dispatch. ── */
const itemSchema = new mongoose.Schema(
  {
    sNo:      Number,
    itemCode: String,
    itemName: String,
    size:     String,
    qty:      { type: Number, default: 0 },
    remarks:  String,

    /* Traceability back to the source Demand this item was raised from */
    demandId: { type: mongoose.Schema.Types.ObjectId, ref: "Demand" },
    demandNo: String,

    /* Extra fields some downstream flows (e.g. weighment) may add
       later — kept optional, not populated at Gate In time. */
    unit:                 String,
    bundle:                Number,
    productionRequestNo:   String,

    /* ── Weighment capture — set on the Vehicle Outward Weighment page,
       same first/second/net weight pattern as WeighmentPages.jsx's
       item rows. firstWeight = tare-side reading for this item,
       secondWeight = gross-side reading, netWeight = |second - first|. ── */
    firstWeight:  String,
    secondWeight: String,
    netWeight:    String,
  },
  { _id: false }
);

const STAGES = ["Gate In", "Empty Weighed", "Loaded", "Weighed", "Exited"];

const vehicleOutwardSchema = new mongoose.Schema(
  {
    gateOutNo: { type: String, required: true, unique: true },

    /* ── Transaction Category — links this Gate Out record to a
       Document Sequence (module="Sales", businessEntity="Vehicle
       Outward", transactionCategory=this value) so the Gate Out No.
       is generated from the sequence tied to the chosen category, the
       same way Sauda / Dispatch generate their numbers. ── */
    transactionCategory: String,

    dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Dispatch", required: true },
    dispatchNo: { type: String, required: true },

    partyCode:  String,
    customer:   String,   // party NAME — kept as "customer" for back-compat with existing queries/UI
    demandNo:   String,
    vehicleNo:  String,
    driverName: String,
    items:      [itemSchema],

    stage: { type: String, enum: STAGES, default: "Gate In" },

    // Stage 1 — Gate In
    gateInDate: String, // yyyy-mm-dd
    gateInTime: String, // HH:mm

    /* ── Vehicle Outward Weighment — header fields captured on the
       Weighment page (VehicleOutwardWeighment.jsx), same layout as
       WeighmentPages.jsx: its own Transaction Category → its own
       Weighment No via Document Sequence (module="Sales",
       businessEntity="Weighment"), separate from the Gate Out No.
       above. ── */
    weighmentNo:               String,
    weighmentTransactionCategory: String,
    weighmentDate:              String, // yyyy-mm-dd
    description:                String,
    weighmentInDate:             String, // yyyy-mm-dd
    weighmentInTime:             String, // HH:mm
    transporterName:             String,
    invoiceNo:                   String,
    invoiceDate:                 String, // yyyy-mm-dd
    weighmentStatus:             { type: String, default: "Open" }, // Open/Draft/Saved/Convert/Closed — independent of `stage`

    // Stage 2 — Empty (tare) weighment
    tareWeight:     Number, // MT
    tareWeightTime: String, // HH:mm

    // Stage 3 — Loaded
    loadedDate: String,
    loadedTime: String,

    // Stage 4 — Loaded (gross) weighment
    grossWeight:     Number, // MT
    grossWeightTime: String, // HH:mm
    netWeight:       Number, // MT — grossWeight - tareWeight

    // Stage 5 — Exit
    exitDate: String,
    exitTime: String,

    remarks: String,
  },
  { timestamps: true }
);

vehicleOutwardSchema.statics.STAGES = STAGES;

module.exports = mongoose.model("VehicleOutward", vehicleOutwardSchema, "vehicleoutwards");