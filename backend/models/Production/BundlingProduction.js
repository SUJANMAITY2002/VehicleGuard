const mongoose = require("mongoose");

const bundlingInputSchema = new mongoose.Schema(
  {
    sNo:      { type: Number },
    product:  { type: String, trim: true },
    looseQty: { type: Number, default: 0 },
    uom:      { type: String, default: "MT" },
  },
  { _id: false }
);

const bundleItemSchema = new mongoose.Schema(
  {
    sNo:          { type: Number },
    bundleNo:     { type: String, trim: true },
    bundleWeight: { type: Number, default: 0 },
    pieces:       { type: Number, default: 0 },
    tagNumber:    { type: String, trim: true },
    bundleType:   { type: String, trim: true },
    customerSpec: { type: String, trim: true },
    bundleStatus: { type: String, default: "Ready" },
  },
  { _id: false }
);

const bundlingProductionSchema = new mongoose.Schema(
  {
    bundleEntryNo: { type: String, required: true, unique: true, trim: true },
    bundleDate:    { type: String, required: true },
    site:          { type: String, required: true },
    shift:         { type: String, enum: ["A", "B", "C"], default: "A" },
    operator:      { type: String, trim: true },
    remarks:       { type: String },
    status:        { type: String, enum: ["Open", "Draft", "Closed"], default: "Open" },

    inputs:  { type: [bundlingInputSchema], default: [] },
    bundles: { type: [bundleItemSchema],    default: [] },

    totalLooseQty:   { type: Number, default: 0 },
    totalBundleWt:   { type: Number, default: 0 },
    totalPieces:     { type: Number, default: 0 },
    totalBundleCount:{ type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BundlingProduction", bundlingProductionSchema);