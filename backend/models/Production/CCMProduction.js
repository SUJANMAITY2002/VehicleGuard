const mongoose = require("mongoose");

/*
  CCM PRODUCTION (Continuous Casting Machine)
  ─────────────────────────────────────────────
  Liquid steel in → billets out. Billet output splits two ways:

    outputs — normal billets that feed Rolling Production next.
              This is what Rolling draws its raw-material stock from.

    bypass  — billets that skip Rolling entirely and go straight to
              Dispatch/Sales as-is (sold/shipped as billets, not
              rolled into bars). Tracked separately so CCM's own
              "Total Billet Output" (→ Rolling) and "Total Bypass"
              (→ Dispatch) never get mixed into one number — Rolling
              Production and Production Stock both need to know which
              billets are actually theirs to draw down.
*/

const inputItemSchema = new mongoose.Schema(
  {
    sNo:     Number,
    material: String,   // e.g. "Liquid Steel"
    heatQty:  { type: Number, default: 0 }, // MT
    uom:      { type: String, default: "MT" },
  },
  { _id: false }
);

/* Shared shape for both outputs (→ Rolling) and bypass (→ Dispatch).
   startTime/endTime record the casting time-segment each billet row
   belongs to; billetSize doubles as "Length" in the UI. */
const billetItemSchema = new mongoose.Schema(
  {
    sNo:        Number,
    startTime:  String,   // HH:mm
    endTime:    String,   // HH:mm
    billetSize: String,   // e.g. "130×130" — Length/Size
    grade:      String,   // e.g. "Fe500"
    qty:        { type: Number, default: 0 }, // MT
    remarks:    String,
  },
  { _id: false }
);

const STATUSES = ["Open", "Draft", "Closed"];
const SHIFTS   = ["A", "B", "C"];

const ccmProductionSchema = new mongoose.Schema(
  {
    ccmNo:     { type: String, required: true, unique: true },
    ccmDate:   String, // yyyy-mm-dd
    shift:     { type: String, enum: SHIFTS, default: "A" },
    heatNo:    { type: String, required: true },
    furnaceNo: String,
    operator:  String,
    status:    { type: String, enum: STATUSES, default: "Open" },
    remarks:   String,

    inputs:  [inputItemSchema],
    outputs: [billetItemSchema], // → Rolling Production raw-material stock
    bypass:  [billetItemSchema], // → straight to Dispatch/Sales, skips Rolling

    // Losses
    scrapQty:     { type: Number, default: 0 }, // MT
    rejectionQty: { type: Number, default: 0 }, // MT
    totalLossQty: { type: Number, default: 0 }, // MT — scrap + rejection

    // Totals — stored (not computed on read) so list/search stays fast
    inputQty:       { type: Number, default: 0 }, // MT — sum of inputs
    totalBilletQty: { type: Number, default: 0 }, // MT — sum of outputs (→ Rolling)
    totalBypassQty: { type: Number, default: 0 }, // MT — sum of bypass (→ Dispatch)
    yieldPct:       { type: Number, default: 0 }, // (totalBilletQty + totalBypassQty) / inputQty × 100

    /* Whether this CCM entry's bypass billets have been picked up by
       a Dispatch yet — lets Production Stock / Dispatch tell which
       bypass batches are still available vs already issued. Not
       wired to Dispatch yet, just tracked here so that hookup is a
       later addition, not a schema change. */
    bypassStatus: { type: String, enum: ["Pending", "Dispatched"], default: "Pending" },
  },
  { timestamps: true }
);

ccmProductionSchema.statics.STATUSES = STATUSES;
ccmProductionSchema.statics.SHIFTS   = SHIFTS;

module.exports = mongoose.model("CCMProduction", ccmProductionSchema, "ccmproductions");