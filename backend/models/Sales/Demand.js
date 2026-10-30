const mongoose = require("mongoose");

/* ── Item sub-schema — Item Type / Item Code / Item Name / Size / Length / Qty ── */
const demandItemSchema = new mongoose.Schema({
  sNo:      Number,
  itemType: String,   // auto-filled from the source Sauda's items
  itemCode: String,   // auto-filled from Item Name master when itemName is chosen
  itemName: String,   // chosen from Item Name master
  size:     String,
  length:   { type: Number, default: 0 },
  qty:      { type: Number, default: 0 },
}, { _id: false });

const demandSchema = new mongoose.Schema({

  /* ── Core / Number ── */
  demandNo:      { type: String, required: true },

  /* ── Source Sauda (Step 1) — party & transaction details are pulled
       from the Sauda at creation time and kept read-only here ── */
  saudaId:       { type: mongoose.Schema.Types.ObjectId, ref: "Sauda" },
  saudaNo:       String,
  partyCode:     String,
  partyName:     String,
  partyAddress:  String,

  /* ── Transaction Category — links this Demand to a Document Sequence
       (module="Sales", businessEntity="Demand Entry", transactionCategory=
       this value) so the Demand No. is generated from the sequence tied
       to the chosen category, same pattern as Create Inward/Outward's
       GIN No. and Create Sauda's Sauda No. ── */
  transactionCategory: String,

  transactionType: { type: String, enum: ["T", "UT"], default: "T" },

  /* ── Dates / Priority ── */
  demandDate:    String,   // YYYY-MM-DD — entry date
  dispatchDate:  String,   // YYYY-MM-DD — required dispatch date
  priority:      { type: String, default: "Medium" }, // High | Medium | Low

  /* ── Status ──
     Pending → Production Requested → Ready → Dispatched
     (Pending → Production Requested happens automatically,
      see utils/productionRequestGenerator.js)             */
  status:        { type: String, default: "Pending" },

  /* ── Qty summary against the source Sauda ──
     saudaQty   = fixed total qty ordered across ALL items on the source
                  Sauda (captured the moment the Sauda is picked)
     totalQty   = sum of qty across this Demand's item rows
     balanceQty = saudaQty - totalQty                                  */
  saudaQty:      { type: Number, default: 0 },
  totalQty:      { type: Number, default: 0 },
  balanceQty:    { type: Number, default: 0 },

  /* ── Items grid (Size / Qty) ── */
  items: [demandItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("Demand", demandSchema);