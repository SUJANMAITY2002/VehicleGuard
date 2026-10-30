const mongoose = require("mongoose");

const itemTaxClassSchema = new mongoose.Schema(
  {
    itemTaxClassCode: {
      type:     String,
      required: true,
      trim:     true,
    },
    description: {
      type:  String,
      trim:  true,
      default: "",
    },
    status: {
      type:    String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemTaxClass", itemTaxClassSchema);