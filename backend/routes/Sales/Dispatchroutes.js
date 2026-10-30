const express = require("express");
const router  = express.Router();
const Dispatch          = require("../../models/Sales/Dispatch");
const Sauda              = require("../../models/Sales/Sauda");
const Demand              = require("../../models/Sales/Demand");
const DocumentSequence  = require("../../models/Master/DocumentSequence");

/* ── 2-digit year date builder — mirrors Sauda / Demand / Document Sequence routes ── */
const buildDatePart = (format) => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yy = String(today.getFullYear()).slice(-2);

  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    const year   = today.getFullYear();
    const start  = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy    = String(Math.floor((today - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`;
};

const ALLOWED_STATUS = ["Ready", "Loaded", "Vehicle Out"];

/* ══════════════════════════════════════════════
   GET — Confirmed Saudas available to pick from
   (Sauda No. typeahead on Create Dispatch)
══════════════════════════════════════════════ */
router.get("/dispatch/source-saudas", async (req, res) => {
  try {
    const saudas = await Sauda.find({ status: "Confirmed" }).sort({ createdAt: -1 });
    res.json(saudas);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Ready-to-dispatch Demand items for a given Sauda
   Flattens every "Ready" Demand raised against that Sauda
   into individual item rows (used by the Item section on
   Create Dispatch — this is what auto-populates on Sauda pick)
══════════════════════════════════════════════ */
router.get("/dispatch/source-demand-items", async (req, res) => {
  try {
    const { saudaNo } = req.query;
    if (!saudaNo) {
      return res.status(400).json({ success: false, message: "saudaNo is required" });
    }

    /* Match saudaNo case/whitespace-insensitively — guards against a
       Demand's saudaNo being stored with different casing than the
       Sauda it came from. */
    const saudaNoTrim = saudaNo.toString().trim();

    /* Pull any Demand for this Sauda that hasn't been Dispatched yet.
       This used to only match status "Ready", but nothing in this
       codebase (that I've been shown — CCM/Rolling/Bundling routes,
       productionRequestGenerator.js) actually flips a Demand from
       "Production Requested" to "Ready", so that filter always
       returned zero rows. Broadened to include "Production Requested"
       too so newly-raised demands are dispatchable right away.
       Once you wire up a real production-completion trigger, you can
       tighten this back down to just "Ready" if you want Dispatch to
       truly wait for production to finish. */
    const demands = await Demand.find({
      saudaNo: { $regex: `^${saudaNoTrim}$`, $options: "i" },
      status: { $in: ["Production Requested", "Ready"] },
    }).sort({ createdAt: -1 });

    const rows = [];
    demands.forEach((d) => {
      (d.items || []).forEach((it) => {
        rows.push({
          demandId:     d._id,
          demandNo:     d.demandNo,
          demandStatus: d.status,
          itemCode:     it.itemCode || "",
          itemName:     it.itemName || "",
          size:         it.size || "",
          qty:          it.qty || 0,
          remarks:      "",
        });
      });
    });

    res.json(rows);
  } catch (error) {
    console.error("dispatch source-demand-items error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Generate next Dispatch number (preview only)
   Looks up a Document Sequence record for
   module="Sales", businessEntity="Final Dispatch List"
══════════════════════════════════════════════ */
router.get("/dispatch/next-sequence", async (req, res) => {
  try {
    const { entityPrefix } = req.query;
    const prefix = (entityPrefix || "FD").toString().trim().toUpperCase();

    const lastRecord = await DocumentSequence
      .findOne({ module: "Sales", businessEntity: "Final Dispatch List", entityPrefix: prefix })
      .sort({ createdAt: -1 });

    if (!lastRecord) {
      const count = await Dispatch.countDocuments();
      const datePart = buildDatePart("dd/mm/yy");
      return res.json({
        success: true,
        nextCode: `${prefix}${datePart}${String(count + 1).padStart(2, "0")}`,
        fallback: true,
      });
    }

    const digits   = Math.max(1, Number(lastRecord.sequenceDigits) || 2);
    const step     = Math.max(1, Number(lastRecord.incrementStep) || 1);
    const nextNo   = Number(lastRecord.incrementNo) + step;
    const paddedNo = String(nextNo).padStart(digits, "0");
    const datePart = lastRecord.useDateFragment ? buildDatePart(lastRecord.sequenceFormat) : "";
    const nextCode = `${prefix}${datePart}${paddedNo}`;

    res.json({ success: true, nextCode, nextIncrement: nextNo, sequenceId: lastRecord._id });
  } catch (error) {
    console.error("dispatch next-sequence error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   POST — Create a Dispatch.
   Used for BOTH the per-row "Dispatch" action (a single
   item in the `items` array) and "Dispatch All" (every
   currently-listed row) — the frontend just sends whichever
   set of rows it means to send.

   Consumes the next number from the Document Sequence master
   the same atomic way Sauda/Demand do, then marks every source
   Demand referenced by these items as "Dispatched".
══════════════════════════════════════════════ */
router.post("/dispatch", async (req, res) => {
  try {
    const prefix = (req.body.entityPrefix || "FD").toString().trim().toUpperCase();
    const { saudaId, saudaNo, partyCode, partyName, partyAddress, dispatchDate, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "At least one item is required." });
    }
    const invalidQty = items.some((it) => !it.qty || Number(it.qty) <= 0);
    if (invalidQty) {
      return res.status(400).json({ success: false, message: "Every item needs a Qty greater than 0." });
    }

    /* ── Dispatch No. resolution ──
       Mirrors Sauda: the Create Dispatch page now generates the number
       itself, up front, via Transaction Category → /api/create-document-sequence
       (same pattern Create Sauda / Create Inward-Outward use) — that call
       already atomically advances the sequence, so if the frontend sends
       a dispatchNo we trust it as-is and must NOT increment again here
       (that would burn two numbers per save).
       The legacy auto-generate block below only runs as a fallback for
       callers that don't send a dispatchNo at all (e.g. direct API use). */
    let dispatchNo = req.body.dispatchNo;
    let transactionCategory = req.body.transactionCategory || "";

    if (!dispatchNo) {
      const seqRecord = await DocumentSequence
        .findOne({ module: "Sales", businessEntity: "Final Dispatch List", entityPrefix: prefix })
        .sort({ createdAt: -1 });

      if (seqRecord) {
        const digits = Math.max(1, Number(seqRecord.sequenceDigits) || 2);
        const step   = Math.max(1, Number(seqRecord.incrementStep) || 1);

        const advanced = await DocumentSequence.findByIdAndUpdate(
          seqRecord._id,
          { $inc: { incrementNo: step } },
          { new: true }
        );

        const paddedNo = String(advanced.incrementNo).padStart(digits, "0");
        const datePart = advanced.useDateFragment ? buildDatePart(advanced.sequenceFormat) : "";
        dispatchNo = `${prefix}${datePart}${paddedNo}`;

        advanced.generatedCode = dispatchNo;
        await advanced.save();
      } else {
        const count = await Dispatch.countDocuments();
        const datePart = buildDatePart("dd/mm/yy");
        dispatchNo = `${prefix}${datePart}${String(count + 1).padStart(2, "0")}`;
      }
    }

    const cleanItems = items.map((it, i) => ({
      sNo:      i + 1,
      itemCode: it.itemCode || "",
      itemName: it.itemName || "",
      size:     it.size || "",
      qty:      Number(it.qty) || 0,
      remarks:  it.remarks || "",
      demandId: it.demandId || undefined,
      demandNo: it.demandNo || "",
    }));

    const newDispatch = new Dispatch({
      dispatchNo,
      transactionCategory,
      saudaId,
      saudaNo,
      partyCode:    partyCode    || "",
      partyName:    partyName    || "",
      partyAddress: partyAddress || "",
      dispatchDate,
      status: "Ready",
      items: cleanItems,
    });
    await newDispatch.save();

    /* Mark every source Demand referenced by these items as Dispatched.
       NOTE: Demand items aren't tracked at per-item dispatched-qty
       granularity, so a Demand is marked fully "Dispatched" as soon as
       ANY of its items goes out on a Dispatch — dispatching a smaller
       Qty than the Demand's original item doesn't leave the remainder
       "still pending" anywhere. Say the word if you want true partial-
       dispatch tracking added to the Demand item schema. */
    const demandIds = [...new Set(cleanItems.map((it) => String(it.demandId)).filter(Boolean))];
    if (demandIds.length) {
      await Demand.updateMany(
        { _id: { $in: demandIds } },
        { $set: { status: "Dispatched" } }
      );
    }

    res.status(201).json({ success: true, message: "Dispatch Saved Successfully", data: newDispatch });
  } catch (error) {
    console.error("Dispatch save error:", error);
    res.status(500).json({ success: false, message: "Error Saving Dispatch: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — List / Search Dispatches
══════════════════════════════════════════════ */
router.get("/dispatch", async (req, res) => {
  try {
    const { fromDate, toDate, dispatchNo, saudaNo, partyName, status } = req.query;
    const query = {};

    if (fromDate || toDate) {
      query.dispatchDate = {};
      if (fromDate) query.dispatchDate.$gte = fromDate;
      if (toDate)   query.dispatchDate.$lte = toDate;
    }

    if (dispatchNo) query.dispatchNo = { $regex: dispatchNo, $options: "i" };
    if (saudaNo)    query.saudaNo    = { $regex: saudaNo,    $options: "i" };
    if (partyName)  query.partyName  = { $regex: partyName,  $options: "i" };
    if (status)     query.status     = status;

    const data = await Dispatch.find(query).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Dispatch fetch error:", error);
    res.status(500).json({ success: false, message: "Error Fetching Data: " + error.message });
  }
});

/* ══════════════════════════════════════════════
   GET — Single Dispatch by ID
══════════════════════════════════════════════ */
router.get("/dispatch/:id", async (req, res) => {
  try {
    const data = await Dispatch.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Record not found" });
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   PUT — Update Dispatch by ID
   (also used for status transitions — Loaded / Vehicle Out)
══════════════════════════════════════════════ */
router.put("/dispatch/:id", async (req, res) => {
  try {
    if (req.body.status && !ALLOWED_STATUS.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const updated = await Dispatch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Record Not Found" });

    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    console.error("Dispatch update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ══════════════════════════════════════════════
   DELETE — Remove Dispatch by ID (Ready only)
══════════════════════════════════════════════ */
router.delete("/dispatch/:id", async (req, res) => {
  try {
    const existing = await Dispatch.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Record Not Found" });

    if (existing.status !== "Ready") {
      return res.status(400).json({
        success: false,
        message: `Only "Ready" dispatches can be deleted (this one is "${existing.status}").`,
      });
    }

    await Dispatch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;