const mongoose = require("mongoose");

/*
  PRODUCTION REQUEST — Step 3
  ─────────────────────────────
  One record per Demand ITEM ROW (not per Demand). Generated
  automatically when a Demand's Dispatch Date becomes tomorrow
  (see utils/productionRequestGenerator.js).

  Column layout (as used by ProductionRequestList.jsx):
  PR No. | Demand No. | Sauda No. | Demand Date | Dispatch Date |
  Item Type | Item Name | Size | Qty | Status | Action
*/

const productionRequestSchema = new mongoose.Schema(
  {
    /* ── Core / Number — from Document Sequence (module: "Production",
         businessEntity: "Production Request"), same pattern as Demand No ── */
    productionRequestNo: { type: String, required: true },

    /* ── Source Demand (Step 2) ── */
    demandId: { type: mongoose.Schema.Types.ObjectId, ref: "Demand" },
    demandNo: String,

    /* ── Source Sauda — carried through from the Demand ── */
    saudaNo: String,

    /* ── Party / transaction details — carried through from the Demand ── */
    partyName: String,
    transactionType: String, // "T" | "UT"
    priority: String,        // High | Medium | Low

    /* ── Dates — auto-fetched from the Demand ── */
    demandDate: String, // YYYY-MM-DD — the Demand's own entry date
    dispatchDate: String, // YYYY-MM-DD — the Demand's required dispatch date

    /* ── Request raised date (today, auto) ── */
    date: String,

    /* ── Item details — auto-fetched from the Demand's item row ── */
    itemType: String,
    itemCode: String,
    itemName: String,
    size: String,
    length: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    unit: { type: String, default: "MT" },

    /* ── Status ──
       Pending → In Production → Completed        */
    status: { type: String, default: "Pending" },

    /* ── How it was created — always "auto" for now, kept for audit ── */
    source: { type: String, default: "auto" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductionRequest", productionRequestSchema);