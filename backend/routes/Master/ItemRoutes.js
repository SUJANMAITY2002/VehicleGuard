const express       = require("express");
const router        = express.Router();
const Item          = require("../../models/Master/Item");
const ItemCategory  = require("../../models/Master/ItemCategory");
const ItemGroup     = require("../../models/Master/ItemGroup");
const ItemClass     = require("../../models/Master/ItemClass");
const { syncRowsForDoc, deleteDocFromSheet } = require("../../utils/googleSheets");

/* ── Google Sheets: "Item Master" tab row mapping ── */
const ITEM_TAB = "Item Master";
const ITEM_HEADERS = [
  "DB ID", "Item Code", "Item Name", "Item Type", "Category", "Item Group",
  "UOM", "HSN", "GST %", "Item Class", "Grade", "Size", "Rate Diff",
  "Item Tax Class", "Reference Item", "Status",
];

function itemToRows(item) {
  const it = item.toObject ? item.toObject() : item;
  return [[
    String(it._id), it.itemCode || "", it.itemName || "", it.itemTypes || "",
    it.category || "", it.itemGroup || "", it.uom || "", it.hsn || "",
    it.gstPercent ?? "", it.itemClass || "", it.grade || "", it.size || "",
    it.rateDiff ?? 0, it.itemTaxClass || "", it.referenceItem || "", it.status || "",
  ]];
}

/**
 * parseExcelDate(val)
 * Handles three cases:
 *  1. Excel serial number  (e.g. 46113  → 2026-04-01)
 *  2. ISO / date string    (e.g. "2026-04-01" → parsed normally)
 *  3. Already a JS Date    (passed through)
 *  Returns a JS Date or null.
 */
function parseExcelDate(val) {
  if (!val && val !== 0) return null;

  // Already a Date object
  if (val instanceof Date) return isNaN(val) ? null : val;

  const num = Number(val);

  // Excel serial number: positive integer, no time fraction ambiguity
  // Excel epoch = Dec 30, 1899 (accounts for Lotus 1-2-3 leap-year bug)
  if (!isNaN(num) && num > 1000 && Number.isFinite(num)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
    const ms = excelEpoch.getTime() + num * 86400000;    // days → ms
    const d  = new Date(ms);
    return isNaN(d) ? null : d;
  }

  // String date ("2026-04-01", "01/04/2026", etc.)
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

/* CREATE */
router.post("/create-item", async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();

    try {
      await syncRowsForDoc(ITEM_TAB, ITEM_HEADERS, item._id, itemToRows(item));
    } catch (sheetErr) {
      console.error("Sheet sync failed (Item create):", sheetErr.message);
    }

    res.status(201).json({ success: true, message: "Item Saved Successfully", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* BULK CREATE — used by Excel/CSV upload */
router.post("/bulk-create-items", async (req, res) => {
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

    // ── Step 2: Load all master data for validation ──────────────────────

    const [allCategories, allGroups, allClasses] = await Promise.all([
      ItemCategory.find({ status: "Active" }),
      ItemGroup.find({ status: "Active" }),
      ItemClass.find({ status: "Active" }),
    ]);

    // Build lookup sets for fast case-insensitive matching
    // Category set: "itemTypes||categoryName"
    const categorySet = new Set(
      allCategories.map((c) => `${c.itemTypes?.trim().toLowerCase()}||${c.categoryName?.trim().toLowerCase()}`)
    );

    // Group set: "categoryName||itemGroup"  (ItemGroup.itemTypes stores the category name)
    const groupSet = new Set(
      allGroups.map((g) => `${g.itemTypes?.trim().toLowerCase()}||${g.itemGroup?.trim().toLowerCase()}`)
    );

    // Class set: className
    const classSet = new Set(
      allClasses.map((c) => c.className?.trim().toLowerCase())
    );

    // ── Step 3: Validate each row against masters ────────────────────────
    const rowErrors = [];

    data.forEach((r, idx) => {
      const rowNum   = idx + 2; // Excel row number (1-based header + 1)
      const itemType = r.itemTypes?.toString().trim() || "";
      const category = r.category?.toString().trim()  || "";
      const group    = r.itemGroup?.toString().trim()  || "";
      const cls      = r.itemClass?.toString().trim()  || "";

      // Validate Category — only when both itemTypes and category are provided
      if (itemType && category) {
        const key = `${itemType.toLowerCase()}||${category.toLowerCase()}`;
        if (!categorySet.has(key)) {
          rowErrors.push(
            `Row ${rowNum} (${r.itemCode}): Category "${category}" does not exist under Item Type "${itemType}".`
          );
        }
      }

      // Validate Item Group — only when category and group are provided
      // ItemGroup.itemTypes holds the category name (see CreateItemGroup / ItemGroup.js)
      if (category && group) {
        const key = `${category.toLowerCase()}||${group.toLowerCase()}`;
        if (!groupSet.has(key)) {
          rowErrors.push(
            `Row ${rowNum} (${r.itemCode}): Item Group "${group}" does not exist under Category "${category}".`
          );
        }
      }

      // Validate Item Class — only when provided
      if (cls && !classSet.has(cls.toLowerCase())) {
        rowErrors.push(
          `Row ${rowNum} (${r.itemCode}): Item Class "${cls}" does not exist in Item Class master.`
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

    // ── Step 4: All rows valid — insert ─────────────────────────────────
    const docs = data.map((r) => ({
      itemCode:      r.itemCode?.toString().trim(),
      itemName:      r.itemName?.toString().trim(),
      itemTypes:     r.itemTypes?.toString().trim()     || "",
      category:      r.category?.toString().trim()      || "",
      itemGroup:     r.itemGroup?.toString().trim()     || "",
      uom:           r.uom?.toString().trim()           || "",
      hsn:           r.hsn?.toString().trim()           || "",
      gstPercent:    r.gstPercent ? Number(r.gstPercent) : undefined,
      itemClass:     r.itemClass?.toString().trim()     || "",
      grade:         r.grade?.toString().trim()         || "",
      size:          r.size?.toString().trim()          || "",
      rateDiff:      r.rateDiff ? Number(r.rateDiff) : 0,
      date:          parseExcelDate(r.date),
      itemTaxClass:  r.itemTaxClass?.toString().trim()  || "",
      referenceItem: r.referenceItem?.toString().trim() || "",
      status:        r.status?.toString().trim()        || "Active",
    }));

    const result = await Item.insertMany(docs, { ordered: false });

    try {
      for (const doc of result) {
        await syncRowsForDoc(ITEM_TAB, ITEM_HEADERS, doc._id, itemToRows(doc));
      }
    } catch (sheetErr) {
      console.error("Sheet sync failed (Item bulk create):", sheetErr.message);
    }

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
router.get("/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* GET ONE by id or itemCode */
router.get("/item/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    const item = await Item.findOne({
      $or: [{ _id: identifier }, { itemCode: identifier }],
    });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* SEARCH */
router.get("/items/search", async (req, res) => {
  try {
    const { itemCode, itemName, itemTypes, category, itemClass, status } = req.query;
    let query = {};
    if (itemCode)  query.itemCode  = { $regex: itemCode,  $options: "i" };
    if (itemName)  query.itemName  = { $regex: itemName,  $options: "i" };
    if (itemTypes) query.itemTypes = itemTypes;
    if (category)  query.category  = { $regex: category,  $options: "i" };
    if (itemClass) query.itemClass = itemClass;
    if (status)    query.status    = status;
    const data = await Item.find(query);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* UPDATE */
router.put("/item/:id", async (req, res) => {
  try {
    const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (!updated) return res.status(404).json({ success: false, message: "Item not found" });

    try {
      await syncRowsForDoc(ITEM_TAB, ITEM_HEADERS, updated._id, itemToRows(updated));
    } catch (sheetErr) {
      console.error("Sheet sync failed (Item update):", sheetErr.message);
    }

    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* DELETE */
router.delete("/item/:id", async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item not found" });

    try {
      await deleteDocFromSheet(ITEM_TAB, req.params.id);
    } catch (sheetErr) {
      console.error("Sheet sync failed (Item delete):", sheetErr.message);
    }

    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;