const mongoose = require("mongoose");

/* ── Item sub-schema (Sl No / Item Type / Item Code / Item Name / Size / Rate / Qty) ── */
const saudaItemSchema = new mongoose.Schema({
  sNo:      Number,
  itemType: String,   // from Sales Item Type master
  itemCode: String,   // auto-filled from Item Name master when itemName is chosen
  itemName: String,   // chosen from Item Name master
  rate:     { type: Number, default: 0 },
  qty:      { type: Number, default: 0 },
}, { _id: false });

const saudaSchema = new mongoose.Schema({

  /* ── Core / Number ── */
  saudaNo:       { type: String, required: true },
  saudaDate:     String,          // YYYY-MM-DD

  /* ── Party — sourced from Sales Party master ── */
  partyCode:     String,
  partyName:     String,
  partyAddress:  String,

  /* ── Transaction Category — links this Sauda to a Document Sequence
       (module="Sales", businessEntity="Sauda", transactionCategory=
       this value) so the Sauda No. is generated from the sequence tied
       to the chosen category, the same way Create Inward/Outward does
       it for the GIN No. ── */
  transactionCategory: String,

  /* ── Transaction Type — Taxable (T) / Un-Taxable (UT) ── */
  transactionType: { type: String, enum: ["T", "UT"], default: "T" },

  /* ── Terms ── */
  validTill:     String,          // YYYY-MM-DD, optional
  paymentTerms:  String,
  remarks:       String,

  /* ── Status ──
     Draft → Confirmed → Completed
              └────────→ Cancelled            */
  status:        { type: String, default: "Draft" },

  /* ── Items grid ── */
  items: [saudaItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("Sauda", saudaSchema);