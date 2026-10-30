const express = require("express");
const router = express.Router();

const UOM = require("../../models/Master/Uom");

/* CREATE */
router.post("/create-uom", async (req, res) => {
  try {
    const uom = new UOM(req.body);

    await uom.save();

    res.status(201).json({
      success: true,
      message: "UOM Saved Successfully",
      data: uom,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/* GET ALL */
router.get("/uoms", async (req, res) => {
  try {
    const data = await UOM.find()
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/* UPDATE */
router.put("/uom/:id", async (req, res) => {
  try {
    const updated =
      await UOM.findByIdAndUpdate(
        req.params.id,
        req.body,
        { returnDocument: "after" }
      );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/* DELETE */
router.delete("/uom/:id", async (req, res) => {
  try {
    await UOM.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message: "Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;