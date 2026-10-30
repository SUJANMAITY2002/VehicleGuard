const express = require("express");
const router  = express.Router();
const CCMProduction      = require("../../models/Production/CCMProduction");
const RollingProduction  = require("../../models/Production/RollingProduction");
const BundlingProduction = require("../../models/Production/BundlingProduction");

const today = () => new Date().toISOString().split("T")[0];

/* ══════════════════════════════════════════════
   PRODUCTION DASHBOARD  GET /api/production-dashboard
══════════════════════════════════════════════ */
router.get("/production-dashboard", async (req, res) => {
  try {
    const t = today();

    /* Today's CCM */
    const ccmToday = await CCMProduction.find({ ccmDate: t });
    const ccmQty   = ccmToday.reduce((s, r) => s + (r.totalBilletQty || 0), 0);
    const ccmYield = ccmToday.length
      ? (ccmToday.reduce((s, r) => s + (r.yieldPct || 0), 0) / ccmToday.length).toFixed(2)
      : 0;
    const ccmScrap = ccmToday.reduce((s, r) => s + (r.scrapQty || 0), 0);

    /* Today's Rolling */
    const rolToday = await RollingProduction.find({ rollingDate: t });
    const rolQty   = rolToday.reduce((s, r) => s + (r.outputQty || 0), 0);
    const rolYield = rolToday.length
      ? (rolToday.reduce((s, r) => s + (r.yieldPct || 0), 0) / rolToday.length).toFixed(2)
      : 0;

    /* Today's Bundling */
    const bunToday   = await BundlingProduction.find({ bundleDate: t });
    const bunCount   = bunToday.reduce((s, r) => s + (r.totalBundleCount || 0), 0);
    const bunWt      = bunToday.reduce((s, r) => s + (r.totalBundleWt || 0), 0);

    /* Pending (Open) counts */
    const ccmPending = await CCMProduction.countDocuments({ status: "Open" });
    const rolPending = await RollingProduction.countDocuments({ status: "Open" });
    const bunPending = await BundlingProduction.countDocuments({ status: "Open" });

    /* All-time totals for KPIs */
    const allCCM = await CCMProduction.find({}, "yieldPct scrapQty totalBilletQty");
    const avgYield = allCCM.length
      ? (allCCM.reduce((s, r) => s + (r.yieldPct || 0), 0) / allCCM.length).toFixed(2)
      : 0;
    const totalScrap = allCCM.reduce((s, r) => s + (r.scrapQty || 0), 0).toFixed(3);

    res.json({
      success: true,
      data: {
        today: t,
        ccm:   { qty: ccmQty.toFixed(3), yield: ccmYield, scrap: ccmScrap.toFixed(3), pending: ccmPending },
        rolling: { qty: rolQty.toFixed(3), yield: rolYield, pending: rolPending },
        bundling: { count: bunCount, weight: bunWt.toFixed(3), pending: bunPending },
        overall: { avgYield, totalScrap },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════
   PRODUCTION INVENTORY  GET /api/production-inventory
══════════════════════════════════════════════ */
router.get("/production-inventory", async (req, res) => {
  try {
    /* Billet stock = total billets produced by CCM − total billets consumed by Rolling */
    const ccmAll = await CCMProduction.find({});
    const rolAll = await RollingProduction.find({});
    const bunAll = await BundlingProduction.find({});

    const ccmBillets  = ccmAll.reduce((s, r) => s + (r.totalBilletQty || 0), 0);
    const ccmScrap    = ccmAll.reduce((s, r) => s + (r.scrapQty       || 0), 0);
    const rolInput    = rolAll.reduce((s, r) => s + (r.inputQty       || 0), 0);
    const rolOutput   = rolAll.reduce((s, r) => s + (r.outputQty      || 0), 0);
    const rolScrap    = rolAll.reduce((s, r) => s + ((r.millScaleQty || 0) + (r.rejectionQty || 0)), 0);
    const bunLoose    = bunAll.reduce((s, r) => s + (r.totalLooseQty  || 0), 0);
    const bunStock    = bunAll.reduce((s, r) => s + (r.totalBundleWt  || 0), 0);

    /* Build per-product breakdown from rolling outputs */
    const productMap = {};
    for (const r of rolAll) {
      for (const o of (r.outputs || [])) {
        const key = `${o.productCode || o.productName}`;
        if (!productMap[key]) productMap[key] = { productName: o.productName, productCode: o.productCode, size: o.size, rollingQty: 0, bundledQty: 0 };
        productMap[key].rollingQty += o.qty || 0;
      }
    }
    for (const b of bunAll) {
      for (const inp of (b.inputs || [])) {
        const matched = Object.values(productMap).find((p) => p.productName === inp.product);
        if (matched) matched.bundledQty += inp.looseQty || 0;
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          billetStock:      parseFloat((ccmBillets - rolInput).toFixed(3)),
          ccmScrap:         parseFloat(ccmScrap.toFixed(3)),
          finishedGoods:    parseFloat((rolOutput - bunLoose).toFixed(3)),
          rollingScrap:     parseFloat(rolScrap.toFixed(3)),
          bundleStock:      parseFloat(bunStock.toFixed(3)),
        },
        products: Object.values(productMap).map((p) => ({
          ...p,
          looseStock: parseFloat((p.rollingQty - p.bundledQty).toFixed(3)),
          rollingQty: parseFloat(p.rollingQty.toFixed(3)),
          bundledQty: parseFloat(p.bundledQty.toFixed(3)),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ══════════════════════════════════════════════
   PRODUCTION REPORTS  GET /api/production-reports
   ?module=ccm|rolling|bundling&fromDate=&toDate=&groupBy=heat|shift|product|mill
══════════════════════════════════════════════ */
router.get("/production-reports", async (req, res) => {
  try {
    const { module: mod, fromDate, toDate, groupBy } = req.query;
    const dateFilter = {};
    if (fromDate || toDate) {
      if (fromDate) dateFilter.$gte = fromDate;
      if (toDate)   dateFilter.$lte = toDate;
    }

    if (mod === "ccm" || !mod) {
      const f = Object.keys(dateFilter).length ? { ccmDate: dateFilter } : {};
      const recs = await CCMProduction.find(f).sort({ ccmDate: 1 });

      const heatWise  = {};
      const shiftWise = {};
      for (const r of recs) {
        /* heat */
        if (!heatWise[r.heatNo]) heatWise[r.heatNo] = { heatNo: r.heatNo, inputQty: 0, billetQty: 0, scrapQty: 0, yieldTotal: 0, count: 0 };
        heatWise[r.heatNo].inputQty   += r.inputQty       || 0;
        heatWise[r.heatNo].billetQty  += r.totalBilletQty || 0;
        heatWise[r.heatNo].scrapQty   += r.scrapQty       || 0;
        heatWise[r.heatNo].yieldTotal += r.yieldPct       || 0;
        heatWise[r.heatNo].count++;
        /* shift */
        if (!shiftWise[r.shift]) shiftWise[r.shift] = { shift: r.shift, inputQty: 0, billetQty: 0, scrapQty: 0, count: 0 };
        shiftWise[r.shift].inputQty  += r.inputQty       || 0;
        shiftWise[r.shift].billetQty += r.totalBilletQty || 0;
        shiftWise[r.shift].scrapQty  += r.scrapQty       || 0;
        shiftWise[r.shift].count++;
      }

      return res.json({
        success: true,
        module: "ccm",
        heatWise:  Object.values(heatWise).map((h) => ({ ...h, avgYield: (h.yieldTotal / h.count).toFixed(2) })),
        shiftWise: Object.values(shiftWise),
        totals: {
          totalInput:  recs.reduce((s, r) => s + (r.inputQty       || 0), 0).toFixed(3),
          totalBillet: recs.reduce((s, r) => s + (r.totalBilletQty || 0), 0).toFixed(3),
          totalScrap:  recs.reduce((s, r) => s + (r.scrapQty       || 0), 0).toFixed(3),
          avgYield:    recs.length ? (recs.reduce((s, r) => s + (r.yieldPct || 0), 0) / recs.length).toFixed(2) : "0.00",
        },
      });
    }

    if (mod === "rolling") {
      const f = Object.keys(dateFilter).length ? { rollingDate: dateFilter } : {};
      const recs = await RollingProduction.find(f).sort({ rollingDate: 1 });

      const productWise = {};
      const millWise    = {};
      for (const r of recs) {
        for (const o of (r.outputs || [])) {
          const key = o.productName || "Unknown";
          if (!productWise[key]) productWise[key] = { productName: key, size: o.size, qty: 0 };
          productWise[key].qty += o.qty || 0;
        }
        const mill = r.millNo || "Default";
        if (!millWise[mill]) millWise[mill] = { millNo: mill, inputQty: 0, outputQty: 0, count: 0 };
        millWise[mill].inputQty  += r.inputQty  || 0;
        millWise[mill].outputQty += r.outputQty || 0;
        millWise[mill].count++;
      }

      return res.json({
        success: true,
        module: "rolling",
        productWise: Object.values(productWise).map((p) => ({ ...p, qty: p.qty.toFixed(3) })),
        millWise:    Object.values(millWise),
        totals: {
          totalInput:  recs.reduce((s, r) => s + (r.inputQty  || 0), 0).toFixed(3),
          totalOutput: recs.reduce((s, r) => s + (r.outputQty || 0), 0).toFixed(3),
          avgYield:    recs.length ? (recs.reduce((s, r) => s + (r.yieldPct || 0), 0) / recs.length).toFixed(2) : "0.00",
        },
      });
    }

    if (mod === "bundling") {
      const f = Object.keys(dateFilter).length ? { bundleDate: dateFilter } : {};
      const recs = await BundlingProduction.find(f).sort({ bundleDate: 1 });

      return res.json({
        success: true,
        module: "bundling",
        records: recs.map((r) => ({
          bundleEntryNo: r.bundleEntryNo,
          bundleDate: r.bundleDate,
          totalBundleCount: r.totalBundleCount,
          totalBundleWt: r.totalBundleWt,
          totalPieces: r.totalPieces,
          status: r.status,
        })),
        totals: {
          totalBundles: recs.reduce((s, r) => s + (r.totalBundleCount || 0), 0),
          totalWeight:  recs.reduce((s, r) => s + (r.totalBundleWt   || 0), 0).toFixed(3),
          totalPieces:  recs.reduce((s, r) => s + (r.totalPieces     || 0), 0),
        },
      });
    }

    res.status(400).json({ success: false, message: "Invalid module. Use ccm, rolling, or bundling" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;