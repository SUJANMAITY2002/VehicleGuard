const mongoose = require("mongoose");

const weighmentItemSchema = new mongoose.Schema({
  sNo:          Number,
  firstWeight:  String,
  secondWeight: String,
  netWeight:    String,
  remarks:      String,
}, { _id: false });

const weighmentSchema = new mongoose.Schema({

  /* ── KEPT fields (removed: brokerName, weighmentCategory, lrNo, lrDate, fromPlace, toPlace, workflowComments) ── */
  weighmentNo:         String,
  transactionCategory: String,
  status:              String,
  inwardOutwardNoteNo: String,
  vehicleNo:           String,
  site:                String,
  transactionType:     String,
  partyName:           String,
  transporterName:     String,
  weighmentInDate:     String,
  weighmentInTime:     String,
  weighmentDate:       String,
  weighmentOutDate:    String,
  weighmentOutTime:    String,
  firstWeight:         String,
  secondWeight:        String,
  netWeight:           String,
  supplierInvoiceNo:   String,
  supplierInvoiceDate: String,
  transitDate:         String,
  billNo:              String,
  billDate:            String,
  totalDispatchWeight: String,
  remarks:             String,
  bulkWeigh:           Boolean,
  vendorCode:          String,
  vendorName:          String,
  poCpoNo:             String,
  manufacturerCode:    String,
  manufacturerName:    String,
  challanDate:         String,
  ewayDate:            String,

  /* Items grid rows */
  items: [weighmentItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("Weighment", weighmentSchema);