const mongoose = require("mongoose");

const chargesMasterSchema = new mongoose.Schema(
  {
    entityDate:        { type: Date,   required: true },
    type:              { type: String, required: true },   // e.g. "Charges" | "Discount"
    code:              { type: String, required: true, unique: true },
    details:           { type: String },
    addOrSubtract:     { type: String, enum: ["Addition", "Subtraction"], required: true },
    status:            { type: String, default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChargesMaster", chargesMasterSchema);