const express      = require("express");
const router       = express.Router();
const ItemName      = require("../../models/Master/ItemName");
const SalesItemType = require("../../models/Master/SalesItemType");

/**
 * parseExcelDate(val)
 * Handles three cases:
 *  1. Excel serial number  (e.g. 46113  → 2026-04-01)
 *  2. ISO / date string    (e.g. "2026-04-01" → parsed normally)
 *  3. Already a JS Date    (passed through)
 *  Returns a JS Date or null.
 * (Same helper as used in ItemRoutes.js)
 */
function parseExcelDate(val) {
  if (!val && val !== 0) return null;

  if (val instanceof Date) return isNaN(val) ? null : val;

  const num = Number(val);

  if (!isNaN(num) && num > 1000 && Number.isFinite(num)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + num * 86400000;
    const d  = new Date(ms);
    return isNaN(d) ? null : d;
  }

  const d = new Date(val);
  return isNaN(d) ? null : d;
}

/* CREATE */
router.post("/create-item-name", async (req, res) => {
  try {
    const doc = new ItemName(req.body);
    await doc.save();
    res.status(201).json({ success: true, message: "Item Saved Successfully", data: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* BULK CREATE — used by Excel/CSV upload (same logic as bulk-create-items in ItemRoutes.js) */
router.post("/bulk-create-item-names", async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "No data provided." });
    }

    // ── Step 1: Basic required-field check ──────────────────────────────
    const missingBasic = data.filter(
      (r) => !r.itemCode?.toString().trim() || !r.itemName?.toString().trim()
    );
    if (missingBasic.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingBasic.length} row(s) are missing Item Code or Item Name.`,
      });
    }

    // ── Step 2: Load Sales Item Type master for validation ───────────────
    const allTypes = await SalesItemType.find();

    // Type set: itemType name (case-insensitive)
    const typeSet = new Set(
      allTypes.map((t) => t.itemType?.trim().toLowerCase())
    );

    // ── Step 3: Validate each row against the master ─────────────────────
    const rowErrors = [];

    data.forEach((r, idx) => {
      const rowNum = idx + 2; // Excel row number (1-based header + 1)
      const itemType = r.itemType?.toString().trim() || "";

      if (itemType && !typeSet.has(itemType.toLowerCase())) {
        rowErrors.push(
          `Row ${rowNum} (${r.itemCode}): Item Type "${itemType}" does not exist in Sales Item Type master.`
        );
      }
    });

    if (rowErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed. Please fix the following errors before uploading:",
        errors: rowErrors,
      });
    }

    // ── Step 4: All rows valid — insert ──────────────────────────────────
    const docs = data.map((r) => ({
      itemType: r.itemType?.toString().trim() || "",
      itemCode: r.itemCode?.toString().trim(),
      itemName: r.itemName?.toString().trim(),
      date:     parseExcelDate(r.date),
      status:   r.status?.toString().trim() || "Active",
    }));

    const result = await ItemName.insertMany(docs, { ordered: false });

    res.status(201).json({
      success: true,
      message: `Bulk upload successful. ${result.length} item(s) inserted.`,
      count: result.length,
    });
  } catch (error) {
    if (error.insertedDocs) {
      res.status(207).json({
        success: true,
        message: `${error.insertedDocs.length} inserted, some rows failed.`,
        count: error.insertedDocs.length,
      });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
});

/* GET ALL */
router.get("/item-names", async (req, res) => {
  try {
    const data = await ItemName.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ONE by id or itemCode */
router.get("/item-name/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const doc = await ItemName.findOne({
      $or: [{ _id: identifier }, { itemCode: identifier }],
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* SEARCH */
router.get("/item-names/search", async (req, res) => {
  try {
    const { itemCode, itemName, itemType, status } = req.query;
    let query = {};
    if (itemCode) query.itemCode = { $regex: itemCode, $options: "i" };
    if (itemName) query.itemName = { $regex: itemName, $options: "i" };
    if (itemType) query.itemType = itemType;
    if (status)   query.status   = status;
    const data = await ItemName.find(query);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* UPDATE */
router.put("/item-name/:id", async (req, res) => {
  try {
    const updated = await ItemName.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (!updated) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DELETE */
router.delete("/item-name/:id", async (req, res) => {
  try {
    const deleted = await ItemName.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;