const mongoose = require("mongoose");

const rollingInputSchema = new mongoose.Schema(
  {
    sNo:        { type: Number },
    billetCode: { type: String, trim: true },
    billetSize: { type: String, trim: true },
    qty:        { type: Number, default: 0 },
    uom:        { type: String, default: "MT" },
  },
  { _id: false }
);

const rollingOutputSchema = new mongoose.Schema(
  {
    sNo:         { type: Number },
    productCode: { type: String, trim: true },
    productName: { type: String, trim: true },
    size:        { type: String, trim: true },
    qty:         { type: Number, default: 0 },
    uom:         { type: String, default: "MT" },
  },
  { _id: false }
);

const rollingProductionSchema = new mongoose.Schema(
  {
    rollingNo:   { type: String, required: true, unique: true, trim: true },
    rollingDate: { type: String, required: true },
    shift:       { type: String, enum: ["A", "B", "C"], default: "A" },
    site:        { type: String, required: true },
    millNo:      { type: String, trim: true },
    operator:    { type: String, trim: true },
    remarks:     { type: String },
    status:      { type: String, enum: ["Open", "Draft", "Closed"], default: "Open" },

    inputs:  { type: [rollingInputSchema],  default: [] },
    outputs: { type: [rollingOutputSchema], default: [] },

    /* Losses */
    millScaleQty: { type: Number, default: 0 },
    cropEndQty:   { type: Number, default: 0 },
    misrollQty:   { type: Number, default: 0 },
    rejectionQty: { type: Number, default: 0 },

    /* Totals */
    inputQty:      { type: Number, default: 0 },
    outputQty:     { type: Number, default: 0 },
    totalLossQty:  { type: Number, default: 0 },
    yieldPct:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RollingProduction", rollingProductionSchema);