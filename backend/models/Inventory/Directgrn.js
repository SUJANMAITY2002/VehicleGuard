const mongoose = require("mongoose");

/* ── Item sub-schema (Items grid) ── */
const directGRNItemSchema = new mongoose.Schema({
  sNo:           Number,
  insertBags:    String,
  itemRate:      String,
  qty:           String,
  rate:          String,
  totalAmount:   String,   // qty * rate (auto-calculated on frontend)
  tmt:           String,
  transactionNo: String,
  partyName:     String,
  broker:        String,
  itemCode:      String,
  itemName:      String,
  uom:           String,
  salesThrough:  String,
}, { _id: false });

const directGRNChargeSchema = new mongoose.Schema({
  sNo:           Number,
  code:          String,
  description:   String,
  addOrSubtract: String,
  amount:        String,
}, { _id: false });

const directGRNSchema = new mongoose.Schema({

  /* ── auto-generated ── */
  grnNo: { type: String, required: true },

  /* ── header fields (matches screenshot) ── */
  status:              { type: String, default: "Open" },
  grnDate:             String,
  grnDescription:      String,
  grnType:             String,           // "T" or "UT" — mirrors the linked PO's poType, auto-fetched from PO
  transactionCategory: String,

  site:                String,
  accountingSite:      String,

  vendorCode:          String,
  vendorName:          String,
  vendorAddress:       String,

  acCode:              String,

  currency:            String,
  exchangeRate:        String,

  challanInvoiceNo:    String,
  challanDate:         String,

  deliveryMode:        String,
  creditTerms:         String,

  manufacturerCode:    String,
  manufacturerName:    String,
  manufacturerAddress: String,

  vehicleNo:           String,

  billDate:            String,
  ewayDate:            String,
  deliveryTerm:        String,

  remarks:             String,
  comments:            String,

  /* ── linked PO / GIN / Item Conversion ── */
  poNo:                String,   // PO No this GRN was raised against (auto-fetched from PO or the linked IC's PO)
  linkedGinNo:         String,
  linkedIcNo:          String,   // IC No that sourced this GRN (set when created from Item Conversion)

  /* ── items ── */
  items: [directGRNItemSchema],
  charges: [directGRNChargeSchema],

}, { timestamps: true });

module.exports = mongoose.model("DirectGRN", directGRNSchema);