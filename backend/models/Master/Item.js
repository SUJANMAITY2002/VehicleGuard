const mongoose = require("mongoose");

const uomDetailSchema = new mongoose.Schema({
  bUom:    String,
  bQty:    Number,
  wUom:    String,
  wQty:    Number,
  isBuom:  { type: Boolean, default: false },
});

const itemSchema = new mongoose.Schema(
  {
    itemCode:   String,
    itemName:   String,

    // Item Type (Raw Material, Finished Goods, etc.)
    itemTypes:  String,

    // Category — filtered by itemTypes
    category:   String,

    // Item Group — filtered by category
    itemGroup:  String,

    // Header UOM
    uom:        String,

    // UOM Detail Grid
    uomDetails: [uomDetailSchema],

    hsn:        String,
    gstPercent: Number,

    // Item Class — from ItemClass master
    itemClass:  String,

    grade:      String,
    size:       String,

    rateDiff: {
      type: Number,
      default: 0,
    },

    // Date field — positioned after Item Group
    date: {
      type:    Date,
      default: null,
    },

    // Item Tax Class — from ItemTaxClass master
    itemTaxClass: {
      type:    String,
      default: "",
    },

    // Reference Item (formerly fromItem)
    referenceItem: {
      type:    String,
      default: "",
    },

    status: {
      type:    String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);