const mongoose = require("mongoose");

const salesItemTypeSchema = new mongoose.Schema(
  {
    // e.g. "SIT001"
    itemTypeCode: { type: String, required: true },

    // e.g. "TMT Bar", "Wire Rod"
    itemType: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesItemType", salesItemTypeSchema);