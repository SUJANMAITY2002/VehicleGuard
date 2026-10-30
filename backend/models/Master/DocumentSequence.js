const mongoose = require("mongoose");

const documentSequenceSchema = new mongoose.Schema(
  {
    module:              { type: String },
    businessEntity:      { type: String },
    entityPrefix:        { type: String },
    transactionCategory: { type: String },
    sequenceFormat:      { type: String },
    useDateFragment:     { type: Boolean, default: true },

    // How many digits the running number should be padded to (e.g. 2 → "01", 4 → "0001")
    sequenceDigits:      { type: Number, default: 2 },

    incrementNo:         { type: Number, default: 1 },

    // Step size added to the running number every time a new document is generated.
    // e.g. incrementStep = 1 → 1, 2, 3, 4 ...   incrementStep = 2 → 2, 4, 6, 8 ...
    incrementStep:       { type: Number, default: 1 },
    generatedCode:       { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DocumentSequence", documentSequenceSchema);