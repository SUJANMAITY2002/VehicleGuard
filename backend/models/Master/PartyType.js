const mongoose = require("mongoose");

const partyTypeSchema = new mongoose.Schema(
  {
    partyType: { type: String },
    description: { type: String },
    status: { type: String, default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PartyType", partyTypeSchema);