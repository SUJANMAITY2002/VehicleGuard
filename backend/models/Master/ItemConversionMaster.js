const mongoose = require("mongoose");

const itemConversionMasterSchema = new mongoose.Schema(
  {
    conversionTypeName: { type: String, required: true },
    description:        { type: String, default: "" },
    status:             { type: String, default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemConversionMaster", itemConversionMasterSchema);