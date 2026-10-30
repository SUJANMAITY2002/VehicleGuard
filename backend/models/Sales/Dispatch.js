const mongoose = require("mongoose");

/* ── Item sub-schema (Item Code / Item Name / Size / Qty / Remarks) ── */
const dispatchItemSchema = new mongoose.Schema({
  sNo:      Number,
  itemCode: String,
  itemName: String,
  size:     String,
  qty:      { type: Number, default: 0 },
  remarks:  String,

  /* Traceability back to the source Demand this item was raised from */
  demandId: { type: mongoose.Schema.Types.ObjectId, ref: "Demand" },
  demandNo: String,
}, { _id: false });

const dispatchSchema = new mongoose.Schema({

  /* ── Core / Number ── */
  dispatchNo:   { type: String, required: true },
  dispatchDate: String,   // YYYY-MM-DD

  /* ── Transaction Category — links this Dispatch to a Document Sequence
       (module="Sales", businessEntity="Final Dispatch List",
       transactionCategory=this value) so the Dispatch No. is generated
       from the sequence tied to the chosen category, the same way
       Sauda / Create Inward-Outward generate their numbers. ── */
  transactionCategory: String,

  /* ── Source Sauda this dispatch was raised against ── */
  saudaId:      { type: mongoose.Schema.Types.ObjectId, ref: "Sauda" },
  saudaNo:      String,

  /* ── Party — carried over from the source Sauda at the time it was
       picked, so the Dispatch page (and any printed slip) shows who
       the goods are going to without a re-lookup ── */
  partyCode:    String,
  partyName:    String,
  partyAddress: String,

  /* ── Status ──
     Ready → Loaded → Vehicle Out                */
  status:       { type: String, default: "Ready" },

  /* ── Items grid ── */
  items: [dispatchItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("Dispatch", dispatchSchema);