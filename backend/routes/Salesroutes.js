const express  = require("express");
const router   = express.Router();

const { google } = require("googleapis");
const SalesContract = require("../models/SalesContract");

// ─── Google Sheets Setup ───────────────────────────────────────────────────────
// Place your downloaded service-account JSON at:  config/google-service-account.json
// Set GOOGLE_SHEET_ID in your .env  (the long ID in the Sheets URL)
const SHEET_ID   = process.env.GOOGLE_SHEET_ID;   // e.g. "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
const SHEET_TAB  = "SalesContracts";               // tab name inside the spreadsheet

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "config/google-service-account.json", // path relative to project root
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: "v4", auth: authClient });
}

// Ensure the header row exists (runs lazily on first write)
async function ensureHeader(sheets) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1:P1`,
    });
    const rows = res.data.values || [];
    if (!rows.length || rows[0][0] !== "Contract No.") {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_TAB}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            "Contract No.", "Date", "Customer",
            "Sales Person", "Item Type", "Scheme",
            "Qty", "Type", "Rate (₹)", "Amount (₹)",
            "Pay Terms", "Due Days", "Due Date",
            "Remarks", "Created At", "DB ID",
          ]],
        },
      });
    }
  } catch (e) {
    console.error("Sheets header check failed:", e.message);
  }
}

// Convert a saved contract document → row array
function toRow(c) {
  const amt = (Number(c.qty) || 0) * (Number(c.rate) || 0);
  return [
    c.contract_no,
    c.contract_date ? new Date(c.contract_date).toLocaleDateString("en-IN") : "",
    c.customer,
    c.sales_person  || "",
    c.item_type     || "",
    c.scheme        || "",
    c.qty,
    c.type,
    c.rate,
    amt,
    c.pay_terms,
    c.due_days  ?? "",
    c.due_date  ? new Date(c.due_date).toLocaleDateString("en-IN") : "",
    c.remarks   || "",
    c.createdAt ? new Date(c.createdAt).toLocaleString("en-IN") : "",
    String(c._id),
  ];
}

// Append a new row to the sheet
async function appendToSheet(contract) {
  try {
    const sheets = await getSheetsClient();
    await ensureHeader(sheets);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [toRow(contract)] },
    });
  } catch (e) {
    console.error("Google Sheets append failed:", e.message);
    // Non-fatal — do NOT throw; DB save already succeeded
  }
}

// Update the matching row in the sheet (find by DB ID in column P)
async function updateSheetRow(contract) {
  try {
    const sheets = await getSheetsClient();
    await ensureHeader(sheets);

    // Find which row has this _id
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!P:P`,
    });
    const idCol = (res.data.values || []);
    const rowIdx = idCol.findIndex(
      (r) => r[0] === String(contract._id)
    );

    if (rowIdx < 1) {
      // Row not found — just append
      return appendToSheet(contract);
    }

    const sheetRow = rowIdx + 1; // 1-indexed
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!A${sheetRow}:P${sheetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [toRow(contract)] },
    });
  } catch (e) {
    console.error("Google Sheets update failed:", e.message);
  }
}

// Delete the matching row in the sheet
async function deleteSheetRow(id) {
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB}!P:P`,
    });
    const idCol = (res.data.values || []);
    const rowIdx = idCol.findIndex((r) => r[0] === String(id));
    if (rowIdx < 1) return;

    // Get spreadsheet to find sheetId for batchUpdate
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const sheetMeta = meta.data.sheets.find(
      (s) => s.properties.title === SHEET_TAB
    );
    if (!sheetMeta) return;

    const sheetTabId = sheetMeta.properties.sheetId;
    const zeroIdx    = rowIdx; // deleteDimension is 0-indexed start (rowIdx already 0-based from findIndex)

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId:   sheetTabId,
              dimension: "ROWS",
              startIndex: zeroIdx,
              endIndex:   zeroIdx + 1,
            },
          },
        }],
      },
    });
  } catch (e) {
    console.error("Google Sheets delete failed:", e.message);
  }
}

// ─── Helper: Generate next contract number ────────────────────────────────────
async function generateContractNo() {
  const now    = new Date();
  const yyyy   = now.getFullYear();
  const mm     = String(now.getMonth() + 1).padStart(2, "0");
  const dd     = String(now.getDate()).padStart(2, "0");
  const prefix = `${yyyy}${mm}${dd}`;

  const last = await SalesContract.findOne(
    { contract_no: { $regex: `^${prefix}` } },
    { contract_no: 1 },
    { sort: { contract_no: -1 } }
  );

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.contract_no.slice(8), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(2, "0")}`;
}

// ─── Shared field extractor ───────────────────────────────────────────────────
function extractFields(body) {
  const {
    contract_date, customer,
    sales_person, item_type, scheme,
    qty, type, pay_terms, due_days, due_date, rate, remarks,
  } = body;

  return {
    contract_date: new Date(contract_date),
    customer,
    sales_person:  sales_person  || "",
    item_type:     item_type     || "",
    scheme:        scheme        || "",
    qty:           Number(qty),
    type,
    pay_terms,
    due_days:      due_days != null && due_days !== "" ? Number(due_days) : null,
    due_date:      due_date ? new Date(due_date) : null,
    rate:          Number(rate),
    remarks:       remarks || "",
  };
}

// ─── Normalize for API response ───────────────────────────────────────────────
function normalize(c) {
  return {
    id:            c._id,
    contract_no:   c.contract_no,
    contract_date: c.contract_date,
    customer:      c.customer,
    sales_person:  c.sales_person,
    item_type:     c.item_type,
    scheme:        c.scheme,
    qty:           c.qty,
    type:          c.type,
    pay_terms:     c.pay_terms,
    due_days:      c.due_days,
    due_date:      c.due_date,
    rate:          c.rate,
    remarks:       c.remarks,
    createdAt:     c.createdAt,
  };
}

// ─── GET /api/sales/next-contract-no ─────────────────────────────────────────
router.get("/next-contract-no", async (req, res) => {
  try {
    const contract_no = await generateContractNo();
    res.json({ contract_no });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/sales  (search / list with filters) ────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      fromDate, toDate, contractNo, customer,
      paymentTerms, type, salesPerson, itemType, scheme,
    } = req.query;
    const query = {};

    if (fromDate || toDate) {
      query.contract_date = {};
      if (fromDate) query.contract_date.$gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query.contract_date.$lte = end;
      }
    }
    if (contractNo)  query.contract_no   = { $regex: contractNo,  $options: "i" };
    if (customer)    query.customer       = { $regex: customer,    $options: "i" };
    if (paymentTerms) query.pay_terms     = paymentTerms;
    if (type)        query.type           = type;
    if (salesPerson) query.sales_person   = { $regex: salesPerson, $options: "i" };
    if (itemType)    query.item_type      = { $regex: itemType,    $options: "i" };
    if (scheme)      query.scheme         = scheme;

    const contracts = await SalesContract.find(query).sort({ contract_date: -1 });
    res.json(contracts.map(normalize));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/sales/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const contract = await SalesContract.findById(req.params.id);
    if (!contract) return res.status(404).json({ message: "Contract not found" });
    res.json(normalize(contract));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/sales ──────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const contract_no = await generateContractNo();
    const contract = new SalesContract({ contract_no, ...extractFields(req.body) });
    const saved = await contract.save();

    // ── Auto-save to Google Sheets ──
    await appendToSheet(saved);

    res.status(201).json({
      id:          saved._id,
      contract_no: saved.contract_no,
      message:     "Contract saved successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate contract number. Please retry." });
    }
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/sales/:id ───────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const updated = await SalesContract.findByIdAndUpdate(
      req.params.id,
      extractFields(req.body),
      { returnDocument: "after", runValidators: true }   // ← replace "new: true"
    );
    if (!updated) return res.status(404).json({ message: "Contract not found" });

    // ── Sync to Google Sheets ──
    await updateSheetRow(updated);

    res.json({
      id:          updated._id,
      contract_no: updated.contract_no,
      message:     "Contract updated successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/sales/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await SalesContract.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Contract not found" });

    // ── Remove from Google Sheets ──
    await deleteSheetRow(req.params.id);

    res.json({ message: "Contract deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;