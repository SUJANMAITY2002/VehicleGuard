const express = require("express");
const router  = express.Router();
const Weighment       = require("../models/Weighment");
const GoodsInwardNote = require("../models/GoodsInwardNote");

/* ══════════════════════════════════════════════
   POST — Create new GIN
══════════════════════════════════════════════ */
router.post("/goods-inward-note", async (req, res) => {
  try {
    const newGIN = new GoodsInwardNote(req.body);
    await newGIN.save();
    res.status(201).json({
      success: true,
      message: "Goods Inward Note Saved Successfully",
      data: newGIN,
    });
  } catch (error) {
    console.error("GIN save error:", error);
    res.status(500).json({ success: false, message: "Error Saving Goods Inward Note: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — List / Search GINs with filters
   Also merges linked weighment data per record
══════════════════════════════════════════════ */
router.get("/goods-inward-note", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      ginNumber,
      status,
      vendorCode,
      vendorName,
      poCpoNo,
      transactionCategory,
      ginDescription,
      ginType,
      vehicleEntry,
      vehicleNo,
      challanInvoiceNo,
      challanDate,
      ewayDate,
      site,
    } = req.query;

    const query = {};

    /* Date range on ginDate */
    if (fromDate || toDate) {
      query.ginDate = {};
      if (fromDate) query.ginDate.$gte = fromDate;
      if (toDate)   query.ginDate.$lte = toDate;
    }

    if (ginNumber)           query.ginNo               = { $regex: ginNumber,           $options: "i" };
    if (status)              query.status              = status;
    if (vendorCode)          query.vendorCode          = { $regex: vendorCode,          $options: "i" };
    if (vendorName)          query.vendorName          = { $regex: vendorName,          $options: "i" };
    if (poCpoNo)             query.poCpoNo             = { $regex: poCpoNo,             $options: "i" };
    if (transactionCategory) query.transactionCategory = { $regex: transactionCategory, $options: "i" };
    if (ginDescription)      query.ginDescription      = { $regex: ginDescription,      $options: "i" };
    if (ginType)             query.ginType             = ginType;
    if (vehicleEntry)        query.vehicleEntry        = vehicleEntry;
    if (vehicleNo)           query.vehicleNo           = { $regex: vehicleNo,           $options: "i" };
    if (challanInvoiceNo)    query.challanInvoiceNo    = { $regex: challanInvoiceNo,    $options: "i" };
    if (challanDate)         query.challanDate         = challanDate;
    if (ewayDate)            query.ewayDate            = ewayDate;
    if (site)                query.site                = { $regex: site,                $options: "i" };

    const ginData = await GoodsInwardNote.find(query).sort({ createdAt: -1 });

    /* Merge linked weighment data so the list page shows weight fields */
    const mergedData = await Promise.all(
      ginData.map(async (gin) => {
        const weighment = await Weighment.findOne({ inwardOutwardNoteNo: gin.ginNo });
        return {
          ...gin.toObject(),
          /* Weighment fields — empty string when not linked yet */
          weighmentNo:         weighment?.weighmentNo      || "",
          weighmentId:         weighment?._id?.toString()  || "",
          transactionType:     weighment?.transactionType  || "",
          weighmentDate:       weighment?.weighmentDate    || "",
          weighmentInDate:     weighment?.weighmentInDate  || "",
          weighmentOutDate:    weighment?.weighmentOutDate || "",
          firstWeight:         weighment?.firstWeight      || "",
          secondWeight:        weighment?.secondWeight     || "",
          netWeight:           weighment?.netWeight        || "",
          transporterName:     weighment?.transporterName  || "",
        };
      })
    );

    res.status(200).json(mergedData);
  } catch (error) {
    console.error("GIN fetch error:", error);
    res.status(500).json({ success: false, message: "Error Fetching Data: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Single GIN by ID
══════════════════════════════════════════════ */
router.get("/goods-inward-note/:id", async (req, res) => {
  try {
    const data = await GoodsInwardNote.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   DELETE — Remove GIN by ID
══════════════════════════════════════════════ */
router.delete("/goods-inward-note/:id", async (req, res) => {
  try {
    await GoodsInwardNote.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   PUT — Update GIN by ID
══════════════════════════════════════════════ */
router.put("/goods-inward-note/:id", async (req, res) => {
  try {
    const updatedData = await GoodsInwardNote.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedData)
      return res.status(404).json({ success: false, message: "Record Not Found" });
    res.json({ success: true, message: "Updated Successfully", data: updatedData });
  } catch (error) {
    console.error("GIN update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;