const mongoose = require("mongoose");

const vehicleEntrySchema = new mongoose.Schema(
  {
    entryNo: {
      type: String,
      required: [true, "Entry number is required"],
      unique: true,
      trim: true,
    },
    entryDate: {
      type: String,
      required: [true, "Entry date is required"],
    },
    vehicleNo: {
      type: String,
      required: [true, "Vehicle number is required"],
      uppercase: true,
      trim: true,
    },
    particleNo: {
      type: String,
      required: [true, "Particle number is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleEntry", vehicleEntrySchema);