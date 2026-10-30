const mongoose = require("mongoose");

/* ── Item sub-schema ── */
const ginItemSchema = new mongoose.Schema({
  sNo:       Number,
  itemCode:  String,
  itemName:  String,
  uom:       String,
  qty:       Number,
  rate:      { type: Number, default: 0 },   // rate fetched from PO item
}, { _id: false });

const goodsInwardNoteSchema = new mongoose.Schema({

  /* ── Core / Number ── */
  ginNo:               { type: String, required: true },
  inOutDescription:    String,   // IN/OUT Description
  inOutType:           String,   // "Inward" | "Outward"

  /* ── PO Reference ── */
  poCpoNo:             String,

  /* ── Entry date / time — manually entered by the user ── */
  ginDate:             String,   // Entry date (YYYY-MM-DD)
  entryTime:           String,   // Gate entry time (HH:MM) — entered manually

  /* ── Exit / Closed date & time — manually entered when status → Closed ── */
  exitTime:            String,   // Closed time (HH:MM:SS) — entered manually
  closedDate:          String,   // Closed date (YYYY-MM-DD) — entered manually

  /* ── Party ── */
  partyCode:           String,
  partyName:           String,
  partyDoc:            String,   // Party document reference

  /* ── Manufacturer ── */
  manufacturerName:    String,
  manufacturerAddress: String,

  /* ── Status ── */
  status:              { type: String, default: "Open" },  // "Open" | "Closed"

  /* ── Challan / Vehicle ── */
  challanInvoiceNo:    String,
  challanDate:         String,
  challanTime:         String,   // HH:MM — entered manually alongside challanDate
  vehicleNo:           String,

  /* ── Closed timestamp — composed from closedDate + closedTime ── */
  closedAt:            String,   // ISO datetime string composed from manual closedDate + closedTime

  /* ── Weights (manual entry) ── */
  grossWeight:         Number,
  tareWeight:          Number,
  netWeight:           Number,

  /* ── Notes ── */
  remarks:             String,

  /* ── Site ── */
  site:                String,

  /* ── Legacy / kept for backward compat ── */
  transactionCategory: String,
  ginDescription:      String,
  ginType:             String,
  deliveryMode:        String,
  vendorCode:          String,
  vendorName:          String,
  manufacturerCode:    String,
  vehicleEntry:        String,
  billNo:              String,
  billDate:            String,
  ewayDate:            String,
  comments:            String,

  /* ── Items grid ── */
  items: [ginItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("GoodsInwardNote", goodsInwardNoteSchema);