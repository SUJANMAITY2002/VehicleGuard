const mongoose = require("mongoose");

const siteMasterSchema = new mongoose.Schema(
  {
    siteCode: {
      type: String,
      required: true,
      unique: true,
    },

    siteName: {
      type: String,
      required: true,
    },

    address: {
      type: String,
    },

    city: {
      type: String,
    },

    state: {
      type: String,
    },

    pinCode: {
      type: String,
    },

    contactPerson: {
      type: String,
    },

    mobile: {
      type: String,
    },

    gstNo: {
      type: String,
    },

    status: {
      type: String,
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteMaster", siteMasterSchema);
