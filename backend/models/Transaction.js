const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

  module: {
    type: String,
  },

  businessEntity: {
    type: String,
  },

  transactionCategoryCode: {
    type: String,
  },

  categoryDescription: {
    type: String,
  },

  status: {
    type: String,
  },

  rounding: {
    type: String,
  },

  roundingAccount: {
    type: String,
  },

  remark1: {
    type: String,
  },

  remark2: {
    type: String,
  },

  workflowComments: {
    type: String,
  },

}, { timestamps: true });

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);