const express = require("express");
const router = express.Router();
const PartyType = require("../../models/Master/PartyType");

/* CREATE */
router.post("/create-party-type", async (req, res) => {
  try {
    const pt = new PartyType(req.body);
    await pt.save();
    res.status(201).json({ success: true, message: "Party Type Saved Successfully", data: pt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ALL */
router.get("/party-types", async (req, res) => {
  try {
    const data = await PartyType.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* SEARCH */
router.get("/party-types/search", async (req, res) => {
  try {
    const { partyType, status } = req.query;
    let query = {};
    if (partyType) query.partyType = partyType;
    if (status) query.status = status;
    const data = await PartyType.find(query);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* UPDATE */
router.put("/party-type/:id", async (req, res) => {
  try {
    const updated = await PartyType.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DELETE */
router.delete("/party-type/:id", async (req, res) => {
  try {
    await PartyType.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;