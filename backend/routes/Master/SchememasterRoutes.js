const express = require("express");
const router = express.Router();
const SchemeMaster = require("../../models/Master/SchemeMaster");

const buildSchemeDocument = (body) => ({
  schemeName: body.schemeName?.toString().trim() || "",
  description: body.description?.toString().trim() || "",
  item: body.item?.toString().trim() || "",
  logicAmount: Number(body.logicAmount || 0),
  startDate: body.startDate || "",
  endDate: body.endDate || "",
  status: body.status || "Active",
});

const applyActiveDateFilter = (query, activeDate) => {
  if (!activeDate) return query;

  return {
    ...query,
    startDate: { $lte: activeDate },
    $or: [
      { endDate: "" },
      { endDate: { $gte: activeDate } },
      { endDate: { $exists: false } },
    ],
  };
};

router.post("/create-scheme", async (req, res) => {
  try {
    const payload = buildSchemeDocument(req.body);

    if (!payload.schemeName || !payload.item || !payload.startDate) {
      return res.status(400).json({
        success: false,
        message: "Scheme, Item and Start Date are required.",
      });
    }

    const doc = new SchemeMaster(payload);
    await doc.save();
    res.status(201).json({ success: true, message: "Scheme Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/schemes", async (req, res) => {
  try {
    const { schemeName, item, activeDate, status } = req.query;
    let query = {};

    if (schemeName) query.schemeName = { $regex: schemeName, $options: "i" };
    if (item) query.item = { $regex: item, $options: "i" };
    if (status) query.status = status;
    query = applyActiveDateFilter(query, activeDate);

    const data = await SchemeMaster.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/scheme/:id", async (req, res) => {
  try {
    const payload = buildSchemeDocument(req.body);

    if (!payload.schemeName || !payload.item || !payload.startDate) {
      return res.status(400).json({
        success: false,
        message: "Scheme, Item and Start Date are required.",
      });
    }

    const updated = await SchemeMaster.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/scheme/:id", async (req, res) => {
  try {
    await SchemeMaster.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/scheme-price", async (req, res) => {
  try {
    const { schemeName, item, cost, activeDate } = req.query;

    if (!schemeName || !item || cost === undefined) {
      return res.status(400).json({
        success: false,
        message: "schemeName, item and cost are required.",
      });
    }

    let query = {
      schemeName: { $regex: `^${schemeName}$`, $options: "i" },
      item: { $regex: `^${item}$`, $options: "i" },
      status: "Active",
    };
    query = applyActiveDateFilter(query, activeDate || new Date().toISOString().split("T")[0]);

    const scheme = await SchemeMaster.findOne(query).sort({ createdAt: -1 });
    if (!scheme) {
      return res.status(404).json({ success: false, message: "Active scheme plan not found." });
    }

    const inputCost = Number(cost);
    const finalPrice = inputCost + Number(scheme.logicAmount || 0);

    res.json({
      success: true,
      data: {
        schemeName: scheme.schemeName,
        description: scheme.description,
        item: scheme.item,
        cost: inputCost,
        logicAmount: scheme.logicAmount,
        finalPrice,
        startDate: scheme.startDate,
        endDate: scheme.endDate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
