const express = require("express");
const router  = express.Router();
const PurchaseRequisition = require("../../models/Procurement/PurchaseRequisition");
const PurchaseOrder       = require("../../models/Procurement/PurchaseOrder");
const DocumentSequence    = require("../../models/Master/DocumentSequence");

/* ── sanitize helper ── */
const toNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

const sanitizePR = (body) => {
  const items = (body.items || []).map((it, idx) => ({
    sNo:          it.sNo ?? idx + 1,
    itemCode:     it.itemCode     || "",
    itemName:     it.itemName     || "",
    itemCategory: it.itemCategory || "",
    uom:          it.uom          || "",
    requiredQty:  toNum(it.requiredQty),
    remarks:      it.remarks      || "",
  }));

  return {
    prNo:         body.prNo         || "",
    prDate:       body.prDate       || "",
    department:   body.department   || "",
    site:         body.site         || "",
    requestedBy:  body.requestedBy  || "",
    priority:     body.priority     || "Normal",
    requiredDate: body.requiredDate || "",
    status:       body.status       || "Pending",
    remarks:      body.remarks      || "",
    items,
  };
};

/* ════════════════════════════════════════
   GET — next PR sequence number
   /api/purchase-requisition/next-sequence
════════════════════════════════════════ */
router.get("/purchase-requisition/next-sequence", async (req, res) => {
  try {
    const { module, businessEntity, entityPrefix } = req.query;
    const prefix = (entityPrefix || "").toString().trim().toUpperCase();

    if (!module || !businessEntity || !prefix) {
      return res.status(400).json({
        success: false,
        message: "module, businessEntity and entityPrefix are required",
      });
    }

    const records = await DocumentSequence.find({ module, businessEntity, entityPrefix: prefix });

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No document sequence found for module="${module}", entity="${businessEntity}", prefix="${prefix}". Please create one first.`,
      });
    }

    const lastRecord = records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    const digits     = Math.max(1, Number(lastRecord.sequenceDigits) || 2);
    const nextNo     = Math.max(...records.map((r) => Number(r.incrementNo))) + 1;
    const paddedNo   = String(nextNo).padStart(digits, "0");

    const buildDate = (fmt) => {
      const d  = new Date();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      if (fmt === "mm/dd/yy") return `${mm}${dd}${yy}`;
      if (fmt === "yy/mm/dd") return `${yy}${mm}${dd}`;
      return `${dd}${mm}${yy}`;
    };

    const datePart = lastRecord.useDateFragment ? buildDate(lastRecord.sequenceFormat) : "";
    const nextCode = `${prefix}${datePart}${paddedNo}`;

    res.json({ success: true, nextCode, nextIncrement: nextNo, sequenceId: lastRecord._id });
  } catch (error) {
    console.error("PR next-sequence error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   CREATE  POST /api/create-purchase-requisition
════════════════════════════════════════ */
router.post("/create-purchase-requisition", async (req, res) => {
  try {
    const data = sanitizePR(req.body);

    /* add initial approval history entry */
    data.approvalHistory = [{
      action:      "Requested",
      performedBy: data.requestedBy || "System",
      performedAt: new Date(),
      remarks:     "Purchase Requisition Created",
    }];

    const pr = new PurchaseRequisition(data);
    await pr.save();
    res.status(201).json({ success: true, message: "Purchase Requisition Saved Successfully", data: pr });
  } catch (error) {
    console.error("Create PR error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   GET ALL  GET /api/purchase-requisitions
════════════════════════════════════════ */
router.get("/purchase-requisitions", async (req, res) => {
  try {
    const data = await PurchaseRequisition.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Get all PRs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   GET APPROVED (for Convert to PO screen)
   GET /api/purchase-requisitions/approved
════════════════════════════════════════ */
router.get("/purchase-requisitions/approved", async (req, res) => {
  try {
    const data = await PurchaseRequisition.find({ status: "Approved", convertedToPO: false }).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error("Get approved PRs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   DASHBOARD COUNTS  GET /api/purchase-requisitions/dashboard
════════════════════════════════════════ */
router.get("/purchase-requisitions/dashboard", async (req, res) => {
  try {
    const [pending, approved, converted, closed, urgent] = await Promise.all([
      PurchaseRequisition.countDocuments({ status: "Pending" }),
      PurchaseRequisition.countDocuments({ status: "Approved" }),
      PurchaseRequisition.countDocuments({ status: "Converted to PO" }),
      PurchaseRequisition.countDocuments({ status: "Closed" }),
      PurchaseRequisition.countDocuments({ priority: "High", status: { $nin: ["Closed", "Cancelled"] } }),
    ]);
    res.status(200).json({ success: true, data: { pending, approved, converted, closed, urgent } });
  } catch (error) {
    console.error("PR dashboard error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   GET BY ID  GET /api/purchase-requisition/:id
════════════════════════════════════════ */
router.get("/purchase-requisition/:id", async (req, res) => {
  try {
    const pr = await PurchaseRequisition.findById(req.params.id);
    if (!pr) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json(pr);
  } catch (error) {
    console.error("Get PR by ID error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   UPDATE  PUT /api/purchase-requisition/:id
════════════════════════════════════════ */
router.put("/purchase-requisition/:id", async (req, res) => {
  try {
    const existing = await PurchaseRequisition.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Not found" });

    const update = sanitizePR(req.body);

    /* track status changes in approval history */
    if (update.status && update.status !== existing.status) {
      const historyEntry = {
        action:      update.status,
        performedBy: req.body.approvedBy || req.body.requestedBy || "System",
        performedAt: new Date(),
        remarks:     req.body.approvalRemarks || "",
      };
      update.approvalHistory = [...(existing.approvalHistory || []), historyEntry];
    } else {
      update.approvalHistory = existing.approvalHistory;
    }

    const updated = await PurchaseRequisition.findByIdAndUpdate(
      req.params.id,
      update,
      { returnDocument: "after", runValidators: true }
    );
    res.json({ success: true, message: "Updated Successfully", data: updated });
  } catch (error) {
    console.error("Update PR error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   CONVERT TO PO  POST /api/purchase-requisition/:id/convert-to-po
════════════════════════════════════════ */
router.post("/purchase-requisition/:id/convert-to-po", async (req, res) => {
  try {
    const pr = await PurchaseRequisition.findById(req.params.id);
    if (!pr) return res.status(404).json({ success: false, message: "PR not found" });
    if (pr.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved PRs can be converted to PO" });
    }
    if (pr.convertedToPO) {
      return res.status(400).json({ success: false, message: "This PR has already been converted to a PO" });
    }

    /* build PO items from PR items */
    const poItems = pr.items.map((it, idx) => ({
      sNo:           idx + 1,
      itemCode:      it.itemCode     || "",
      itemCategory:  it.itemCategory || "",
      itemName:      it.itemName     || "",
      uom:           it.uom          || "",
      serviceCharge: 0,
      charges:       0,
      discount:      0,
      qty:           it.requiredQty  || 0,
      rate:          0,
      basicAmount:   0,
      netAmount:     0,
    }));

    const poData = {
      poNo:        req.body.poNo        || "",
      poDate:      req.body.poDate      || new Date().toISOString().slice(0, 10),
      poType:      req.body.poType      || "",
      site:        pr.site              || "",
      partyCode:   req.body.partyCode   || "",
      partyName:   req.body.partyName   || "",
      mobileNo:    req.body.mobileNo    || "",
      paymentMode: req.body.paymentMode || "",
      eta:         req.body.eta         || pr.requiredDate || "",
      dueDate:     req.body.dueDate     || "",
      status:      "Ordered",
      remarks:     `Generated from PR: ${pr.prNo}. ${pr.remarks || ""}`.trim(),
      basicAmount: 0,
      netAmount:   0,
      items:       poItems,
    };

    const po = new PurchaseOrder(poData);
    await po.save();

    /* update PR status */
    pr.status          = "Converted to PO";
    pr.convertedToPO   = true;
    pr.convertedPONo   = po.poNo;
    pr.convertedPOId   = po._id.toString();
    pr.convertedAt     = new Date();
    pr.convertedBy     = req.body.convertedBy || "System";
    pr.approvalHistory = [
      ...(pr.approvalHistory || []),
      {
        action:      "Converted to PO",
        performedBy: req.body.convertedBy || "System",
        performedAt: new Date(),
        remarks:     `PO created: ${po.poNo}`,
      },
    ];
    await pr.save();

    res.status(201).json({
      success: true,
      message: `PO created successfully from PR ${pr.prNo}`,
      data: { pr, po },
    });
  } catch (error) {
    console.error("Convert PR to PO error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ════════════════════════════════════════
   DELETE  DELETE /api/purchase-requisition/:id
════════════════════════════════════════ */
router.delete("/purchase-requisition/:id", async (req, res) => {
  try {
    await PurchaseRequisition.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted Successfully" });
  } catch (error) {
    console.error("Delete PR error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;