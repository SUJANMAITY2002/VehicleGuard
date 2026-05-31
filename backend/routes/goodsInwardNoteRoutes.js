const express = require("express");
const router  = express.Router();
const Weighment        = require("../models/Weighment");
const GoodsInwardNote  = require("../models/GoodsInwardNote");

/* ── SAVE ── */
router.post("/goods-inward-note", async (req, res) => {
  try {
    const newGIN = new GoodsInwardNote(req.body);
    await newGIN.save();
    res.status(201).json({ success: true, message: "Goods Inward Note Saved Successfully", data: newGIN });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error Saving Goods Inward Note" });
  }
});

/* ── GET ALL WITH FILTERS (trimmed) ── */
router.get("/goods-inward-note", async (req, res) => {
  try {
    const {
      fromDate, toDate,
      ginNumber,
      status,
      vendorCode,
      poCpoNo,
      transactionCategory,
      vehicleEntry,
      vehicleNo,
      ewayDate,
    } = req.query;

    const query = {};

    /* date range on ginDate */
    if (fromDate || toDate) {
      query.ginDate = {};
      if (fromDate) query.ginDate.$gte = fromDate;
      if (toDate)   query.ginDate.$lte = toDate;
    }

    if (ginNumber)           query.ginNo               = { $regex: ginNumber,           $options: "i" };
    if (status)              query.status              = status;
    if (vendorCode)          query.vendorCode          = { $regex: vendorCode,          $options: "i" };
    if (poCpoNo)             query.poCpoNo             = { $regex: poCpoNo,             $options: "i" };
    if (transactionCategory) query.transactionCategory = { $regex: transactionCategory, $options: "i" };
    if (vehicleEntry)        query.vehicleEntry        = vehicleEntry;
    if (vehicleNo)           query.vehicleNo           = { $regex: vehicleNo,           $options: "i" };
    if (ewayDate)            query.ewayDate            = ewayDate;

    const ginData = await GoodsInwardNote.find(query).sort({ createdAt: -1 });

    /* Merge linked weighment data */
    const mergedData = await Promise.all(
      ginData.map(async (gin) => {
        const weighment = await Weighment.findOne({ inwardOutwardNoteNo: gin.ginNo });
        return {
          ...gin.toObject(),
          weighmentNo:      weighment?.weighmentNo      || "",
          transactionType:  weighment?.transactionType  || "",
          weighmentDate:    weighment?.weighmentDate     || "",
          weighmentInDate:  weighment?.weighmentInDate   || "",
          weighmentOutDate: weighment?.weighmentOutDate  || "",
          firstWeight:      weighment?.firstWeight       || "",
          secondWeight:     weighment?.secondWeight      || "",
          netWeight:        weighment?.netWeight         || "",
          transporterName:  weighment?.transporterName   || "",
        };
      })
    );

    res.status(200).json(mergedData);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error Fetching Data" });
  }
});

/* ── GET SINGLE ── */
router.get("/goods-inward-note/:id", async (req, res) => {
  try {
    const data = await GoodsInwardNote.findById(req.params.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ── DELETE ── */
router.delete("/goods-inward-note/:id", async (req, res) => {
  try {
    await GoodsInwardNote.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ── UPDATE ── */
router.put("/goods-inward-note/:id", async (req, res) => {
  try {
    const updatedData = await GoodsInwardNote.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!updatedData) return res.status(404).json({ success: false, message: "Record Not Found" });
    res.json({ success: true, message: "Updated Successfully", data: updatedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;