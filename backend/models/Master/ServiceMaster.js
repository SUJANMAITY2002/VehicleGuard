const mongoose = require("mongoose");

const serviceMasterSchema = new mongoose.Schema(
  {
    entityDate:     { type: Date,   required: true },
    serviceCode:    { type: String, required: true, unique: true },
    serviceDetails: { type: String },
    sacCode:        { type: String, required: true },
    sacDescription: { type: String },
    taxClass:       { type: String },   // e.g. "GST", "IGST", "Exempt"
    status:         { type: String, default: "Active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceMaster", serviceMasterSchema);