const express = require("express");
const router  = express.Router({ mergeParams: true });
const Weighment = require("../models/Weighment");

/* POST / — create new weighment */
router.post("/", async (req, res) => {
  try {
    const weighment = new Weighment(req.body);
    await weighment.save();
    res.status(201).json({ success: true, message: "Weighment Saved", data: weighment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET / — search / list weighments with optional filters */
router.get("/", async (req, res) => {
  try {
    const {
      fromDate, toDate, weighmentNo, vehicleNo,
      inwardOutwardNoteNo, status, partyName, site,
      partyCode, weighmentCategory, transactionType, transactionCategory,
    } = req.query;

    const query = {};

    if (weighmentNo)         query.weighmentNo         = { $regex: weighmentNo, $options: "i" };
    if (vehicleNo)           query.vehicleNo           = { $regex: vehicleNo, $options: "i" };
    if (inwardOutwardNoteNo) query.inwardOutwardNoteNo = { $regex: inwardOutwardNoteNo, $options: "i" };
    if (status)              query.status              = status;
    if (partyName)           query.partyName           = { $regex: partyName, $options: "i" };
    if (site)                query.site                = { $regex: site, $options: "i" };
    if (partyCode)           query.partyCode           = { $regex: partyCode, $options: "i" };
    if (weighmentCategory)   query.weighmentCategory   = { $regex: weighmentCategory, $options: "i" };
    if (transactionType)     query.transactionType     = transactionType;
    if (transactionCategory) query.transactionCategory = transactionCategory;

    if (fromDate || toDate) {
      query.weighmentDate = {};
      if (fromDate) query.weighmentDate.$gte = fromDate;
      if (toDate)   query.weighmentDate.$lte = toDate;
    }

    const data = await Weighment.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET /:id — get single weighment by ID */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Weighment.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* PUT /:id — update a weighment */
router.put("/:id", async (req, res) => {
  try {
    const updated = await Weighment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated)
      return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({ success: true, message: "Weighment Updated", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* DELETE /:id — delete a weighment */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Weighment.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "Record not found" });
    res.status(200).json({ success: true, message: "Weighment Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;