const mongoose = require("mongoose");

/* ════════════════════════════════════════════
   HEAT COUNTER
   One row per calendar day (dateKey = YYYYMMDD).
   seq is incremented atomically via $inc so concurrent
   "Create Heat" requests never collide on the same Heat No.
════════════════════════════════════════════ */
const heatCounterSchema = new mongoose.Schema({
  dateKey: { type: String, required: true, unique: true }, // e.g. "20260810"
  seq:     { type: Number, default: 0 },
});

module.exports = mongoose.model("HeatCounter", heatCounterSchema);