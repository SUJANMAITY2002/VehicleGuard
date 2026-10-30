const mongoose = require("mongoose");

const itemCategorySchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      default: "",
    },

    itemTypes: {
      type: String,
      required: true,
    },

    categoryName: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemCategory", itemCategorySchema);