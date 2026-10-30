const express = require("express");
const router  = express.Router();

const CCMProduction = require("../../models/Production/CCMProduction");

/* ── Auto CCM No. generator ──────────────────────────────────────
   Frontend currently generates a random CCM No. client-side
   (genCCMNo() in CreateCCMProduction.jsx). This endpoint is the
   server-side equivalent so numbering can move server-side later
   without a frontend contract change — same CCM/{yy-yy}/{seq} shape. */
router.get("/ccm-production/next-number", async (req, res) => {
  try {
    const year   = new Date().getFullYear();
    const prefix = `CCM/${String(year).slice(-2)}-${String(year + 1).slice(-2)}/`;
    const last   = await CCMProduction.findOne({ ccmNo: { $regex: `^${prefix}` } })
      .sort({ createdAt: -1 })
      .lean();
    const lastSeq = last ? parseInt((last.ccmNo || "").split("/").pop(), 10) || 0 : 0;
    const nextSeq = String(lastSeq + 1).padStart(6, "0");
    res.json({ success: true, ccmNo: `${prefix}${nextSeq}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/ccm-production ── search/list ── */
router.get("/ccm-production", async (req, res) => {
  try {
    const { fromDate, toDate, ccmNo, heatNo, shift, status } = req.query;
    const q = {};

    if (fromDate || toDate) {
      q.ccmDate = {};
      if (fromDate) q.ccmDate.$gte = fromDate;
      if (toDate)   q.ccmDate.$lte = toDate;
    }
    if (ccmNo)  q.ccmNo  = { $regex: ccmNo,  $options: "i" };
    if (heatNo) q.heatNo = { $regex: heatNo, $options: "i" };
    if (shift)  q.shift  = shift;
    if (status) q.status = status;

    const records = await CCMProduction.find(q).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/ccm-production/:id ── */
router.get("/ccm-production/:id", async (req, res) => {
  try {
    const record = await CCMProduction.findById(req.params.id).lean();
    if (!record) return res.status(404).json({ success: false, message: "CCM record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/ccm-production ── create ──
   Recomputes totals server-side from inputs/outputs/bypass rather
   than trusting whatever the client sent, so a stale/edited payload
   can't desync the stored totals from the actual rows. */
function computeTotals(body) {
  const inputs  = Array.isArray(body.inputs)  ? body.inputs  : [];
  const outputs = Array.isArray(body.outputs) ? body.outputs : [];
  const bypass  = Array.isArray(body.bypass)  ? body.bypass  : [];

  const inputQty       = inputs.reduce((s, r) => s + (parseFloat(r.heatQty) || 0), 0);
  const totalBilletQty = outputs.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
  const totalBypassQty = bypass.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);

  const scrapQty     = parseFloat(body.scrapQty) || 0;
  const rejectionQty = parseFloat(body.rejectionQty) || 0;
  const totalLossQty = scrapQty + rejectionQty;

  const producedTotal = totalBilletQty + totalBypassQty;
  const yieldPct = inputQty > 0 ? parseFloat(((producedTotal / inputQty) * 100).toFixed(2)) : 0;

  return { inputQty, totalBilletQty, totalBypassQty, scrapQty, rejectionQty, totalLossQty, yieldPct };
}

router.post("/ccm-production", async (req, res) => {
  try {
    const body = req.body;
    if (!body.ccmNo)  return res.status(400).json({ success: false, message: "CCM No. is required." });
    if (!body.heatNo) return res.status(400).json({ success: false, message: "Heat No. is required." });

    const totals = computeTotals(body);

    const record = await CCMProduction.create({
      ccmNo:     body.ccmNo,
      ccmDate:   body.ccmDate,
      shift:     body.shift,
      heatNo:    body.heatNo,
      furnaceNo: body.furnaceNo,
      operator:  body.operator,
      status:    body.status || "Open",
      remarks:   body.remarks,

      inputs:  (body.inputs  || []).filter((r) => r.heatQty),
      outputs: (body.outputs || []).filter((r) => r.qty),
      bypass:  (body.bypass  || []).filter((r) => r.qty),

      ...totals,
      bypassStatus: totals.totalBypassQty > 0 ? "Pending" : undefined,
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: `CCM No. "${req.body.ccmNo}" already exists.` });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/ccm-production/:id ── edit ── */
router.put("/ccm-production/:id", async (req, res) => {
  try {
    const record = await CCMProduction.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "CCM record not found" });

    const body = req.body;
    const totals = computeTotals({
      inputs:      body.inputs  !== undefined ? body.inputs  : record.inputs,
      outputs:     body.outputs !== undefined ? body.outputs : record.outputs,
      bypass:      body.bypass  !== undefined ? body.bypass  : record.bypass,
      scrapQty:     body.scrapQty     !== undefined ? body.scrapQty     : record.scrapQty,
      rejectionQty: body.rejectionQty !== undefined ? body.rejectionQty : record.rejectionQty,
    });

    const editable = [
      "ccmDate", "shift", "heatNo", "furnaceNo", "operator", "status", "remarks",
    ];
    editable.forEach((field) => {
      if (body[field] !== undefined) record[field] = body[field];
    });

    if (body.inputs  !== undefined) record.inputs  = body.inputs.filter((r) => r.heatQty);
    if (body.outputs !== undefined) record.outputs = body.outputs.filter((r) => r.qty);
    if (body.bypass  !== undefined) record.bypass  = body.bypass.filter((r) => r.qty);

    Object.assign(record, totals);
    if (totals.totalBypassQty > 0 && !record.bypassStatus) record.bypassStatus = "Pending";

    await record.save();
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── DELETE /api/ccm-production/:id ── */
router.delete("/ccm-production/:id", async (req, res) => {
  try {
    const record = await CCMProduction.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "CCM record not found" });
    if (record.status === "Closed") {
      return res.status(400).json({ success: false, message: "Closed CCM records cannot be deleted." });
    }
    await CCMProduction.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "CCM record deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;