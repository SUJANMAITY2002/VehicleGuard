const mongoose = require("mongoose");

const documentSequenceSchema =
  new mongoose.Schema({

    module: {
      type: String,
    },

    businessEntity: {
      type: String,
    },

    transactionCategory: {
      type: String,
    },

    sequenceFormat: {
      type: String,
    },

    incrementNo: {
      type: Number,
      default: 1,
    },

    generatedCode: {
      type: String,
    },

  },
  {
    timestamps: true,
  });

module.exports =
  mongoose.model(
    "DocumentSequence",
    documentSequenceSchema
  );