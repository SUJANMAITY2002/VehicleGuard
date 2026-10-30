const mongoose = require("mongoose");

const prItemSchema = new mongoose.Schema({
  sNo:          { type: Number },
  itemCode:     { type: String, default: "" },
  itemName:     { type: String, default: "" },
  itemCategory: { type: String, default: "" },
  uom:          { type: String, default: "" },
  requiredQty:  { type: Number, default: 0 },
  remarks:      { type: String, default: "" },
});

const approvalHistorySchema = new mongoose.Schema({
  action:      { type: String, default: "" },  // "Requested" | "Approved" | "Rejected" | "Converted"
  performedBy: { type: String, default: "" },
  performedAt: { type: Date, default: Date.now },
  remarks:     { type: String, default: "" },
});

const purchaseRequisitionSchema = new mongoose.Schema(
  {
    prNo:         { type: String },
    prDate:       { type: String },

    department:   { type: String, default: "" },
    site:         { type: String, default: "" },
    requestedBy:  { type: String, default: "" },
    priority:     { type: String, default: "Normal" },  // High | Normal | Low
    requiredDate: { type: String, default: "" },

    status:       { type: String, default: "Pending" },
    // Pending → Approved → Converted to PO → Closed

    remarks:      { type: String, default: "" },

    /* set when converted */
    convertedToPO:   { type: Boolean, default: false },
    convertedPONo:   { type: String, default: "" },
    convertedPOId:   { type: String, default: "" },
    convertedAt:     { type: Date },
    convertedBy:     { type: String, default: "" },

    approvalHistory: [approvalHistorySchema],

    items: [prItemSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseRequisition", purchaseRequisitionSchema);