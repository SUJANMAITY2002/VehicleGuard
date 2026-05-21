const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNo: {
      type: String,
      required: [true, "Vehicle number is required"],
      uppercase: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      required: [true, "Vehicle type is required"],
      enum: ["Car", "Truck", "Bus", "Bike", "Auto", "Van", "Other"],
    },
    entryGate: {
      type: String,
      required: [true, "Entry gate is required"],
      enum: ["Gate A", "Gate B", "Gate C", "Gate D"],
    },
    driverName: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
    },
    purpose: {
      type: String,
      required: [true, "Purpose is required"],
      enum: ["Delivery", "Visitor", "Staff", "Loading", "Other"],
    },

    // ── Date & Time ─────────────────────────────
    entryDate: {
      type: String,                        // stored as "YYYY-MM-DD"
      required: [true, "Entry date is required"],
    },
    entryTime: {
      type: String,
      required: [true, "Entry time is required"],
    },
    exitTime: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Inside", "Exited"],
      default: "Inside",
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);