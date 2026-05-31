const mongoose = require("mongoose");

/* ── Item sub-schema (Items grid) ── */
const directGRNItemSchema = new mongoose.Schema({
  sNo:           Number,
  insertBags:    String,
  itemRate:      String,
  transactionNo: String,
  partyName:     String,
  broker:        String,
  itemCode:      String,
  itemName:      String,
  uom:           String,
  salesThrough:  String,
}, { _id: false });

const directGRNSchema = new mongoose.Schema({

  /* ── auto-generated ── */
  grnNo: { type: String, required: true },

  /* ── header fields (matches screenshot) ── */
  status:              { type: String, default: "Open" },
  grnDate:             String,
  grnDescription:      String,
  grnType:             String,           // "F and A Impact", "Domestic", "International"
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

  /* ── linked GIN ── */
  linkedGinNo:         String,

  /* ── items ── */
  items: [directGRNItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("DirectGRN", directGRNSchema);