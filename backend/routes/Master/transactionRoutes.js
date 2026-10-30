const express = require("express");
const router  = express.Router();
const Transaction = require("../../models/Master/Transaction");
const { syncRowsForDoc, deleteDocFromSheet } = require("../../utils/googleSheets");

/* ── Google Sheets: "Transaction Category" tab row mapping ── */
const TXN_TAB = "Transaction Category";
const TXN_HEADERS = [
  "DB ID", "Module", "Business Entity", "Transaction Category Code",
  "Category Description", "Status",
];

function txnToRows(t) {
  const doc = t.toObject ? t.toObject() : t;
  return [[
    String(doc._id), doc.module || "", doc.businessEntity || "",
    doc.transactionCategoryCode || "", doc.categoryDescription || "", doc.status || "",
  ]];
}

/* ══════════════════════════════════════════
   CREATE
══════════════════════════════════════════ */
router.post("/create-transaction", async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();

    try {
      await syncRowsForDoc(TXN_TAB, TXN_HEADERS, transaction._id, txnToRows(transaction));
    } catch (sheetErr) {
      console.error("Sheet sync failed (Transaction create):", sheetErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Transaction Saved Successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════
   GET ALL
══════════════════════════════════════════ */
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════
   SEARCH
══════════════════════════════════════════ */
router.get("/transactions/search", async (req, res) => {
  try {
    const { module, businessEntity, status } = req.query;
    const query = {};
    if (module)         query.module         = module;
    if (businessEntity) query.businessEntity  = businessEntity;
    if (status)         query.status          = status;
    const data = await Transaction.find(query);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* ══════════════════════════════════════════
   UPDATE  ← was missing in original
══════════════════════════════════════════ */
router.put("/transaction/:id", async (req, res) => {
  try {
    const updated = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after" }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Transaction not found" });

    try {
      await syncRowsForDoc(TXN_TAB, TXN_HEADERS, updated._id, txnToRows(updated));
    } catch (sheetErr) {
      console.error("Sheet sync failed (Transaction update):", sheetErr.message);
    }

    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════
   DELETE
══════════════════════════════════════════ */
router.delete("/transaction/:id", async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Transaction not found" });

    try {
      await deleteDocFromSheet(TXN_TAB, req.params.id);
    } catch (sheetErr) {
      console.error("Sheet sync failed (Transaction delete):", sheetErr.message);
    }

    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;