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

  /* ── KEPT fields only ── */
  ginNo:               { type: String, required: true },
  poCpoNo:             String,
  status:              { type: String, default: "Open" },
  site:                String,
  ginDate:             String,
  transactionCategory: String,
  vendorCode:          String,
  vendorName:          String,
  vehicleEntry:        String,
  manufacturerName:    String,
  vehicleNo:           String,
  billNo:              String,
  billDate:            String,
  ewayDate:            String,
  remarks:             String,

  /* Items grid */
  items: [ginItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("GoodsInwardNote", goodsInwardNoteSchema);