const express = require("express");
const router  = express.Router();
const DirectGRN = require("../models/DirectGRN");

/* ── POST / — create ── */
router.post("/", async (req, res) => {
  try {
    const doc = new DirectGRN(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Direct GRN Saved Successfully", data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET / — search with filters ── */
router.get("/", async (req, res) => {
  try {
    const {
      fromDate, toDate,
      grnNo, status,
      vendorCode, vendorName,
      vehicleNo, site,
      invoiceNo, invoiceDate,
      itemCode, itemName,
      itemGroup, itemType,
      transactionCategory,
      poCpoNo,
      deliveryMode, grnType,
    } = req.query;

    const query = {};

    if (grnNo)               query.grnNo               = { $regex: grnNo,               $options: "i" };
    if (status)              query.status              = status;
    if (vendorCode)          query.vendorCode          = { $regex: vendorCode,          $options: "i" };
    if (vendorName)          query.vendorName          = { $regex: vendorName,          $options: "i" };
    if (vehicleNo)           query.vehicleNo           = { $regex: vehicleNo,           $options: "i" };
    if (site)                query.site                = { $regex: site,                $options: "i" };
    if (invoiceNo)           query.challanInvoiceNo    = { $regex: invoiceNo,           $options: "i" };
    if (invoiceDate)         query.challanDate         = invoiceDate;
    if (transactionCategory) query.transactionCategory = { $regex: transactionCategory, $options: "i" };
    if (deliveryMode)        query.deliveryMode        = deliveryMode;
    if (grnType)             query.grnType             = grnType;

    if (fromDate || toDate) {
      query.grnDate = {};
      if (fromDate) query.grnDate.$gte = fromDate;
      if (toDate)   query.grnDate.$lte = toDate;
    }

    const data = await DirectGRN.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /:id — single ── */
router.get("/:id", async (req, res) => {
  try {
    const doc = await DirectGRN.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not Found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /:id — update ── */
router.put("/:id", async (req, res) => {
  try {
    const updated = await DirectGRN.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Record Not Found" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── DELETE /:id — delete ── */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await DirectGRN.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Record Not Found" });
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;