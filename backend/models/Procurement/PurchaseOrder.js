const mongoose = require("mongoose");

const poItemSchema = new mongoose.Schema({
  sNo:          { type: Number },
  itemCode:     { type: String, default: "" },
  itemCategory: { type: String, default: "" },
  itemName:     { type: String, default: "" },
  uom:          { type: String, default: "" },
  qty:          { type: Number, default: 0 },
  rate:         { type: Number, default: 0 },
  basicAmount:  { type: Number, default: 0 },
  netAmount:    { type: Number, default: 0 },
  /* kept for backward-compat */
  serviceCharge: { type: Number, default: 0 },
  charges:       { type: Number, default: 0 },
  discount:      { type: Number, default: 0 },
});

const serviceRowSchema = new mongoose.Schema({
  sNo:         { type: Number },
  serviceCode: { type: String, default: "" },
  serviceName: { type: String, default: "" },
  qty:         { type: Number, default: 0 },
  rate:        { type: Number, default: 0 },
  amount:      { type: Number, default: 0 },
});

const chargeRowSchema = new mongoose.Schema({
  sNo:         { type: Number },
  code:        { type: String, default: "" },
  description: { type: String, default: "" },
  amount:      { type: Number, default: 0 },
});

const taxRowSchema = new mongoose.Schema({
  sNo:      { type: Number },
  taxType:  { type: String, default: "" },
  taxCode:  { type: String, default: "" },
  taxName:  { type: String, default: "" },
  totalTax: { type: String, default: "" },
  amount:   { type: Number, default: 0 },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNo:        { type: String },
    poDate:      { type: String },
    poType:      { type: String, default: "" },
    transactionCategory: { type: String, default: "" },
    site:        { type: String, default: "" },
    partyCode:   { type: String, default: "" },
    partyName:   { type: String, default: "" },
    mobileNo:    { type: String, default: "" },
    paymentMode: { type: String, default: "" },
    eta:         { type: String, default: "" },
    dueDate:     { type: String, default: "" },
    status:      { type: String, default: "Ordered" },
    remarks:     { type: String, default: "" },
    basicAmount: { type: Number, default: 0 },
    netAmount:   { type: Number, default: 0 },
    totalQty:    { type: Number, default: 0 },
    items:       [poItemSchema],
    serviceRows: [serviceRowSchema],
    chargeRows:  [chargeRowSchema],
    taxRows:     [taxRowSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);