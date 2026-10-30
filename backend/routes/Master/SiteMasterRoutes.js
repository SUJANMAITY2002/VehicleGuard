const express = require("express");
const router = express.Router();
const SiteMaster = require("../../models/Master/SiteMaster");

const buildSiteDocument = (body) => ({
  siteCode: body.siteCode?.toString().trim() || "",
  siteName: body.siteName?.toString().trim() || "",
  address: body.address?.toString().trim() || "",
  city: body.city?.toString().trim() || "",
  state: body.state?.toString().trim() || "",
  pinCode: body.pinCode?.toString().trim() || "",
  contactPerson: body.contactPerson?.toString().trim() || "",
  mobile: body.mobile?.toString().trim() || "",
  gstNo: body.gstNo?.toString().trim() || "",
  status: body.status?.toString().trim() || "Active",
});

/* CREATE */
router.post("/create-site", async (req, res) => {
  try {
    const payload = buildSiteDocument(req.body);

    if (!payload.siteCode || !payload.siteName) {
      return res.status(400).json({
        success: false,
        message: "Site Code and Site Name are required.",
      });
    }

    const doc = new SiteMaster(payload);
    await doc.save();
    res.status(201).json({
      success: true,
      message: "Site Saved Successfully",
      data: doc,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Site Code already exists. Use a unique code.",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ALL / SEARCH */
router.get("/sites", async (req, res) => {
  try {
    const { siteCode, siteName, status } = req.query;
    const query = {};

    if (siteCode) query.siteCode = { $regex: siteCode, $options: "i" };
    if (siteName) query.siteName = { $regex: siteName, $options: "i" };
    if (status) query.status = status;

    const data = await SiteMaster.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* FILTER - kept for existing screens that may already call this endpoint */
router.get("/sites/filter", async (req, res) => {
  try {
    const { siteCode, siteName, status } = req.query;
    const query = {};

    if (siteCode) query.siteCode = { $regex: siteCode, $options: "i" };
    if (siteName) query.siteName = { $regex: siteName, $options: "i" };
    query.status = status || "Active";

    const data = await SiteMaster.find(query).sort({ siteCode: 1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* UPDATE */
router.put("/site/:id", async (req, res) => {
  try {
    const payload = buildSiteDocument(req.body);

    if (!payload.siteCode || !payload.siteName) {
      return res.status(400).json({
        success: false,
        message: "Site Code and Site Name are required.",
      });
    }

    const updated = await SiteMaster.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DELETE */
router.delete("/site/:id", async (req, res) => {
  try {
    await SiteMaster.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
