const mongoose = require("mongoose");

const SalesContractSchema = new mongoose.Schema(
  {
    contract_no:   { type: String, required: true, unique: true, trim: true },
    contract_date: { type: Date,   required: true },
    customer:      { type: String, required: true, trim: true },

    // ── NEW FIELDS ──────────────────────────────────────────────────────────
    sales_person:  { type: String, trim: true, default: "" },
    item_type:     { type: String, trim: true, default: "" },
    scheme:        {
      type: String,
      enum: ["Ripur", "For", "Basic", ""],
      default: "",
    },
    // ────────────────────────────────────────────────────────────────────────

    qty:       { type: Number, required: true },
    type:      { type: String, enum: ["TE", "UT"], required: true },
    pay_terms: { type: String, required: true, trim: true },
    due_days:  { type: Number, default: null },
    due_date:  { type: Date,   default: null },
    rate:      { type: Number, required: true },
    remarks:   { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesContract", SalesContractSchema);