const mongoose = require("mongoose");

const weighmentItemSchema = new mongoose.Schema(
  {
    sNo:          Number,
    itemCode:     String,
    itemName:     String,
    uom:          String,
    firstWeight:  String,
    secondWeight: String,
    netWeight:    String,
    remarks:      String,
  },
  { _id: false }
);

const weighmentSchema = new mongoose.Schema(
  {
    /* ── Header ── */
    weighmentNo:         String,   // auto from doc sequence: IN/OT/GN + YYMMDD + seq
    description:         String,
    weighmentDate:       String,
    transactionType:     String,   // Inward | Outward | General

    /* ── Part 2 ── */
    inwardOutwardNoteNo: String,
    vehicleNo:           String,
    partyCode:           String,
    partyName:           String,
    site:                String,
    status:              String,   // Draft | Partial | Submit | Weighted
    weighmentInDate:     String,
    weighmentInTime:     String,
    weighmentOutDate:    String,
    weighmentOutTime:    String,

    /* ── Weight summary (kept as-is, populated via Get Weight flow) ── */
    firstWeight:         String,
    secondWeight:        String,
    netWeight:           String,

    /* ── Remarks ── */
    remarks:             String,

    /* ── Reference fields (copied from GIN) ── */
    transactionCategory: String,
    transporterName:     String,
    vendorCode:          String,
    vendorName:          String,
    poCpoNo:             String,
    manufacturerCode:    String,
    manufacturerName:    String,
    supplierInvoiceNo:   String,
    supplierInvoiceDate: String,
    challanDate:         String,
    ewayDate:            String,
    billNo:              String,
    billDate:            String,
    totalDispatchWeight: String,
    transitDate:         String,

    /* ── Items grid ── */
    items: [weighmentItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Weighment", weighmentSchema);