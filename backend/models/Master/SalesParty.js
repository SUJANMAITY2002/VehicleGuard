const mongoose = require("mongoose");

const salesPartySchema = new mongoose.Schema(
  {
    partyCode: {
      type: String,
    },

    partyName: {
      type: String,
    },

    location: {
      type: String,
    },

    city: {
      type: String,
    },

    district: {
      type: String,
    },

    state: {
      type: String,
    },

    pinCode: {
      type: String,
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesParty", salesPartySchema);