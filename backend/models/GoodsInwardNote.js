const mongoose = require("mongoose");

const goodsInwardNoteSchema =
new mongoose.Schema({

  ginNo: {
    type: String,
    required: true,
  },

  poCpoNo: String,

  status: {
    type: String,
    default: "Open",
  },

  site: String,

  ginDate: String,

  ginDescription: String,

  ginType: String,

  deliveryMode: String,

  transactionCategory: String,

  vendorCode: String,

  vendorName: String,

  manufacturerAddress: String,

  vehicleEntry: String,

  manufacturerCode: String,

  manufacturerName: String,

  vehicleNo: String,

  challanInvoiceNo: String,

  challanDate: String,

  billDate: String,

  ewayDate: String,

  remarks: String,

  comments: String

},
{
  timestamps: true
});

module.exports =
mongoose.model(
  "GoodsInwardNote",
  goodsInwardNoteSchema
);