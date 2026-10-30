const mongoose = require("mongoose");

const schemeMasterSchema = new mongoose.Schema(
  {
    schemeName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    item: {
      type: String,
      required: true,
      trim: true,
    },

    logicAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    startDate: {
      type: String,
      required: true,
    },

    endDate: {
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

module.exports = mongoose.model("SchemeMaster", schemeMasterSchema);
