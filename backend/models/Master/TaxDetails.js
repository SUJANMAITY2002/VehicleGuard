const mongoose = require("mongoose");

// ── UPDATED Tax Details model ──────────────────────────────────────────────
// Fields added: entityDate, taxType, taxCode, taxName, percentage, addOrSubtract
// hsnCode / gstPercent / description kept for backward-compat (can be dropped later)
const taxDetailsSchema = new mongoose.Schema(
  {
    entityDate:    { type: Date },
    taxType:       { type: String, required: true },   // e.g. "GST" | "IGST" | "CGST" | "SGST"
    taxCode:       { type: String, required: true, unique: true },
    taxName:       { type: String, required: true },
    percentage:    { type: Number, required: true },
    addOrSubtract: { type: String, enum: ["Addition", "Subtraction"], default: "Addition" },
    status:        { type: String, default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TaxDetails", taxDetailsSchema);