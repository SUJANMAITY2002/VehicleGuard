const mongoose = require("mongoose");

const itemNameSchema = new mongoose.Schema(
  {
    // References SalesItemType.itemType (validated in routes, same pattern as Item → ItemGroup)
    itemType: { type: String, required: true },

    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },

    date: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemName", itemNameSchema);