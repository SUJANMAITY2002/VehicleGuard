const mongoose = require("mongoose");

const partySchema = new mongoose.Schema(
  {
    partyCode: {
      type: String,
    },

    partyName: {
      type: String,
    },

    type: {
      type: String,
    },

    city: {
      type: String,
    },

    addressLine1: {
      type: String,
    },

    addressLine2: {
      type: String,
    },

    pin: {
      type: String,
    },

    gstNo: {
      type: String,
    },

    mobile: {
      type: String,
    },

    payTerms: {
      type: String,
    },

    creditDays: {
      type: Number,
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Party", partySchema);