const mongoose = require("mongoose");

/* ── Conversion row sub-schema ── */
const conversionRowSchema = new mongoose.Schema({
  sNo:           { type: Number },
  inventoryName: { type: String, default: "" },
  inventoryCode: { type: String, default: "" },  // item code from Item Master
  uom:           { type: String, default: "" },   // auto from Item Master
  raQty:         { type: Number, default: 0 },    // manual entry (was rQty)
  rateDiff:      { type: Number, default: 0 },    // from Item Master rateDiff field
  rate:          { type: Number, default: 0 },    // baseRate + rateDiff (auto-calculated)
  amount:        { type: Number, default: 0 },    // raQty * rate (auto-calculated)

  /* legacy fields (kept for backward compatibility) */
  cQty:          { type: Number, default: 0 },
  rQty:          { type: Number, default: 0 },
}, { _id: false });

/* ── Main schema ── */
const itemConversionSchema = new mongoose.Schema({

  /* ── Document No ── */
  icNo:          { type: String, required: true },

  /* ── Transaction Category (master-driven; determines IC No prefix) ── */
  transactionCategory: { type: String, default: "" },

  /* ── Reference from Inward note ── */
  ginId:         { type: String, default: "" },
  poNo:          { type: String, default: "" },
  vehicleNo:     { type: String, default: "" },
  partyName:     { type: String, default: "" },
  partyCode:     { type: String, default: "" },

  /* ── Base item ── */
  itemCode:      { type: String, default: "" },
  itemDescription: { type: String, default: "" },
  baseQty:       { type: Number, default: 0 },   // CQty — manual entry
  baseRate:      { type: Number, default: 0 },   // from Item Master
  uom:           { type: String, default: "" },

  /* ── Conversion rows ── */
  conversionRows: [conversionRowSchema],

  /* ── Totals (auto-derived from rows) ── */
  totalRaQty:    { type: Number, default: 0 },   // sum of all row raQty
  totalAmount:   { type: Number, default: 0 },   // sum of all row amounts

  /* ── Legacy total (kept for backward compat) ── */
  totalRate:     { type: Number, default: 0 },

  /* ── Dates ── */
  conversionDate: { type: String, default: "" },

  /* ── Status & Remarks ── */
  status:        { type: String, default: "Active" },
  remarks:       { type: String, default: "" },

}, { timestamps: true });

module.exports = mongoose.model("ItemConversion", itemConversionSchema);