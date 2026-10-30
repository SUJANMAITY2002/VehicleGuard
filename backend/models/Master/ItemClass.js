const mongoose = require("mongoose");

const itemClassSchema = new mongoose.Schema(
  {
    className:   { type: String, required: true },
    description: { type: String },
    date:        { type: Date, default: Date.now },
    status:      { type: String, default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemClass", itemClassSchema);