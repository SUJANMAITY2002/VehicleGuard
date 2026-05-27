const mongoose = require("mongoose");

const rowSchema = new mongoose.Schema({
  slNo:     { type: Number },
  itemName: { type: String, trim: true },
  tare:     { type: Number, default: 0 },   // KGS
  gross:    { type: Number, default: 0 },   // KGS
  net:      { type: Number, default: 0 },   // auto = gross - tare
  soNo:     { type: String, default: "", trim: true },
}, { _id: false });

const gatePassSchema = new mongoose.Schema(
  {
    gatePassNo: {
      type: String,
      required: [true, "Gate Pass No is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    vehicleNo: {
      type: String,
      required: [true, "Vehicle No is required"],
      uppercase: true,
      trim: true,
    },
    partyName: {
      type: String,
      required: [true, "Party Name is required"],
      trim: true,
    },
    entryDate: {
      type: String,
      required: true,
    },
    rows: {
      type: [rowSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GatePass", gatePassSchema);