const Demand = require("../models/Sales/Demand");
const ProductionRequest = require("../models/Production/ProductionRequest");
const DocumentSequence = require("../models/Master/DocumentSequence");

/* ── 2-digit year date builder — mirrors Sauda / Demand / Document Sequence routes ── */
const buildDatePart = (format) => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yy = String(today.getFullYear()).slice(-2);

  if (format === "mm/dd/yy") return `${mm}${dd}${yy}`;
  if (format === "yy/mm/dd") return `${yy}${mm}${dd}`;
  if (format === "julian") {
    const year = today.getFullYear();
    const start = new Date(year, 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const doy = String(Math.floor((today - start) / oneDay)).padStart(3, "0");
    return `${yy}${doy}`;
  }
  return `${dd}${mm}${yy}`;
};

/* ── Consume the next number from the Document Sequence master ──
   Same atomic $inc pattern as Demandroutes.js's POST /demand, so two
   requests created in the same tick never collide on the same PR No. */
async function nextProductionRequestNo(prefix = "PR") {
  const seqRecord = await DocumentSequence.findOne({
    module: "Production",
    businessEntity: "Production Request",
    entityPrefix: prefix,
  }).sort({ createdAt: -1 });

  if (seqRecord) {
    const digits = Math.max(1, Number(seqRecord.sequenceDigits) || 2);
    const step = Math.max(1, Number(seqRecord.incrementStep) || 1);

    const advanced = await DocumentSequence.findByIdAndUpdate(
      seqRecord._id,
      { $inc: { incrementNo: step } },
      { new: true }
    );

    const paddedNo = String(advanced.incrementNo).padStart(digits, "0");
    const datePart = advanced.useDateFragment ? buildDatePart(advanced.sequenceFormat) : "";
    const code = `${prefix}${datePart}${paddedNo}`;

    advanced.generatedCode = code;
    await advanced.save();
    return code;
  }

  // Fallback so this never blocks if no sequence master exists yet
  const count = await ProductionRequest.countDocuments();
  const datePart = buildDatePart("dd/mm/yy");
  return `${prefix}${datePart}${String(count + 1).padStart(2, "0")}`;
}

/* ── Local (not UTC) YYYY-MM-DD — toISOString() shifts to UTC, which is
   5:30 hours behind IST and can silently push "tomorrow" a day off from
   whatever date the person actually picked in the <input type="date">. ── */
const toLocalYMD = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/* ══════════════════════════════════════════════
   Creates one ProductionRequest per item row on a SINGLE Demand, then
   flips that Demand's status to "Production Requested". Called right
   after a Demand is saved (see Demandroutes.js POST /demand), so
   requests appear immediately instead of waiting for the dispatch
   date to become tomorrow.
   `demand` must be a saved Mongoose Demand document.
   Returns the array of newly-created ProductionRequest docs.
══════════════════════════════════════════════ */
async function createProductionRequestsForDemand(demand) {
  const today = toLocalYMD(new Date());
  const rows = demand.items && demand.items.length ? demand.items : [{}];
  const created = [];

  for (const item of rows) {
    const productionRequestNo = await nextProductionRequestNo();

    const pr = new ProductionRequest({
      productionRequestNo,
      demandId: demand._id,
      demandNo: demand.demandNo,
      saudaNo: demand.saudaNo,
      partyName: demand.partyName,
      transactionType: demand.transactionType,
      priority: demand.priority,
      demandDate: demand.demandDate,
      dispatchDate: demand.dispatchDate,
      date: today,
      itemType: item.itemType || "",
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      size: item.size || "",
      length: item.length || 0,
      qty: item.qty || 0,
      status: "Pending",
      source: "auto",
    });

    await pr.save();
    created.push(pr);
  }

  demand.status = "Production Requested";
  await demand.save();

  return created;
}

/* ══════════════════════════════════════════════
   SAFETY NET — finds any "Pending" Demand whose Dispatch Date is
   tomorrow or already overdue and still wasn't converted (e.g. it was
   created directly in the database, or immediate generation failed
   at save time) and generates its Production Requests too. With
   immediate generation on Save now in place, this should normally
   find nothing — but it's kept as a scheduled/manual fallback.
   Returns the array of newly-created ProductionRequest docs.
══════════════════════════════════════════════ */
async function generateDueProductionRequests() {
  const now = new Date();
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = toLocalYMD(tomorrowDate);

  const dueDemands = await Demand.find({
    status: "Pending",
    dispatchDate: { $lte: tomorrow }, // due tomorrow, or already overdue
  });

  const created = [];
  for (const demand of dueDemands) {
    const forThisDemand = await createProductionRequestsForDemand(demand);
    created.push(...forThisDemand);
  }

  return created;
}

module.exports = { generateDueProductionRequests, createProductionRequestsForDemand };