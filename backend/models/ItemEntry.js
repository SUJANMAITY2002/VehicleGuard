const mongoose = require("mongoose");

const itemEntrySchema = new mongoose.Schema(
  {
    entryNo: {
      type: String,
      required: [true, "Entry number is required"],
      trim: true,
    },
    vehicleNo:  { type: String, trim: true },
    particleNo: { type: String, trim: true },
    entryDate:  { type: String },

    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    itemCategory: {
      type: String,
      enum: ["Raw Material", "Finished Goods", "Scrap", "Equipment", "Other"],
      default: "Other",
    },

    withoutItemWeight: {
      type: Number,
      required: [true, "Without-item vehicle weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    withItemWeight: {
      type: Number,
      required: [true, "With-item vehicle weight is required"],
      min: [0, "Weight cannot be negative"],
    },
    netWeight: {
      type: Number,
    },

    remarks: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemEntry", itemEntrySchema);