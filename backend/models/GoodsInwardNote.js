const mongoose = require("mongoose");

/* ── Item sub-schema ── */
const ginItemSchema = new mongoose.Schema({
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

const goodsInwardNoteSchema = new mongoose.Schema({

  /* ── Core ── */
  ginNo:               { type: String, required: true },
  poCpoNo:             String,
  status:              { type: String, default: "Open" },
  site:                String,
  ginDate:             String,

  /* ── FIXED: these were missing and being silently dropped ── */
  ginDescription:      String,
  ginType:             String,
  deliveryMode:        String,
  transactionCategory: String,

  /* Vendor */
  vendorCode:          String,
  vendorName:          String,

  /* Manufacturer */
  manufacturerCode:    String,
  manufacturerName:    String,
  manufacturerAddress: String,

  /* Vehicle */
  vehicleEntry:        String,
  vehicleNo:           String,

  /* Challan / Bill */
  challanInvoiceNo:    String,
  challanDate:         String,
  billNo:              String,
  billDate:            String,
  ewayDate:            String,

  /* Notes */
  remarks:             String,
  comments:            String,

  /* Items grid */
  items: [ginItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("GoodsInwardNote", goodsInwardNoteSchema);